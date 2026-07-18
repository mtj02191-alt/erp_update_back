import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class CreateDashboardAggTables1700000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // A) dashboard_monthly_agg
    await queryRunner.createTable(
      new Table({
        name: "dashboard_monthly_agg",
        columns: [
          {
            name: "month_start_date",
            type: "date",
            isPrimary: true,
          },
          {
            name: "total_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_individual_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_csr_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_events_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_online_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_phone_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_corporate_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_event_channel_raised",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_donations_count",
            type: "bigint",
            default: 0,
          },
          {
            name: "total_donors_count",
            type: "bigint",
            default: 0,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "dashboard_monthly_agg",
      new TableIndex({
        name: "idx_dashboard_monthly_agg_month",
        columnNames: ["month_start_date"],
      }),
    );

    // B) dashboard_event_agg
    await queryRunner.createTable(
      new Table({
        name: "dashboard_event_agg",
        columns: [
          {
            name: "event_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "month_start_date",
            type: "date",
            isPrimary: true,
          },
          {
            name: "total_event_collection",
            type: "decimal",
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: "total_donations_count",
            type: "bigint",
            default: 0,
          },
          {
            name: "total_donors_count",
            type: "bigint",
            default: 0,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "dashboard_event_agg",
      new TableForeignKey({
        columnNames: ["event_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "events",
        onDelete: "CASCADE",
        name: "FK_dashboard_event_agg_event",
      }),
    );

    await queryRunner.createIndex(
      "dashboard_event_agg",
      new TableIndex({
        name: "idx_dashboard_event_agg_month",
        columnNames: ["month_start_date"],
      }),
    );

    // C) dashboard_month_donor_unique
    await queryRunner.createTable(
      new Table({
        name: "dashboard_month_donor_unique",
        columns: [
          {
            name: "month_start_date",
            type: "date",
            isPrimary: true,
          },
          {
            name: "donor_id",
            type: "bigint",
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "dashboard_month_donor_unique",
      new TableIndex({
        name: "idx_dashboard_month_donor_unique_donor",
        columnNames: ["donor_id"],
      }),
    );

    // D) dashboard_month_events
    await queryRunner.createTable(
      new Table({
        name: "dashboard_month_events",
        columns: [
          {
            name: "month_start_date",
            type: "date",
            isPrimary: true,
          },
          {
            name: "event_id",
            type: "bigint",
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "dashboard_month_events",
      new TableForeignKey({
        columnNames: ["event_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "events",
        onDelete: "CASCADE",
        name: "FK_dashboard_month_events_event",
      }),
    );

    await queryRunner.createIndex(
      "dashboard_month_events",
      new TableIndex({
        name: "idx_dashboard_month_events_month",
        columnNames: ["month_start_date"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("dashboard_month_events", true);
    await queryRunner.dropTable("dashboard_month_donor_unique", true);
    await queryRunner.dropTable("dashboard_event_agg", true);
    await queryRunner.dropTable("dashboard_monthly_agg", true);
  }
}
