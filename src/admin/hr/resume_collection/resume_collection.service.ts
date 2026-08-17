import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { ResumeCollection } from "./entities/resume_collection.entity";

import { CreateResumeCollectionDto } from "./dto/create-resume_collection.dto";

import { UpdateResumeCollectionDto } from "./dto/update-resume_collection.dto";

import { ResumeS3Service } from "./resume-s3.service";

import {
  ResumeAiExtractionService,
  ExtractedResumeFields,
} from "./resume-ai-extraction.service";

import { Department } from "../../../users/user.entity";



interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  applicant_name?: string;
  phone?: string;
  email?: string;
  cnic?: string;
  address?: string;
  city?: string;
  role?: string;
  experience?: string;
  education?: string;
  department?: Department;
  notes?: string;
}



@Injectable()

export class ResumeCollectionService {

  constructor(

    @InjectRepository(ResumeCollection)

    private readonly repository: Repository<ResumeCollection>,

    private readonly resumeS3: ResumeS3Service,

    private readonly resumeAi: ResumeAiExtractionService,

  ) {}



  private auditUserId(userId: number | null | undefined): number | null {

    if (userId == null || Number(userId) === -1) return null;

    return Number(userId);

  }



  private emptyToNull(value?: string | null): string | null {

    if (value == null) return null;

    const trimmed = String(value).trim();

    return trimmed === "" ? null : trimmed;

  }



  async create(

    dto: CreateResumeCollectionDto,

    file: Express.Multer.File | undefined,

    currentUser?: { id?: number },

  ): Promise<ResumeCollection> {

    let resume_url: string | null = null;

    let resume_file_key: string | null = null;

    let original_filename: string | null = null;



    if (file?.buffer?.length) {

      const uploaded = await this.resumeS3.uploadResume(file);

      resume_url = uploaded.url;

      resume_file_key = uploaded.key;

      original_filename = file.originalname || null;

    } else if (dto.resume_url?.trim() && dto.resume_file_key?.trim()) {

      resume_url = dto.resume_url.trim();

      resume_file_key = dto.resume_file_key.trim();

      original_filename = this.emptyToNull(dto.original_filename);

    } else {

      throw new BadRequestException("Resume file is required");

    }



    const auditUserId = this.auditUserId(currentUser?.id);

    const record = this.repository.create({
      applicant_name: this.emptyToNull(dto.applicant_name),
      phone: this.emptyToNull(dto.phone),
      email: this.emptyToNull(dto.email),
      cnic: this.emptyToNull(dto.cnic),
      address: this.emptyToNull(dto.address),
      city: this.emptyToNull(dto.city),
      role: this.emptyToNull(dto.role),
      experience: this.emptyToNull(dto.experience),
      education: this.emptyToNull(dto.education),
      department: dto.department || null,
      notes: this.emptyToNull(dto.notes),
      resume_url,
      resume_file_key,
      original_filename,

      ...(auditUserId != null

        ? { created_by: { id: auditUserId } as any }

        : {}),

    });



    return this.repository.save(record);

  }



  async analyzeFile(file: Express.Multer.File): Promise<{
    extracted: ExtractedResumeFields;
    upload: {
      resume_url: string;
      resume_file_key: string;
      original_filename: string | null;
    };
    extraction_error: string | null;
  }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Resume file is required");
    }

    const [uploadResult, extractResult] = await Promise.allSettled([
      this.resumeS3.uploadResume(file),
      this.resumeAi.extractFields(file),
    ]);

    if (uploadResult.status === "rejected") {
      throw uploadResult.reason;
    }

    const upload = uploadResult.value;
    let extracted: ExtractedResumeFields = {
      applicant_name: null,
      phone: null,
      email: null,
      cnic: null,
      address: null,
      city: null,
      role: null,
      experience: null,
      education: null,
      department: null,
    };
    let extraction_error: string | null = null;

    if (extractResult.status === "fulfilled") {
      extracted = extractResult.value;
    } else {
      const reason = extractResult.reason;
      extraction_error =
        reason?.message ||
        reason?.response?.message ||
        "AI could not extract fields from this file";
    }

    return {
      extracted,
      upload: {
        resume_url: upload.url,
        resume_file_key: upload.key,
        original_filename: file.originalname || null,
      },
      extraction_error,
    };
  }



  async findAll(options: ListOptions) {

    const {
      page = 1,
      pageSize = 10,
      search = "",
      applicant_name,
      phone,
      email,
      cnic,
      address,
      city,
      role,
      experience,
      education,
      department,
      notes,
    } = options;

    const skip = (page - 1) * pageSize;



    const query = this.repository

      .createQueryBuilder("resume")

      .leftJoinAndSelect("resume.created_by", "created_by")

      .where("resume.is_archived = :archived", { archived: false });



    if (search?.trim()) {

      const term = `%${search.trim()}%`;

      query.andWhere(
        `(resume.applicant_name ILIKE :term OR resume.phone ILIKE :term OR resume.email ILIKE :term OR resume.cnic ILIKE :term OR resume.address ILIKE :term OR resume.city ILIKE :term OR resume.role ILIKE :term OR resume.experience ILIKE :term OR resume.education ILIKE :term OR resume.original_filename ILIKE :term OR resume.notes ILIKE :term)`,
        { term },
      );

    }



    if (applicant_name?.trim()) {

      query.andWhere("resume.applicant_name ILIKE :applicantName", {

        applicantName: `%${applicant_name.trim()}%`,

      });

    }



    if (phone?.trim()) {
      query.andWhere("resume.phone ILIKE :phone", {
        phone: `%${phone.trim()}%`,
      });
    }

    if (email?.trim()) {
      query.andWhere("resume.email ILIKE :email", {
        email: `%${email.trim()}%`,
      });
    }

    if (cnic?.trim()) {
      query.andWhere("resume.cnic ILIKE :cnic", {
        cnic: `%${cnic.trim()}%`,
      });
    }

    if (address?.trim()) {
      query.andWhere("resume.address ILIKE :address", {
        address: `%${address.trim()}%`,
      });
    }

    if (city?.trim()) {
      query.andWhere("resume.city ILIKE :city", { city: `%${city.trim()}%` });
    }

    if (role?.trim()) {
      query.andWhere("resume.role ILIKE :role", {
        role: `%${role.trim()}%`,
      });
    }

    if (experience?.trim()) {
      query.andWhere("resume.experience ILIKE :experience", {
        experience: `%${experience.trim()}%`,
      });
    }

    if (education?.trim()) {
      query.andWhere("resume.education ILIKE :education", {
        education: `%${education.trim()}%`,
      });
    }

    if (notes?.trim()) {

      query.andWhere("resume.notes ILIKE :notes", {

        notes: `%${notes.trim()}%`,

      });

    }



    if (department) {

      query.andWhere("resume.department = :department", { department });

    }



    const [data, total] = await query

      .orderBy("resume.created_at", "DESC")

      .skip(skip)

      .take(pageSize)

      .getManyAndCount();



    return {

      data,

      pagination: {

        total,

        page,

        pageSize,

        totalPages: Math.ceil(total / pageSize) || 1,

      },

    };

  }



  async findOne(id: number): Promise<ResumeCollection> {

    const record = await this.repository.findOne({

      where: { id, is_archived: false },

      relations: ["created_by", "updated_by"],

    });

    if (!record) {

      throw new NotFoundException(`Resume collection entry #${id} not found`);

    }

    return record;

  }

  private guessContentType(filename: string | null | undefined): string {
    const ext = filename?.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    return (ext && map[ext]) || "application/octet-stream";
  }

  async getResumeFileBuffer(id: number) {
    const record = await this.findOne(id);
    if (!record.resume_url?.trim()) {
      throw new BadRequestException("This entry has no file");
    }
    const key = this.resumeS3.resolveKeyFromUrl(record.resume_url);
    if (!key) {
      throw new BadRequestException("Could not resolve file location");
    }
    const { buffer, contentType } = await this.resumeS3.getObjectBuffer(key);
    return {
      buffer,
      contentType:
        contentType || this.guessContentType(record.original_filename),
      filename: record.original_filename || "resume",
    };
  }

  async update(

    id: number,

    dto: UpdateResumeCollectionDto,

    file: Express.Multer.File | undefined,

    currentUser?: { id?: number },

  ): Promise<ResumeCollection> {

    const record = await this.findOne(id);



    if (dto.applicant_name !== undefined) {

      record.applicant_name = this.emptyToNull(dto.applicant_name);

    }

    if (dto.phone !== undefined) {
      record.phone = this.emptyToNull(dto.phone);
    }
    if (dto.email !== undefined) {
      record.email = this.emptyToNull(dto.email);
    }
    if (dto.cnic !== undefined) {
      record.cnic = this.emptyToNull(dto.cnic);
    }
    if (dto.address !== undefined) {
      record.address = this.emptyToNull(dto.address);
    }
    if (dto.city !== undefined) {
      record.city = this.emptyToNull(dto.city);
    }
    if (dto.role !== undefined) {
      record.role = this.emptyToNull(dto.role);
    }
    if (dto.experience !== undefined) {
      record.experience = this.emptyToNull(dto.experience);
    }
    if (dto.education !== undefined) {
      record.education = this.emptyToNull(dto.education);
    }
    if (dto.department !== undefined) {
      record.department = dto.department || null;
    }
    if (dto.notes !== undefined) {
      record.notes = this.emptyToNull(dto.notes);
    }



    if (file?.buffer?.length) {

      const uploaded = await this.resumeS3.uploadResume(file);

      record.resume_url = uploaded.url;

      record.resume_file_key = uploaded.key;

      record.original_filename = file.originalname || null;

    }



    const auditUserId = this.auditUserId(currentUser?.id);

    if (auditUserId != null) {

      record.updated_by = { id: auditUserId } as any;

    }



    return this.repository.save(record);

  }



  async remove(id: number): Promise<void> {

    const record = await this.findOne(id);

    record.is_archived = true;

    await this.repository.save(record);

  }

}

