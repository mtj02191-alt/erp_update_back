import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateEducationReports1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "education_reports",
        columns: [
          {
            name: "id",
            type: "int",
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
            name: "male_orphans",
            type: "int",
            default: 0,
          },
          {
            name: "male_divorced",
            type: "int",
            default: 0,
          },
          {
            name: "male_disable",
            type: "int",
            default: 0,
          },
          {
            name: "male_indegent",
            type: "int",
            default: 0,
          },
          {
            name: "female_orphans",
            type: "int",
            default: 0,
          },
          {
            name: "female_divorced",
            type: "int",
            default: 0,
          },
          {
            name: "female_disable",
            type: "int",
            default: 0,
          },
          {
            name: "female_indegent",
            type: "int",
            default: 0,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("education_reports");
  }
}
