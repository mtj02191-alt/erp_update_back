import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { OrganizationBranch } from "./organization-branch.entity";
import { DonorOrganizationAffiliation } from "./donor-organization-affiliation.entity";

/**
 * Corporate / CSR master record (group company or legal entity).
 * Additive — does not replace donors; people link via affiliations.
 */
@Entity("organizations")
export class Organization extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true, default: null })
  registration_number: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  email: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, default: null })
  phone: string | null;

  @Column({ type: "text", nullable: true, default: null })
  address: string | null;

  @Column({ type: "varchar", length: 120, nullable: true, default: null })
  city: string | null;

  @Column({ type: "varchar", length: 120, nullable: true, default: null })
  country: string | null;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  /** Optional parent group (conglomerate). Null = top-level org. */
  @Column({ type: "int", nullable: true, default: null })
  parent_organization_id: number | null;

  @ManyToOne(() => Organization, (org) => org.subsidiaries, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "parent_organization_id" })
  parent_organization: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent_organization)
  subsidiaries: Organization[];

  @OneToMany(() => OrganizationBranch, (branch) => branch.organization)
  branches: OrganizationBranch[];

  @OneToMany(
    () => DonorOrganizationAffiliation,
    (affiliation) => affiliation.organization,
  )
  affiliations: DonorOrganizationAffiliation[];
}
