import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

enum ActivityNameEnum {
  ACCOUNT_NAME = "account_name",
  CONTACT_NAME = "contact_name",
  SUBJECT = "subject",
  PROSPECT_NAME = "prospect_name",
}

enum ActivityDateEnum {
  CLOSEOUT_DATE = "closeout_date",
  SEND_DATE = "send_date",
  CREATION_DATE = "creation_date",
}

enum ActivityTitleEnum {
  HOST_DRIVE = "Host Drive",
  CANCEL_DRIVE = "Cancel Drive",
  SCHEDULE_DRIVE = "Schedule Drive",
  COMMUNICATION = "Communication",
  PROSPECT = "Prospect",
  CREATED = "Created",
  CLOSE_OUT = "Close out",
  ROLE_CHANGED = "Role Changed",
}

export class CreateVolunteerActivityTable1698765675943 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "volunteers_activities",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "volunteer_id",
            type: "bigint",
          },
          {
            name: "activity_title",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "date",
            type: "date",
            isNullable: false,
          },
          // {
          //   name: 'activity_title',
          //   type: 'enum',
          //   enum: Object.values(ActivityTitleEnum),
          //   isNullable: true,
          // },
          // {
          //   name: 'name',
          //   type: 'enum',
          //   enum: Object.values(ActivityNameEnum),
          //   isNullable: true,
          // },
          // {
          //   name: 'date',
          //   type: 'enum',
          //   enum: Object.values(ActivityDateEnum),
          //   isNullable: true,
          // },
          {
            name: "created_at",
            type: "timestamp",
            precision: 6,
            default: `('now'::text)::timestamp(6) with time zone`,
          },
          {
            name: "created_by",
            type: "bigint",
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      "volunteers_activities",
      new TableForeignKey({
        columnNames: ["created_by"],
        referencedColumnNames: ["id"],
        referencedTableName: "user",
        onDelete: "NO ACTION",
        onUpdate: "NO ACTION",
        name: "FK_created_by",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey("volunteers_activities", "FK_created_by");

    await queryRunner.dropTable("volunteers_activities");
  }
}
