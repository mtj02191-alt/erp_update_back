import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProgramDailyApplicationReports1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create program_daily_application_reports table with all fields
    await queryRunner.createTable(
      new Table({
        name: "program_daily_application_reports",
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
            name: "notes",
            type: "text",
            isNullable: true,
          },
          {
            name: "project",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "pending_last_month",
            type: "int",
            default: 0,
          },
          {
            name: "application_count",
            type: "int",
            default: 0,
          },
          {
            name: "investigation_count",
            type: "int",
            default: 0,
          },
          {
            name: "approved_count",
            type: "int",
            default: 0,
          },
          {
            name: "rejected_count",
            type: "int",
            default: 0,
          },
          {
            name: "pending_count",
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
      "CREATE INDEX idx_program_daily_application_reports_date ON program_daily_application_reports(report_date)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_program_daily_application_reports_created_at ON program_daily_application_reports(created_at)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_program_daily_application_reports_project ON program_daily_application_reports(project)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_program_daily_application_reports_project",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_program_daily_application_reports_created_at",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_program_daily_application_reports_date",
    );

    // Drop table
    await queryRunner.dropTable("program_daily_application_reports");
  }
}
