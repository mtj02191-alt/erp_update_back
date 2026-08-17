import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateReceiptTemplateDto } from "./dto/create-receipt_template.dto";
import { UpdateReceiptTemplateDto } from "./dto/update-receipt_template.dto";
import { ReceiptTemplate } from "./entities/receipt_template.entity";
import { DataScopeService } from "../../permissions/data-scope/data-scope.service";
import { ResolvedDataScope } from "../../permissions/data-scope/data-scope.types";

@Injectable()
export class ReceiptTemplatesService {
  constructor(
    @InjectRepository(ReceiptTemplate)
    private readonly repository: Repository<ReceiptTemplate>,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async resolveReceiptTemplateScope(currentUser?: {
    id?: number;
    role?: string;
    department?: string;
  }): Promise<ResolvedDataScope> {
    return this.dataScopeService.resolveScope(
      currentUser?.id,
      currentUser?.role,
      currentUser?.department,
      "fund_raising",
      "receipt_templates",
    );
  }

  assertReceiptTemplateAccess(
    scope: ResolvedDataScope,
    record: ReceiptTemplate,
  ): void {
    this.dataScopeService.assertRecordAccess(scope, record);
  }

  async create(
    createDto: CreateReceiptTemplateDto,
    currentUser?: { id?: number },
  ): Promise<ReceiptTemplate> {
    const auditUserId =
      currentUser?.id != null && Number(currentUser.id) !== -1
        ? Number(currentUser.id)
        : null;
    const template = this.repository.create({
      ...createDto,
      ...(auditUserId != null
        ? { created_by: { id: auditUserId } as any }
        : {}),
    });
    return await this.repository.save(template);
  }

  async findAll(
    params: { page?: number; pageSize?: number; search?: string },
    currentUser?: { id?: number; role?: string; department?: string },
  ) {
    const { page = 1, pageSize = 10, search } = params;
    const query = this.repository.createQueryBuilder("template");

    if (search) {
      query.andWhere("template.name ILIKE :search", {
        search: `%${search}%`,
      });
    }

    query.andWhere("template.is_archived = false");

    if (currentUser?.id) {
      const scope = await this.resolveReceiptTemplateScope(currentUser);
      this.dataScopeService.applyToQuery(query, "template", scope);
    }

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

  async findOne(id: number): Promise<ReceiptTemplate> {
    const template = await this.repository.findOne({
      where: { id, is_archived: false },
      relations: ["created_by", "updated_by"],
    });
    if (!template) {
      throw new NotFoundException(`Receipt template with ID ${id} not found`);
    }
    return template;
  }

  async update(
    id: number,
    updateDto: UpdateReceiptTemplateDto,
    currentUser?: { id?: number },
  ): Promise<ReceiptTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, updateDto);
    const auditUserId =
      currentUser?.id != null && Number(currentUser.id) !== -1
        ? Number(currentUser.id)
        : null;
    if (auditUserId != null) {
      template.updated_by = { id: auditUserId } as any;
    }
    return await this.repository.save(template);
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    template.is_archived = true;
    await this.repository.save(template);
  }
}
