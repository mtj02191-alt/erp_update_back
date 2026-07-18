import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateKasbTrainingReports1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "kasb_training_reports",
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
            name: "skill_level",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "quantity",
            type: "int",
            default: 0,
          },
          {
            name: "addition",
            type: "int",
            default: 0,
          },
          {
            name: "left",
            type: "int",
            default: 0,
          },
          {
            name: "total",
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
    await queryRunner.dropTable("kasb_training_reports");
  }
}
