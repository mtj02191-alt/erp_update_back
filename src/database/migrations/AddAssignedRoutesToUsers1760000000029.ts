import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssignedRoutesToUsers1760000000029
  implements MigrationInterface
{
  name = "AddAssignedRoutesToUsers1760000000029";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "assigned_routes" jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "assigned_routes"
    `);
  }
}
