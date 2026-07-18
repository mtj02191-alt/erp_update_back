import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProgramRationReports1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ration_reports table
    await queryRunner.createTable(
      new Table({
        name: "ration_reports",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "report_date",
            type: "date",
            isNullable: false,
          },
          {
            name: "is_alternate",
            type: "boolean",
            default: false,
          },
          {
            name: "full_widows",
            type: "int",
            default: 0,
          },
          {
            name: "full_divorced",
            type: "int",
            default: 0,
          },
          {
            name: "full_disable",
            type: "int",
            default: 0,
          },
          {
            name: "full_indegent",
            type: "int",
            default: 0,
          },
          {
            name: "full_orphan",
            type: "int",
            default: 0,
          },
          {
            name: "half_widows",
            type: "int",
            default: 0,
          },
          {
            name: "half_divorced",
            type: "int",
            default: 0,
          },
          {
            name: "half_disable",
            type: "int",
            default: 0,
          },
          {
            name: "half_indegent",
            type: "int",
            default: 0,
          },
          {
            name: "half_orphan",
            type: "int",
            default: 0,
          },
          {
            name: "life_time",
            type: "int",
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamp",
            precision: 6,
            default: `('now'::text)::timestamp(6) with time zone`,
          },
          {
            name: "updated_at",
            type: "timestamp",
            precision: 6,
            default: `('now'::text)::timestamp(6) with time zone`,
          },
        ],
      }),
    );

    // Create indexes for better performance
    await queryRunner.query(
      "CREATE INDEX idx_ration_reports_date ON ration_reports(report_date)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_ration_reports_created_at ON ration_reports(created_at)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_ration_reports_is_alternate ON ration_reports(is_alternate)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_ration_reports_is_alternate",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_ration_reports_created_at",
    );
    await queryRunner.query("DROP INDEX IF EXISTS idx_ration_reports_date");

    // Drop table
    await queryRunner.dropTable("ration_reports");
  }
}
