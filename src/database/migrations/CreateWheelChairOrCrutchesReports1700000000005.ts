import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateWheelChairOrCrutchesReports1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "wheel_chair_or_crutches_reports",
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
            name: "type",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "gender",
            type: "varchar",
            length: "20",
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
    await queryRunner.dropTable("wheel_chair_or_crutches_reports");
  }
}
