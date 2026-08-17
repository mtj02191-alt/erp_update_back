import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Organization } from "./entities/organization.entity";
import { OrganizationBranch } from "./entities/organization-branch.entity";
import {
  DonorOrganizationAffiliation,
  OrganizationAffiliationRole,
} from "./entities/donor-organization-affiliation.entity";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { CreateAffiliationDto } from "./dto/create-affiliation.dto";
import { CreateOrganizationBranchDto } from "./dto/create-organization-branch.dto";
import { UpdateOrganizationBranchDto } from "./dto/update-organization-branch.dto";
import { Donor } from "../donor/entities/donor.entity";

export type OrganizationBranchTreeNode = OrganizationBranch & {
  sub_branches: OrganizationBranch[];
};

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationBranch)
    private readonly branchRepo: Repository<OrganizationBranch>,
    @InjectRepository(DonorOrganizationAffiliation)
    private readonly affiliationRepo: Repository<DonorOrganizationAffiliation>,
    @InjectRepository(Donor)
    private readonly donorRepo: Repository<Donor>,
  ) {}

  async create(dto: CreateOrganizationDto, user?: any): Promise<Organization> {
    const auditId = user?.id && user.id !== -1 ? user.id : null;
    const org = this.orgRepo.create({
      name: dto.name.trim(),
      registration_number: dto.registration_number?.trim() || null,
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      country: dto.country?.trim() || null,
      notes: dto.notes?.trim() || null,
      parent_organization_id: dto.parent_organization_id ?? null,
      is_active: dto.is_active !== false,
      ...(auditId != null ? { created_by: { id: auditId } as any } : {}),
    });
    return this.orgRepo.save(org);
  }

  async findAll(params: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const qb = this.orgRepo
      .createQueryBuilder("org")
      .where("org.is_archived = false")
      .orderBy("org.name", "ASC");

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere(
        "(LOWER(org.name) LIKE LOWER(:term) OR LOWER(COALESCE(org.registration_number, '')) LIKE LOWER(:term) OR LOWER(COALESCE(org.city, '')) LIKE LOWER(:term))",
        { term },
      );
    }

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  private buildBranchTree(
    branches: OrganizationBranch[],
  ): OrganizationBranchTreeNode[] {
    const active = (branches || []).filter((b) => !b.is_archived);
    const byParent = new Map<number | null, OrganizationBranch[]>();
    for (const b of active) {
      const key = b.parent_branch_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(b);
    }
    const roots = byParent.get(null) || [];
    return roots.map((root) => ({
      ...root,
      sub_branches: byParent.get(root.id) || [],
    }));
  }

  async findOne(id: number): Promise<
    Organization & { branch_tree: OrganizationBranchTreeNode[] }
  > {
    const org = await this.orgRepo.findOne({
      where: { id, is_archived: false },
      relations: ["branches", "parent_organization"],
    });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);

    const branch_tree = this.buildBranchTree(org.branches || []);
    return Object.assign(org, { branch_tree });
  }

  async update(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findOne(id);
    Object.assign(org, {
      ...(dto.name != null ? { name: dto.name.trim() } : {}),
      ...(dto.registration_number !== undefined
        ? { registration_number: dto.registration_number?.trim() || null }
        : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.address !== undefined
        ? { address: dto.address?.trim() || null }
        : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
      ...(dto.country !== undefined
        ? { country: dto.country?.trim() || null }
        : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      ...(dto.parent_organization_id !== undefined
        ? { parent_organization_id: dto.parent_organization_id }
        : {}),
      ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
    });
    const { branch_tree: _t, ...toSave } = org as any;
    return this.orgRepo.save(toSave);
  }

  async softDelete(id: number): Promise<void> {
    const org = await this.orgRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    org.is_archived = true;
    org.is_active = false;
    await this.orgRepo.save(org);
  }

  async createBranch(
    organizationId: number,
    dto: CreateOrganizationBranchDto,
  ): Promise<OrganizationBranch> {
    await this.findOne(organizationId);
    if (!dto?.name?.trim()) {
      throw new BadRequestException("Branch name is required");
    }

    let parentBranchId: number | null = null;
    if (dto.parent_branch_id) {
      const parent = await this.branchRepo.findOne({
        where: {
          id: dto.parent_branch_id,
          organization_id: organizationId,
          is_archived: false,
        },
      });
      if (!parent) {
        throw new BadRequestException(
          "Parent branch not found on this organization",
        );
      }
      if (parent.parent_branch_id != null) {
        throw new BadRequestException(
          "Sub-branches can only be created under a top-level branch (Organization → Branch → Sub-branch)",
        );
      }
      parentBranchId = parent.id;
    }

    const branch = this.branchRepo.create({
      organization_id: organizationId,
      parent_branch_id: parentBranchId,
      name: dto.name.trim(),
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      country: dto.country?.trim() || null,
      is_active: dto.is_active !== false,
    });
    return this.branchRepo.save(branch);
  }

  async updateBranch(
    organizationId: number,
    branchId: number,
    dto: UpdateOrganizationBranchDto,
  ): Promise<OrganizationBranch> {
    const branch = await this.branchRepo.findOne({
      where: {
        id: branchId,
        organization_id: organizationId,
        is_archived: false,
      },
    });
    if (!branch) throw new NotFoundException("Branch not found");

    if (dto.parent_branch_id !== undefined) {
      if (dto.parent_branch_id === null || dto.parent_branch_id === ("" as any)) {
        branch.parent_branch_id = null;
      } else {
        const parentId = Number(dto.parent_branch_id);
        if (parentId === branch.id) {
          throw new BadRequestException("Branch cannot be its own parent");
        }
        const parent = await this.branchRepo.findOne({
          where: {
            id: parentId,
            organization_id: organizationId,
            is_archived: false,
          },
        });
        if (!parent) {
          throw new BadRequestException("Parent branch not found");
        }
        if (parent.parent_branch_id != null) {
          throw new BadRequestException(
            "Cannot nest under a sub-branch (max depth: Organization → Branch → Sub-branch)",
          );
        }
        if (branch.parent_branch_id == null) {
          const hasChildren = await this.branchRepo.count({
            where: {
              parent_branch_id: branch.id,
              is_archived: false,
            },
          });
          if (hasChildren > 0) {
            throw new BadRequestException(
              "Cannot demote a branch that already has sub-branches",
            );
          }
        }
        branch.parent_branch_id = parentId;
      }
    }

    if (dto.name != null) branch.name = dto.name.trim();
    if (dto.phone !== undefined) branch.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) branch.email = dto.email?.trim() || null;
    if (dto.address !== undefined) branch.address = dto.address?.trim() || null;
    if (dto.city !== undefined) branch.city = dto.city?.trim() || null;
    if (dto.country !== undefined) branch.country = dto.country?.trim() || null;
    if (dto.is_active !== undefined) branch.is_active = dto.is_active;

    return this.branchRepo.save(branch);
  }

  async softDeleteBranch(
    organizationId: number,
    branchId: number,
  ): Promise<void> {
    const branch = await this.branchRepo.findOne({
      where: {
        id: branchId,
        organization_id: organizationId,
        is_archived: false,
      },
    });
    if (!branch) throw new NotFoundException("Branch not found");

    const children = await this.branchRepo.find({
      where: { parent_branch_id: branchId, is_archived: false },
    });
    for (const child of children) {
      child.is_archived = true;
      child.is_active = false;
      await this.branchRepo.save(child);
    }
    branch.is_archived = true;
    branch.is_active = false;
    await this.branchRepo.save(branch);
  }

  async createAffiliation(
    dto: CreateAffiliationDto,
  ): Promise<DonorOrganizationAffiliation> {
    const donor = await this.donorRepo.findOne({ where: { id: dto.donor_id } });
    if (!donor) throw new NotFoundException("Donor not found");

    const org = await this.findOne(dto.organization_id);

    if (dto.branch_id) {
      const branch = await this.branchRepo.findOne({
        where: { id: dto.branch_id, organization_id: org.id, is_archived: false },
      });
      if (!branch) {
        throw new BadRequestException(
          "Branch does not belong to this organization",
        );
      }
    }

    if (dto.is_primary) {
      await this.affiliationRepo.update(
        { donor_id: dto.donor_id, is_primary: true },
        { is_primary: false },
      );
    }

    const existing = await this.affiliationRepo.findOne({
      where: {
        donor_id: dto.donor_id,
        organization_id: dto.organization_id,
        branch_id: dto.branch_id != null ? dto.branch_id : IsNull(),
        is_archived: false,
      },
    });
    if (existing) {
      existing.role = dto.role || existing.role;
      existing.is_primary =
        dto.is_primary !== undefined ? !!dto.is_primary : existing.is_primary;
      if (dto.notes !== undefined) existing.notes = dto.notes?.trim() || null;
      if (dto.branch_id !== undefined) existing.branch_id = dto.branch_id ?? null;
      return this.affiliationRepo.save(existing);
    }

    const affiliation = this.affiliationRepo.create({
      donor_id: dto.donor_id,
      organization_id: dto.organization_id,
      branch_id: dto.branch_id ?? null,
      role: dto.role || OrganizationAffiliationRole.CONTACT,
      is_primary: !!dto.is_primary,
      notes: dto.notes?.trim() || null,
    });
    return this.affiliationRepo.save(affiliation);
  }

  async listAffiliationsForDonor(donorId: number) {
    return this.affiliationRepo.find({
      where: { donor_id: donorId, is_archived: false },
      relations: ["organization", "branch"],
      order: { is_primary: "DESC", id: "DESC" },
    });
  }

  /**
   * People (donors/leads) linked to this organization via affiliations.
   */
  async listPeopleForOrganization(organizationId: number) {
    await this.findOne(organizationId);
    const rows = await this.affiliationRepo.find({
      where: { organization_id: organizationId, is_archived: false },
      relations: ["donor", "donor.assigned_to", "branch"],
      order: { is_primary: "DESC", id: "DESC" },
    });

    return rows
      .filter((row) => row.donor && !row.donor.is_archived)
      .map((row) => {
        const donor = row.donor as any;
        if (donor?.password) delete donor.password;
        if (donor?.password_enc) delete donor.password_enc;
        return {
          affiliation_id: row.id,
          role: row.role,
          is_primary: row.is_primary,
          notes: row.notes,
          branch_id: row.branch_id,
          branch: row.branch
            ? {
                id: row.branch.id,
                name: row.branch.name,
                parent_branch_id: row.branch.parent_branch_id,
              }
            : null,
          donor,
        };
      });
  }

  /**
   * Ensure an organization exists from a company/org name (import / create helpers).
   */
  async findOrCreateFromCompanyFields(fields: {
    company_name?: string;
    company_registration?: string;
    company_email?: string;
    company_phone?: string;
    company_address?: string;
    city?: string;
    country?: string;
  }): Promise<Organization | null> {
    const name = fields.company_name?.trim();
    if (!name) return null;

    const existing = await this.orgRepo
      .createQueryBuilder("org")
      .where("org.is_archived = false")
      .andWhere("LOWER(org.name) = LOWER(:name)", { name })
      .getOne();
    if (existing) return existing;

    return this.create({
      name,
      registration_number: fields.company_registration,
      email: fields.company_email,
      phone: fields.company_phone,
      address: fields.company_address,
      city: fields.city,
      country: fields.country,
    });
  }
}
