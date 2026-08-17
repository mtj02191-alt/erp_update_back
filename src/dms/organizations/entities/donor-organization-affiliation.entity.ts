import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Organization } from "./organization.entity";
import { OrganizationBranch } from "./organization-branch.entity";
import { Donor } from "../../donor/entities/donor.entity";

export enum OrganizationAffiliationRole {
  CONTACT = "contact",
  CEO = "ceo",
  CFO = "cfo",
  CSR_HEAD = "csr_head",
  BRANCH_MANAGER = "branch_manager",
  OTHER = "other",
}

/**
 * Links a person (donor) to a corporate org / optional branch.
 * Many people can belong to one organization.
 */
@Entity("donor_organization_affiliations")
@Index(["donor_id", "organization_id", "branch_id"], { unique: false })
export class DonorOrganizationAffiliation extends BaseEntity {
  @Column({ type: "int" })
  donor_id: number;

  @ManyToOne(() => Donor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  @Column({ type: "int" })
  organization_id: number;

  @ManyToOne(() => Organization, (org) => org.affiliations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "int", nullable: true, default: null })
  branch_id: number | null;

  @ManyToOne(() => OrganizationBranch, (branch) => branch.affiliations, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "branch_id" })
  branch: OrganizationBranch | null;

  @Column({
    type: "varchar",
    length: 40,
    default: OrganizationAffiliationRole.CONTACT,
  })
  role: string;

  @Column({ type: "boolean", default: false })
  is_primary: boolean;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;
}
