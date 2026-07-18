import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProgramMarriageGiftReports1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create marriage_gift_reports table
    await queryRunner.createTable(
      new Table({
        name: "marriage_gift_reports",
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
      "CREATE INDEX idx_marriage_gift_reports_date ON marriage_gift_reports(report_date)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_marriage_gift_reports_created_at ON marriage_gift_reports(created_at)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_marriage_gift_reports_created_at",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_marriage_gift_reports_date",
    );

    // Drop table
    await queryRunner.dropTable("marriage_gift_reports");
  }
}
