import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { StoreDailyReportEntity } from "../../store/store_daily_reports/entities/store-daily-report.entity";
import { ProcurementsDailyReportEntity } from "../../procurements/procurements_daily_reports/entities/procurements-daily-report.entity";
import { AccountsAndFinanceEntity } from "../../accounts-and-finance/entities/accounts-and-finance.entity/accounts-and-finance.entity";
import { AccountsAndFinanceDailyReportEntity } from "../../accounts-and-finance/accounts_and_finance_daily_reports/entities/accounts-and-finance-daily-report.entity";
import { ApplicationReport } from "../../program/application_reports/entities/application-report.entity";
import { AreaRationReport } from "../../program/area_ration/reports/entities/area-ration-report.entity";
import { EducationReport } from "../../program/education/reports/entities/education-report.entity";
import { FinancialAssistanceReport } from "src/program/financial_assistance/reports/entities/financial-assistance-report.entity";
import { KasbReport } from "src/program/kasb/reports/entities/kasb-report.entity";
import { KasbTrainingReport } from "src/program/kasb_training/reports/entities/kasb-training-report.entity";
import { MarriageGiftReport } from "src/program/marriage_gifts/reports/entities/marriage-gift-report.entity";
import { RationReport } from "src/program/ration/reports/entities/ration-report.entity";
import { SewingMachineReport } from "src/program/sewing_machine/reports/entities/sewing-machine-report.entity";
import { TreePlantationReport } from "src/program/tree_plantation/reports/entities/tree-plantation-report.entity";
import { WaterReport } from "src/program/water/reports/entities/water-report.entity";
import { WheelChairOrCrutchesReport } from "src/program/wheel_chair_or_crutches/reports/entities/wheel-chair-or-crutches-report.entity";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    @InjectRepository(StoreDailyReportEntity)
    private readonly storeDailyReportsRepository: Repository<StoreDailyReportEntity>,
    @InjectRepository(ProcurementsDailyReportEntity)
    private readonly procurementsDailyReportsRepository: Repository<ProcurementsDailyReportEntity>,
    @InjectRepository(AccountsAndFinanceEntity)
    private readonly accountsAndFinanceRepository: Repository<AccountsAndFinanceEntity>,
    @InjectRepository(AccountsAndFinanceDailyReportEntity)
    private readonly accountsAndFinanceDailyReportsRepository: Repository<AccountsAndFinanceDailyReportEntity>,
    @InjectRepository(ApplicationReport)
    private readonly applicationReportRepository: Repository<ApplicationReport>,
    @InjectRepository(AreaRationReport)
    private readonly areaRationReportsRepository: Repository<AreaRationReport>,
    @InjectRepository(EducationReport)
    private readonly educationReportsRepository: Repository<EducationReport>,
    @InjectRepository(FinancialAssistanceReport)
    private readonly financialAssistanceReportsRepository: Repository<FinancialAssistanceReport>,
    @InjectRepository(KasbReport)
    private readonly kasbReportsRepository: Repository<KasbReport>,
    @InjectRepository(KasbTrainingReport)
    private readonly kasabTrainingRepository: Repository<KasbTrainingReport>,
    @InjectRepository(MarriageGiftReport)
    private readonly marriageGiftsRepository: Repository<MarriageGiftReport>,
    @InjectRepository(RationReport)
    private readonly rationReportsRepository: Repository<RationReport>,
    @InjectRepository(SewingMachineReport)
    private readonly sewingMachineRepository: Repository<SewingMachineReport>,
    @InjectRepository(TreePlantationReport)
    private readonly treePlantationRepository: Repository<TreePlantationReport>,
    @InjectRepository(WaterReport)
    private readonly waterRepository: Repository<WaterReport>,
    @InjectRepository(WheelChairOrCrutchesReport)
    private readonly wheelChairOrCrutchesRepository: Repository<WheelChairOrCrutchesReport>,
  ) {}
  // current
  async getAllDailyReports(body: any) {
    try {
      // get from and to values from body and filter the data
      const { from, to } = body;
      const dateFilter = {
        date: Between(from, to),
      };
      // const [accountsAndFinance, procurements, store, applicationReports, areaRationReports, educationReports, financialAssistanceReports, kasbReports, kasabTrainingReports, marriageGiftsReports, rationReports, sewingMachineReports, treePlantationReports, waterReports, wheelChairOrCrutchesReports] = await Promise.all([
      // Batch 1: Accounts and Finance, Procurements, Store, Application Reports, Area Ration Reports, Education Reports
      const [
        accountsAndFinance,
        procurements,
        store,
        applicationReports,
        areaRationReports,
        educationReports,
      ] = await Promise.all([
        //  Accounts and Finance Daily Reports
        this.accountsAndFinanceDailyReportsRepository
          .createQueryBuilder("a_f_report")
          .select("SUM(a_f_report.daily_inflow)", "Daily Inflow")
          .addSelect("SUM(a_f_report.daily_outflow)", "Daily Outflow")
          .addSelect("SUM(a_f_report.pending_payable)", "Pending Payable")
          .addSelect("SUM(a_f_report.petty_cash)", "Petty Cash")
          .addSelect("SUM(a_f_report.available_funds)", "Available Funds")
          .addSelect("SUM(a_f_report.tax_late_payments)", "Tax Late Payments")
          .addSelect("SUM(a_f_report.payable_reports)", "Payable Reports")
          .addSelect(
            "SUM(a_f_report.restricted_funds_reports)",
            "Restricted Funds Reports",
          )
          .addSelect(
            "SUM(a_f_report.payment_commitment_party_vise)",
            "Payment Commitment Party Vise",
          )
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(a_f_report.daily_inflow + a_f_report.daily_outflow + a_f_report.pending_payable + a_f_report.petty_cash + a_f_report.available_funds + a_f_report.tax_late_payments + a_f_report.payable_reports + a_f_report.restricted_funds_reports + a_f_report.payment_commitment_party_vise)",
            "Grand_Total",
          )
          .where("a_f_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        //  Procurements Daily Reports
        this.procurementsDailyReportsRepository
          .createQueryBuilder("p_d_report")
          .select("SUM(p_d_report.total_generated_pos)", "Generated POs")
          .addSelect("SUM(p_d_report.pending_pos)", "Pending POs")
          .addSelect("SUM(p_d_report.fulfilled_pos)", "Fulfilled POs")
          .addSelect("SUM(p_d_report.total_generated_pis)", "Generated PIs")
          .addSelect("SUM(p_d_report.total_paid_amount)", "Paid Amount")
          .addSelect("SUM(p_d_report.unpaid_amount)", "Unpaid Amount")
          .addSelect("SUM(p_d_report.unpaid_pis)", "Unpaid PIs")
          .addSelect("SUM(p_d_report.tenders)", "Tenders")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(p_d_report.total_generated_pos + p_d_report.pending_pos + p_d_report.fulfilled_pos + p_d_report.total_generated_pis + p_d_report.total_paid_amount + p_d_report.unpaid_amount + p_d_report.unpaid_pis + p_d_report.tenders)",
            "Grand_Total",
          )
          .where("p_d_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        //  Store Daily Reports
        this.storeDailyReportsRepository
          .createQueryBuilder("s_d_report")
          .select("SUM(s_d_report.generated_demands)", "Generated Demands")
          .addSelect("SUM(s_d_report.pending_demands)", "Pending Demands")
          .addSelect("SUM(s_d_report.generated_grn)", "Generated GRNs")
          .addSelect("SUM(s_d_report.pending_grn)", "Pending GRNs")
          .addSelect("SUM(s_d_report.rejected_demands)", "Rejected Demands")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(s_d_report.generated_demands + s_d_report.pending_demands + s_d_report.generated_grn + s_d_report.pending_grn + s_d_report.rejected_demands)",
            "Grand_Total",
          )
          .where("s_d_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        //  Application Reports
        this.applicationReportRepository
          .createQueryBuilder("a_r_report")
          .select("SUM(a_r_report.pending_last_month)", "Pending Last Month")
          .addSelect("SUM(a_r_report.application_count)", "Applications")
          .addSelect("SUM(a_r_report.investigation_count)", "Investigations")
          .addSelect("SUM(a_r_report.verified_count)", "Verified")
          .addSelect("SUM(a_r_report.approved_count)", "Approved")
          .addSelect("SUM(a_r_report.rejected_count)", "Rejected")
          .addSelect("SUM(a_r_report.pending_count)", "Pending")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(a_r_report.pending_last_month + a_r_report.application_count + a_r_report.investigation_count + a_r_report.verified_count + a_r_report.approved_count + a_r_report.rejected_count + a_r_report.pending_count)",
            "Grand_Total",
          )
          .where("a_r_report.report_date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Area Ration Reports
        this.areaRationReportsRepository
          .createQueryBuilder("area_r_report")
          .select("SUM(area_r_report.quantity)", "Total Quantity")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .where("area_r_report.report_date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Education Reports
        this.educationReportsRepository
          .createQueryBuilder("e_r_report")
          .select("SUM(e_r_report.male_orphans)", "Male Orphans")
          .addSelect("SUM(e_r_report.male_divorced)", "Male Divorced")
          .addSelect("SUM(e_r_report.male_disable)", "Male Disable")
          .addSelect("SUM(e_r_report.male_indegent)", "Male Indegent")
          .addSelect("SUM(e_r_report.female_orphans)", "Female Orphans")
          .addSelect("SUM(e_r_report.female_divorced)", "Female Divorced")
          .addSelect("SUM(e_r_report.female_disable)", "Female Disable")
          .addSelect("SUM(e_r_report.female_indegent)", "Female Indegent")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(e_r_report.male_orphans + e_r_report.male_divorced + e_r_report.male_disable + e_r_report.male_indegent + e_r_report.female_orphans + e_r_report.female_divorced + e_r_report.female_disable + e_r_report.female_indegent)",
            "Grand_Total",
          )
          .where("e_r_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),
      ]);

      // Batch 2: Financial Assistance Reports, Kasb Reports, Kasab Training Reports, Marriage Gifts Reports
      const [
        financialAssistanceReports,
        kasbReports,
        kasabTrainingReports,
        marriageGiftsReports,
      ] = await Promise.all([
        // Financial Assistance Reports
        this.financialAssistanceReportsRepository
          .createQueryBuilder("f_a_report")
          .select("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect("SUM(f_a_report.widow)", "Widow")
          .addSelect("SUM(f_a_report.divorced)", "Divorced")
          .addSelect("SUM(f_a_report.disable)", "Disable")
          .addSelect("SUM(f_a_report.extreme_poor)", "Extreme Poor")
          .addSelect(
            "SUM(f_a_report.widow + f_a_report.divorced + f_a_report.disable + f_a_report.extreme_poor)",
            "Grand_Total",
          )
          .where("f_a_report.report_date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Kasb Reports
        this.kasbReportsRepository
          .createQueryBuilder("k_r_report")
          .select("SUM(k_r_report.delivery)", "Total Delivery")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          // .addSelect('COUNT(report.id)', 'Total Reports')
          .where("k_r_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Kasab Training
        this.kasabTrainingRepository
          .createQueryBuilder("k_t_report")
          .select("SUM(k_t_report.quantity)", "Total Quantity") // total quantity of trainees
          .addSelect("SUM(k_t_report.addition)", "Total Addition")
          .addSelect("SUM(k_t_report.left)", "Total Left")
          .addSelect("SUM(k_t_report.total)", "Total")
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(k_t_report.quantity + k_t_report.addition + k_t_report.left + k_t_report.total)",
            "Grand_Total",
          )
          .where("k_t_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Marriage Gifts Report
        this.marriageGiftsRepository
          .createQueryBuilder("m_g_report")
          .select("SUM(m_g_report.orphans)", "Orphans")
          .addSelect("SUM(m_g_report.divorced)", "Divorced")
          .addSelect("SUM(m_g_report.disable)", "Disable")
          .addSelect("SUM(m_g_report.indegent)", "Indegent") // indegent
          .addSelect("COUNT(*)", "Total Reports") // ✅ use COUNT(*)
          .addSelect(
            "SUM(m_g_report.orphans + m_g_report.divorced + m_g_report.disable + m_g_report.indegent)",
            "Grand_Total",
          )
          .where("m_g_report.report_date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),
      ]);

      // Batch 3: Ration Reports, Sewing Machine Reports, Tree Plantation Reports, Water Reports, Wheel Chair or Crutches Reports
      const [
        rationReports,
        sewingMachineReports,
        treePlantationReports,
        waterReports,
        wheelChairOrCrutchesReports,
      ] = await Promise.all([
        // Ration Reports
        this.rationReportsRepository
          .createQueryBuilder("r_r_report")
          .select("COUNT(r_r_report.id)", "Total Reports")
          .addSelect("SUM(r_r_report.full_widows)", "Full Widows")
          .addSelect("SUM(r_r_report.full_divorced)", "Full Divorced")
          .addSelect("SUM(r_r_report.full_disable)", "Full Disable")
          .addSelect("SUM(r_r_report.full_indegent)", "Full Indegent")
          .addSelect("SUM(r_r_report.full_orphan)", "Full Orphan")
          .addSelect("SUM(r_r_report.half_widows)", "Half Widows")
          .addSelect("SUM(r_r_report.half_divorced)", "Half Divorced")
          .addSelect("SUM(r_r_report.half_disable)", "Half Disable")
          .addSelect("SUM(r_r_report.half_indegent)", "Half Indegent")
          .addSelect("SUM(r_r_report.half_orphan)", "Half Orphan")
          .addSelect("SUM(r_r_report.life_time)", "Life Time")
          .addSelect(
            "SUM(r_r_report.full_widows + r_r_report.full_divorced + r_r_report.full_disable + r_r_report.full_indegent + r_r_report.full_orphan + r_r_report.half_widows + r_r_report.half_divorced + r_r_report.half_disable + r_r_report.half_indegent + r_r_report.half_orphan + r_r_report.life_time_full_widows + r_r_report.life_time_full_divorced + r_r_report.life_time_full_disable + r_r_report.life_time_full_indegent + r_r_report.life_time_full_orphan + r_r_report.life_time_half_widows + r_r_report.life_time_half_divorced + r_r_report.life_time_half_disable + r_r_report.life_time_half_indegent + r_r_report.life_time_half_orphan)",
            "Grand_Total",
          ) // grand total ration (life_time buckets; legacy r_r_report.life_time only is superseded after re-save)
          .where("r_r_report.report_date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Sewing Machine Report
        this.sewingMachineRepository
          .createQueryBuilder("s_m_report")
          .select("SUM(s_m_report.orphans)", "Orphans")
          .addSelect("SUM(s_m_report.divorced)", "Divorced")
          .addSelect("SUM(s_m_report.disable)", "Disable")
          .addSelect("SUM(s_m_report.indegent)", "Indegent")
          .addSelect(
            "SUM(s_m_report.orphans + s_m_report.divorced + s_m_report.disable + s_m_report.indegent)",
            "Grand_Total",
          )
          .addSelect("COUNT(s_m_report.id)", "Total Reports")
          .where("s_m_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Tree Plantation Report
        this.treePlantationRepository
          .createQueryBuilder("t_p_report")
          .select("SUM(t_p_report.plants)", "Grand_Total")
          .addSelect("COUNT(t_p_report.id)", "Total Reports")
          .where("t_p_report.report_date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),

        // Water Report
        // 'Hand Pump Indoor',
        // 'Hand Pump Outdoor',
        // 'Water Motor Indoor',
        // 'Water Motor Outdoor',
        // 'Affrideve HP',
        // 'WF PLANT'
        this.waterRepository
          .createQueryBuilder("w_report")
          .select("SUM(w_report.quantity)", "Hand Pump Indoor")
          .addSelect("SUM(w_report.quantity)", "Hand Pump Outdoor")
          .addSelect("SUM(w_report.quantity)", "Water Motor Indoor")
          .addSelect("SUM(w_report.quantity)", "Water Motor Outdoor")
          .addSelect("SUM(w_report.quantity)", "Affrideve HP")
          .addSelect("SUM(w_report.quantity)", "WF PLANT")
          .addSelect(
            "SUM(w_report.quantity + w_report.quantity + w_report.quantity + w_report.quantity + w_report.quantity + w_report.quantity)",
            "Grand_Total",
          )
          .addSelect("COUNT(w_report.id)", "Total Reports")
          .where("w_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),
        // Wheel Chair or Crutches Report
        // Total Wheel Chair and Total Crutches sepatately on type 'Wheel Chair' and 'Crutches'

        this.wheelChairOrCrutchesRepository
          .createQueryBuilder("w_c_report")
          .select(
            `SUM(CASE WHEN w_c_report.type = 'Wheel Chair' THEN w_c_report.orphans + w_c_report.divorced + w_c_report.disable + w_c_report.indegent ELSE 0 END)`,
            "Total Wheel Chairs",
          )
          .addSelect("COUNT(w_c_report.id)", "Total Reports")
          .addSelect(
            `SUM(CASE WHEN w_c_report.type = 'Crutches' THEN w_c_report.orphans + w_c_report.divorced + w_c_report.disable + w_c_report.indegent ELSE 0 END)`,
            "Total Crutches",
          )
          .where("w_c_report.date BETWEEN :fromDate AND :toDate", {
            fromDate: from,
            toDate: to,
          })
          .getRawOne(),
      ]);

      this.logger.log(
        "Fetching all daily reports data from all tables (service)... success",
      );

      const data = {
        accountsAndFinance,
        procurements,
        store,
        program: {
          applicationReports,
          areaRationReports,
          educationReports,
          financialAssistanceReports,
          kasbReports,
          kasabTrainingReports,
          marriageGiftsReports,
          rationReports,
          sewingMachineReports,
          treePlantationReports,
          waterReports,
          wheelChairOrCrutchesReports,
        },
      };
      return data;
    } catch (error) {
      this.logger.error("Error fetching daily reports data", error.stack);
      throw error;
    }
  }
}
