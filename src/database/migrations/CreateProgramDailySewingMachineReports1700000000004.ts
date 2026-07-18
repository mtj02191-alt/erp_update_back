import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProgramDailySewingMachineReports1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "program_daily_sewing_machine_reports",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "date",
            type: "date",
            isNullable: false,
          },
          {
            name: "orphans",
            type: "int",
            default: 0,
          },
          {
            name: "divorced",
            type: "int",
            default: 0,
          },
          {
            name: "disable",
            type: "int",
            default: 0,
          },
          {
            name: "indegent",
            type: "int",
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamp",
            precision: 6,
            default: `('now'::text)::timestamp(6) with time zone`,
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            precision: 6,
            default: `('now'::text)::timestamp(6) with time zone`,
            isNullable: false,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("program_daily_sewing_machine_reports");
  }
}
