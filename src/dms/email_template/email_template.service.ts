import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateEmailTemplateDto } from "./dto/create-email_template.dto";
import { UpdateEmailTemplateDto } from "./dto/update-email_template.dto";
import { EmailTemplate } from "./entities/email_template.entity";

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repository: Repository<EmailTemplate>,
  ) {}

  async create(createDto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const template = this.repository.create(createDto);
    return await this.repository.save(template);
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
  }) {
    const { page = 1, pageSize = 10, search, category } = params;
    const query = this.repository.createQueryBuilder("template");

    if (search) {
      query.andWhere(
        "(template.name ILIKE :search OR template.subject ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (category) {
      query.andWhere("template.category = :category", { category });
    }

    query.andWhere("template.is_archived = false");

    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy("template.created_at", "DESC")
      .getManyAndCount();

    return {
      data: items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number): Promise<EmailTemplate> {
    const template = await this.repository.findOne({
      where: { id, is_archived: false },
    });
    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }
    return template;
  }

  async update(
    id: number,
    updateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, updateDto);
    return await this.repository.save(template);
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    template.is_archived = true;
    await this.repository.save(template);
  }
}
