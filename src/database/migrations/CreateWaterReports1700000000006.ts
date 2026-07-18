import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateWaterReports1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "water_reports",
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
            name: "activity",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "system",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "quantity",
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
    await queryRunner.dropTable("water_reports");
  }
}
