import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Organization } from "./organization.entity";
import { DonorOrganizationAffiliation } from "./donor-organization-affiliation.entity";

/**
 * Branch under an organization.
 * Hierarchy: Organization → Branch (parent_branch_id null) → Sub-branch (parent_branch_id set).
 */
@Entity("organization_branches")
export class OrganizationBranch extends BaseEntity {
  @Column({ type: "int" })
  organization_id: number;

  @ManyToOne(() => Organization, (org) => org.branches, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  /** Null = top-level branch. Set = sub-branch of that branch. */
  @Column({ type: "int", nullable: true, default: null })
  parent_branch_id: number | null;

  @ManyToOne(() => OrganizationBranch, (branch) => branch.sub_branches, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "parent_branch_id" })
  parent_branch: OrganizationBranch | null;

  @OneToMany(() => OrganizationBranch, (branch) => branch.parent_branch)
  sub_branches: OrganizationBranch[];

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, nullable: true, default: null })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  email: string | null;

  @Column({ type: "text", nullable: true, default: null })
  address: string | null;

  @Column({ type: "varchar", length: 120, nullable: true, default: null })
  city: string | null;

  @Column({ type: "varchar", length: 120, nullable: true, default: null })
  country: string | null;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @OneToMany(
    () => DonorOrganizationAffiliation,
    (affiliation) => affiliation.branch,
  )
  affiliations: DonorOrganizationAffiliation[];
}
