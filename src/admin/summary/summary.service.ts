import { Injectable } from "@nestjs/common";
import { CreateSummaryDto } from "./dto/create-summary.dto";
import { UpdateSummaryDto } from "./dto/update-summary.dto";
import { reprots_tables } from "../../utils/db/tables";
import { EntityManager } from "typeorm";

@Injectable()
export class SummaryService {
  constructor(private readonly entityManager: EntityManager) {}
  create(createSummaryDto: CreateSummaryDto) {
    return "This action adds a new summary";
  }

  async findAll(saal: any) {
    try {
      const year = Number(saal);
      // console.log("summaryData called ______________________", typeof year);
      // return;
      const summaryData: any = {};

      const tableAggregations = {
        education_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(male_orphans, 0))    AS total_male_orphans,
            SUM(COALESCE(female_orphans, 0))  AS total_female_orphans,
            SUM(COALESCE(male_orphans, 0) + COALESCE(female_orphans, 0)) AS total_orphans,
            SUM(COALESCE(male_divorced, 0))   AS total_male_divorced,
            SUM(COALESCE(female_divorced, 0)) AS total_female_divorced,
            SUM(COALESCE(male_disable, 0))    AS total_male_disable,
            SUM(COALESCE(female_disable, 0))  AS total_female_disable,
            SUM(COALESCE(male_indegent, 0))   AS total_male_indegent,
            SUM(COALESCE(female_indegent, 0)) AS total_female_indegent,
            SUM(COALESCE(male_orphans,0) + COALESCE(male_divorced,0) + COALESCE(male_disable,0) + COALESCE(male_indegent,0))   AS boys_achieved,
            SUM(COALESCE(female_orphans,0) + COALESCE(female_divorced,0) + COALESCE(female_disable,0) + COALESCE(female_indegent,0)) AS girls_achieved,
            SUM(COALESCE(male_orphans,0) + COALESCE(male_divorced,0) + COALESCE(male_disable,0) + COALESCE(male_indegent,0) + COALESCE(female_orphans,0) + COALESCE(female_divorced,0) + COALESCE(female_disable,0) + COALESCE(female_indegent,0)) AS total_achieved
          FROM education_reports 
          WHERE is_archived = false
            AND "date" >= make_date($1::int, 1, 1)
            AND "date" <  make_date(($1::int + 1), 1, 1)
        `,

        financial_assistance_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(widow, 0))        AS total_widows,
            SUM(COALESCE(divorced, 0))     AS total_divorced,
            SUM(COALESCE(disable, 0))      AS total_disable,
            SUM(COALESCE(extreme_poor, 0)) AS total_indegent,
            SUM(COALESCE(widow, 0) + COALESCE(divorced, 0) + COALESCE(disable, 0) + COALESCE(extreme_poor, 0)) AS total_achieved,
            SUM(COALESCE(widow, 0) + COALESCE(divorced, 0))       AS female_achieved,
            SUM(COALESCE(disable, 0) + COALESCE(extreme_poor, 0)) AS male_achieved
          FROM financial_assistance_reports 
          WHERE is_archived = false
              AND "report_date" >= make_date($1::int, 1, 1)
              AND "report_date" <  make_date(($1::int + 1), 1, 1)
        `,

        kasb_training_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(addition, 0)) AS total_addition,
            0 AS male_achieved,
            SUM(COALESCE(addition, 0)) AS female_achieved,
            SUM(COALESCE(addition, 0)) AS total_achieved
          FROM kasb_training_reports 
          WHERE is_archived = false
           AND "date" >= make_date($1::int, 1, 1)
            AND "date" <  make_date(($1::int + 1), 1, 1)
        `,

        marriage_gift_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(orphans, 0))  AS total_orphans,
            SUM(COALESCE(divorced, 0)) AS total_divorced,
            SUM(COALESCE(disable, 0))  AS total_disable,
            SUM(COALESCE(indegent, 0)) AS total_indegent,
            0 AS male_achieved,
            SUM(COALESCE(orphans, 0) + COALESCE(divorced, 0) + COALESCE(disable, 0) + COALESCE(indegent, 0)) AS female_achieved,
            SUM(COALESCE(orphans, 0) + COALESCE(divorced, 0) + COALESCE(disable, 0) + COALESCE(indegent, 0)) AS total_achieved
          FROM marriage_gift_reports 
          WHERE is_archived = false
           AND "report_date" >= make_date($1::int, 1, 1)
            AND "report_date" <  make_date(($1::int + 1), 1, 1)
        `,

        sewing_machine_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(orphans, 0))  AS total_orphans,
            SUM(COALESCE(divorced, 0)) AS total_divorced,
            SUM(COALESCE(disable, 0))  AS total_disable,
            SUM(COALESCE(indegent, 0)) AS total_indegent,
            0 AS male_achieved,
            SUM(COALESCE(orphans, 0) + COALESCE(divorced, 0) + COALESCE(disable, 0) + COALESCE(indegent, 0)) AS female_achieved,
            SUM(COALESCE(orphans, 0) + COALESCE(divorced, 0) + COALESCE(disable, 0) + COALESCE(indegent, 0)) AS total_achieved
          FROM sewing_machine_reports 
          WHERE is_archived = false
          AND "date" >= make_date($1::int, 1, 1)
          AND "date" <  make_date(($1::int + 1), 1, 1)
        `,

        ration_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(full_widows, 0))   AS total_full_widows,
            SUM(COALESCE(full_divorced, 0)) AS total_full_divorced,
            SUM(COALESCE(full_disable, 0))  AS total_full_disable,
            SUM(COALESCE(full_indegent, 0)) AS total_full_indegent,
            SUM(COALESCE(full_orphan, 0))   AS total_full_orphan,
            SUM(COALESCE(half_widows, 0))   AS total_half_widows,
            SUM(COALESCE(half_divorced, 0)) AS total_half_divorced,
            SUM(COALESCE(half_disable, 0))  AS total_half_disable,
            SUM(COALESCE(half_indegent, 0)) AS total_half_indegent,
            SUM(COALESCE(half_orphan, 0))   AS total_half_orphan,
            SUM(COALESCE(full_disable, 0) + COALESCE(full_indegent, 0) + COALESCE(full_orphan, 0) + COALESCE(half_disable, 0) + COALESCE(half_indegent, 0) + COALESCE(half_orphan, 0)) AS male_achieved,
            SUM(COALESCE(full_widows, 0) + COALESCE(full_divorced, 0) + COALESCE(half_widows, 0) + COALESCE(half_divorced, 0)) AS female_achieved,
            SUM(COALESCE(full_widows, 0) + COALESCE(full_divorced, 0) + COALESCE(half_widows, 0) + COALESCE(half_divorced, 0) + COALESCE(full_disable, 0) + COALESCE(full_indegent, 0) + COALESCE(full_orphan, 0) + COALESCE(half_disable, 0) + COALESCE(half_indegent, 0) + COALESCE(half_orphan, 0) + COALESCE(life_time_full_widows, 0) + COALESCE(life_time_full_divorced, 0) + COALESCE(life_time_full_disable, 0) + COALESCE(life_time_full_indegent, 0) + COALESCE(life_time_full_orphan, 0) + COALESCE(life_time_half_widows, 0) + COALESCE(life_time_half_divorced, 0) + COALESCE(life_time_half_disable, 0) + COALESCE(life_time_half_indegent, 0) + COALESCE(life_time_half_orphan, 0)) AS total_achieved
          FROM ration_reports 
          WHERE is_archived = false
           AND "report_date" >= make_date($1::int, 1, 1)
            AND "report_date" <  make_date(($1::int + 1), 1, 1)
        `,

        tree_plantation_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(COALESCE(plants, 0)) AS total_plants,
            SUM(COALESCE(plants, 0)) AS total_achieved
          FROM tree_plantation_reports 
          WHERE is_archived = false
            AND "report_date" >= make_date($1::int, 1, 1)
            AND "report_date" <  make_date(($1::int + 1), 1, 1)
        `,

        water_reports: `
          SELECT 
            COUNT(*) AS total_records,
            SUM(CASE WHEN system = 'Hand Pump Indoor'  THEN COALESCE(quantity,0) ELSE 0 END) AS total_hand_pump_indoor,
            SUM(CASE WHEN system = 'Hand Pump Outdoor' THEN COALESCE(quantity,0) ELSE 0 END) AS total_hand_pump_outdoor,
            SUM(CASE WHEN system = 'Water Motor Indoor' THEN COALESCE(quantity,0) ELSE 0 END) AS total_water_motor_indoor,
            SUM(CASE WHEN system = 'Water Motor Outdoor' THEN COALESCE(quantity,0) ELSE 0 END) AS total_water_motor_outdoor,
            SUM(CASE WHEN system = 'Affrideve HP'      THEN COALESCE(quantity,0) ELSE 0 END) AS total_affrideve_hp,
            SUM(CASE WHEN system = 'WF PLANT'          THEN COALESCE(quantity,0) ELSE 0 END) AS total_wf_plant,
            SUM(CASE WHEN system = 'Hand Pump Indoor'  THEN COALESCE(quantity,0) ELSE 0 END) + SUM(CASE WHEN system = 'Hand Pump Outdoor' THEN COALESCE(quantity,0) ELSE 0 END) + SUM(CASE WHEN system = 'Water Motor Indoor' THEN COALESCE(quantity,0) ELSE 0 END) + SUM(CASE WHEN system = 'Water Motor Outdoor' THEN COALESCE(quantity,0) ELSE 0 END) + SUM(CASE WHEN system = 'Affrideve HP'      THEN COALESCE(quantity,0) ELSE 0 END) + SUM(CASE WHEN system = 'WF PLANT'          THEN COALESCE(quantity,0) ELSE 0 END) AS total_achieved
          FROM water_reports  
          WHERE is_archived = false
            AND activity = 'Installation'
            AND "date" >= make_date($1::int, 1, 1)
            AND "date" <  make_date(($1::int + 1), 1, 1)
        `,

        wheel_chair_or_crutches_reports: `
          SELECT 
            -- Wheel Chair breakdown
            SUM(CASE WHEN type = 'Wheel Chair' THEN COALESCE(orphans,0)  ELSE 0 END) AS wheel_chair_orphans,
            SUM(CASE WHEN type = 'Wheel Chair' THEN COALESCE(divorced,0) ELSE 0 END) AS wheel_chair_divorced,
            SUM(CASE WHEN type = 'Wheel Chair' THEN COALESCE(disable,0)  ELSE 0 END) AS wheel_chair_disable,
            SUM(CASE WHEN type = 'Wheel Chair' THEN COALESCE(indegent,0) ELSE 0 END) AS wheel_chair_indegent,
      
            -- Crutches breakdown
            SUM(CASE WHEN type = 'Crutches' THEN COALESCE(orphans,0)  ELSE 0 END) AS crutches_orphans,
            SUM(CASE WHEN type = 'Crutches' THEN COALESCE(divorced,0) ELSE 0 END) AS crutches_divorced,
            SUM(CASE WHEN type = 'Crutches' THEN COALESCE(disable,0)  ELSE 0 END) AS crutches_disable,
            SUM(CASE WHEN type = 'Crutches' THEN COALESCE(indegent,0) ELSE 0 END) AS crutches_indegent,
      
            -- Total per vulnerability (all types)
            SUM(COALESCE(orphans,0))  AS total_orphans,
            SUM(COALESCE(divorced,0)) AS total_divorced,
            SUM(COALESCE(disable,0))  AS total_disable,
            SUM(COALESCE(indegent,0)) AS total_indegent,
      
            -- Totals by gender
            SUM(CASE WHEN gender = 'Male'   THEN COALESCE(orphans,0)+COALESCE(divorced,0)+COALESCE(disable,0)+COALESCE(indegent,0) ELSE 0 END) AS male_achieved,
            SUM(CASE WHEN gender = 'Female' THEN COALESCE(orphans,0)+COALESCE(divorced,0)+COALESCE(disable,0)+COALESCE(indegent,0) ELSE 0 END) AS female_achieved,
      
            -- Totals by type
            SUM(CASE WHEN type = 'Wheel Chair' THEN COALESCE(orphans,0)+COALESCE(divorced,0)+COALESCE(disable,0)+COALESCE(indegent,0) ELSE 0 END) AS total_wheel_chairs,
            SUM(CASE WHEN type = 'Crutches'    THEN COALESCE(orphans,0)+COALESCE(divorced,0)+COALESCE(disable,0)+COALESCE(indegent,0) ELSE 0 END) AS total_crutches,
      
            -- Grand total
            SUM(COALESCE(orphans,0)+COALESCE(divorced,0)+COALESCE(disable,0)+COALESCE(indegent,0)) AS total_achieved,
      
            COUNT(*) AS total_records
          FROM wheel_chair_or_crutches_reports
          WHERE is_archived = false
            AND "date" >= make_date($1::int, 1, 1)
            AND "date" <  make_date(($1::int + 1), 1, 1)
        `,
      };

      // Execute aggregation queries for each table
      for (const [tableKey, query] of Object.entries(tableAggregations)) {
        try {
          const result = await this.entityManager.query(query, [year]);
          summaryData[tableKey] = result[0]; // Get first row of aggregation
        } catch (tableError) {
          console.error(`Error querying table ${tableKey}:`, tableError);
          summaryData[tableKey] = {
            error: "Query failed",
            total_records: 0,
            total_amount: 0,
            total_quantity: 0,
            total_beneficiaries: 0,
          };
        }
      }

      const n = (v) => (v == null ? 0 : Number(v) || 0); // handles null/undefined/"12"
      // now format data according vulnerability type
      //add widows achieved in summary data
      const total_widows_achieved =
        n(summaryData.financial_assistance_reports.total_widows) +
        n(summaryData.ration_reports.total_full_widows) +
        n(summaryData.ration_reports.total_half_widows);
      // DIVORCED achieved
      const total_divorced_achieved =
        n(summaryData.financial_assistance_reports.total_divorced) +
        n(summaryData.ration_reports.total_full_divorced) +
        n(summaryData.ration_reports.total_half_divorced);
      // DISABLED achieved
      const total_disabled_achieved =
        n(summaryData.financial_assistance_reports.total_disable) +
        n(summaryData.ration_reports.total_full_disable) +
        n(summaryData.ration_reports.total_half_disable);
      // INDEGENT achieved
      const total_indegent_achieved =
        n(summaryData.financial_assistance_reports.total_indegent) +
        n(summaryData.ration_reports.total_full_indegent) +
        n(summaryData.ration_reports.total_half_indegent);
      // ORPHANS achieved
      const total_orphans_achieved =
        n(summaryData.education_reports.total_orphans) +
        n(summaryData.marriage_gift_reports.total_orphans) +
        n(summaryData.sewing_machine_reports.total_orphans) +
        n(summaryData.wheel_chair_or_crutches_reports.total_orphans);
      //add women-headed households achieved in summary data
      const total_women_headed_households_achieved = 0;
      // total targeted

      // total girls achieved
      // null is added with number 0
      const total_girls_achieved = n(
        summaryData.education_reports.girls_achieved,
      );

      // total boys achieved
      // null is added with number 0
      const total_boys_achieved = n(
        summaryData.education_reports.boys_achieved,
      );
      // total achieved
      const total_young_achieved = total_girls_achieved + total_boys_achieved;

      // total female achieved
      const total_female_achieved =
        n(summaryData.financial_assistance_reports.female_achieved) +
        n(summaryData.kasb_training_reports.female_achieved) +
        n(summaryData.marriage_gift_reports.female_achieved) +
        n(summaryData.sewing_machine_reports.female_achieved) +
        n(summaryData.ration_reports.female_achieved) +
        n(summaryData.wheel_chair_or_crutches_reports.female_achieved);

      // total male achieved
      const total_male_achieved =
        n(summaryData.financial_assistance_reports.male_achieved) +
        n(summaryData.ration_reports.male_achieved) +
        n(summaryData.wheel_chair_or_crutches_reports.male_achieved);

      // total achieved
      const total_adult_achieved = total_female_achieved + total_male_achieved;

      // I  think we should add all achieded in a summaryData key achievements

      summaryData.achievements = {
        // category wise also includes gender wise and  vulnerabiulity wise
        category_wise: {
          total_girls_achieved: total_girls_achieved,
          total_boys_achieved: total_boys_achieved,
          total_young_achieved: total_young_achieved,
          total_widows_achieved: total_widows_achieved,
          total_divorced_achieved: total_divorced_achieved,
          total_disabled_achieved: total_disabled_achieved,
          total_indegent_achieved: total_indegent_achieved,
          total_orphans_achieved: total_orphans_achieved,
          total_women_headed_households_achieved:
            total_women_headed_households_achieved,
          total_female_achieved: total_female_achieved,
          total_male_achieved: total_male_achieved,
          total_adult_achieved: total_adult_achieved,
        },
        // use program keys here as keys here
        program_wise: {
          total_achieved:
            n(summaryData.education_reports.total_achieved) +
            n(summaryData.financial_assistance_reports.total_achieved) +
            n(summaryData.kasb_training_reports.total_achieved) +
            n(summaryData.marriage_gift_reports.total_achieved) +
            n(summaryData.sewing_machine_reports.total_achieved) +
            n(summaryData.ration_reports.total_achieved) +
            n(summaryData.tree_plantation_reports.total_achieved) +
            n(summaryData.water_reports.total_achieved) +
            n(summaryData.wheel_chair_or_crutches_reports.total_achieved),
          education_reports: summaryData.education_reports,
          financial_assistance_reports:
            summaryData.financial_assistance_reports,
          kasb_training_reports: summaryData.kasb_training_reports,
          marriage_gift_reports: summaryData.marriage_gift_reports,
          sewing_machine_reports: summaryData.sewing_machine_reports,
          ration_reports: summaryData.ration_reports,
          tree_plantation_reports: summaryData.tree_plantation_reports,
          water_reports: summaryData.water_reports,
          wheel_chair_or_crutches_reports:
            summaryData.wheel_chair_or_crutches_reports,
        },
      };

      summaryData.targets = {
        category_wise: {
          girls_target:
            summaryData.achievements.category_wise.total_girls_achieved * 1.15,
          boys_target:
            summaryData.achievements.category_wise.total_boys_achieved * 1.15,
          total_target:
            summaryData.achievements.category_wise.total_young_achieved * 1.15,
          widows_target:
            summaryData.achievements.category_wise.total_widows_achieved * 1.15,
          divorced_target:
            summaryData.achievements.category_wise.total_divorced_achieved *
            1.15,
          disabled_target:
            summaryData.achievements.category_wise.total_disabled_achieved *
            1.15,
          indegent_target:
            summaryData.achievements.category_wise.total_indegent_achieved *
            1.15,
          youth_target:
            summaryData.achievements.category_wise.total_young_achieved * 1.15,
          female_target:
            summaryData.achievements.category_wise.total_female_achieved * 1.15,
          male_target:
            summaryData.achievements.category_wise.total_male_achieved * 1.15,
          adult_target:
            summaryData.achievements.category_wise.total_adult_achieved * 1.15,
          orphans_target:
            summaryData.achievements.category_wise.total_orphans_achieved *
            1.15,
          women_headed_households_target:
            summaryData.achievements.category_wise
              .total_women_headed_households_achieved * 1.15,
          young_target:
            summaryData.achievements.category_wise.total_young_achieved * 1.15,
        },
        program_wise: {
          education_reports_target:
            n(summaryData.education_reports?.total_achieved) * 1.15,
          financial_assistance_reports_target:
            n(summaryData.financial_assistance_reports?.total_achieved) * 1.15,
          kasb_training_reports_target:
            n(summaryData.kasb_training_reports?.total_achieved) * 1.15,
          marriage_gift_reports_target:
            n(summaryData.marriage_gift_reports?.total_achieved) * 1.15,
          sewing_machine_reports_target:
            n(summaryData.sewing_machine_reports?.total_achieved) * 1.15,
          ration_reports_target:
            n(summaryData.ration_reports?.total_achieved) * 1.15,
          tree_plantation_reports_target:
            n(summaryData.tree_plantation_reports?.total_achieved) * 1.15,
          water_reports_target:
            n(summaryData.water_reports?.total_achieved) * 1.15,
          wheel_chair_or_crutches_reports_target:
            n(summaryData.wheel_chair_or_crutches_reports?.total_achieved) *
            1.15,
          total_target:
            n(summaryData.achievements?.program_wise?.total_achieved) * 1.15,
        },
      };

      // get the program targets
      // update this to fetch targets in format like
      // target formats i need
      // male  => where vulnerability is , disable, indegent, orphans, male
      // female => where vulnerability is widow, divorced, female
      // total => where vulnerability is sum of all above
      // const programTargets = await this.entityManager.query(
      //   `SELECT * FROM program_targets WHERE year = $1`,
      //   [year]
      // );
      // console.log("programTargets", programTargets);

      // now we will set dummy tartgets is such a way that it should be 15, to 20% dynamically for  each program plus
      //each category

      return {
        success: true,
        data: summaryData,
        year: year,
        total_tables: Object.keys(tableAggregations).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} summary`;
  }

  update(id: number, updateSummaryDto: UpdateSummaryDto) {
    return `This action updates a #${id} summary`;
  }

  remove(id: number) {
    return `This action removes a #${id} summary`;
  }
}
