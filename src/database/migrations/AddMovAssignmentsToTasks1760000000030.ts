import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMovAssignmentsToTasks1760000000030
  implements MigrationInterface
{
  name = "AddMovAssignmentsToTasks1760000000030";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN IF NOT EXISTS "mov_assignments" jsonb DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks" DROP COLUMN IF EXISTS "mov_assignments"
    `);
  }
}