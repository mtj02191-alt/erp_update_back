import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Adds donation box aggregation columns to dashboard_monthly_agg.
 * Run once; then run POST /dashboard/rebuild-aggregates to backfill.
 */
export class AddDonationBoxToDashboardMonthlyAgg1700000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "dashboard_monthly_agg",
      new TableColumn({
        name: "total_donation_box_raised",
        type: "decimal",
        precision: 14,
        scale: 2,
        default: 0,
      }),
    );
    await queryRunner.addColumn(
      "dashboard_monthly_agg",
      new TableColumn({
        name: "total_donation_box_count",
        type: "bigint",
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      "dashboard_monthly_agg",
      "total_donation_box_count",
    );
    await queryRunner.dropColumn(
      "dashboard_monthly_agg",
      "total_donation_box_raised",
    );
  }
}
