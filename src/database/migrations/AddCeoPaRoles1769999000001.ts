import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCeoPaRoles1769999000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CEO and PA roles to the user_role enum type
    // Using IF NOT EXISTS to be safe if values already exist
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'ceo'`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'pa'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum type
    // The only way is to recreate the type, which is risky
    // No-op for downgrade
  }
}
