import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProgramFinancialAssistanceReports1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create financial_assistance_reports table
    await queryRunner.createTable(
      new Table({
        name: "financial_assistance_reports",
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
            name: "widow",
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
            name: "extreme_poor",
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
      "CREATE INDEX idx_financial_assistance_reports_date ON financial_assistance_reports(report_date)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_financial_assistance_reports_created_at ON financial_assistance_reports(created_at)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_financial_assistance_reports_created_at",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_financial_assistance_reports_date",
    );

    // Drop table
    await queryRunner.dropTable("financial_assistance_reports");
  }
}
