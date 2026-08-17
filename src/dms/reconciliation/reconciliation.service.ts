import {

  Injectable,

  BadRequestException,

  Logger,

} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { randomUUID } from "crypto";

import { Reconciliation, ReconciliationRowResult } from "./entities/reconciliation.entity";

import { ReconciliationS3Service } from "./reconciliation-s3.service";

import { parseFaysalWorkbook } from "./parsers/faysal/faysal-sheet.parser";

import { parseFaysalTranDescription } from "./parsers/faysal/faysal-description.parser";

import { FAYSAL_BANK_NAME, FAYSAL_SHEET } from "./parsers/faysal/faysal-sheet.constants";

import { FaysalStatementRow } from "./parsers/faysal/faysal-sheet.parser";

import { parseMeezanCsv } from "./parsers/meezan/meezan-csv.parser";

import { parseMeezanDescription } from "./parsers/meezan/meezan-description.parser";

import {

  MEEZAN_BANK_NAME,

  MEEZAN_SHEET,

} from "./parsers/meezan/meezan-sheet.constants";

import { MeezanStatementRow } from "./parsers/meezan/meezan-csv.parser";

import { ReconciliationDonorHints } from "./parsers/reconciliation-donor-hints";

import { Donor, DonorType } from "../donor/entities/donor.entity";

import { Donation } from "../../donations/entities/donation.entity";

import { buildDonationGeoSearch } from "../../donations/utils/donation-geo.util";
import {
  RECONCILIATION_DONATION_METHOD,
  RECONCILIATION_DONATION_SOURCE,
} from "../../donations/donation-channel.constants";

import { buildDonorGeoSearch } from "../donor/utils/donor-geo.util";



export type ProcessReconciliationOptions = {

  bankName: string;

  file: Express.Multer.File;

  userId?: number;

  notes?: string;

};



type DonationRowInput = {

  rowIndex: number;

  serialNo?: string;

  tranSeqNo?: string;

  tranDate: Date | null;

  effectDate?: Date | null;

  tranType?: string;

  tranDescription: string;

  stan?: string;

  reference?: string;

  depositAmount: number;

  transferAccountNo?: string;

};



const SUPPORTED_BANKS = [FAYSAL_BANK_NAME, MEEZAN_BANK_NAME] as const;



const MEEZAN_SKIP_PATTERNS = new Set(["unknown"]);



@Injectable()

export class ReconciliationService {

  private readonly logger = new Logger(ReconciliationService.name);



  constructor(

    @InjectRepository(Reconciliation)

    private readonly reconciliationRepository: Repository<Reconciliation>,

    @InjectRepository(Donor)

    private readonly donorRepository: Repository<Donor>,

    @InjectRepository(Donation)

    private readonly donationRepository: Repository<Donation>,

    private readonly reconciliationS3: ReconciliationS3Service,

  ) {}



  async processUpload(options: ProcessReconciliationOptions) {

    const bankName = String(options.bankName || "")

      .trim()

      .toLowerCase();



    if (!SUPPORTED_BANKS.includes(bankName as (typeof SUPPORTED_BANKS)[number])) {

      throw new BadRequestException(

        `Bank "${options.bankName}" is not supported yet. Supported: ${SUPPORTED_BANKS.join(", ")}`,

      );

    }



    const upload = await this.reconciliationS3.uploadStatement(

      options.file,

      bankName,

    );



    let rowResults: ReconciliationRowResult[] = [];

    let total_credit_rows = 0;

    let skipped_non_credit = 0;

    let skipped_meta_rows = 0;

    let dates: Date[] = [];



    if (bankName === FAYSAL_BANK_NAME) {

      const parsed = parseFaysalWorkbook(options.file.buffer);

      total_credit_rows = parsed.rows.length;

      skipped_non_credit = parsed.skippedNonCredit;

      skipped_meta_rows = parsed.skippedMetaRows;

      dates = parsed.rows

        .map((r) => r.tranDate)

        .filter((d): d is Date => d != null);



      const batches = this.chunk(parsed.rows, FAYSAL_SHEET.BATCH_SIZE);

      for (const batch of batches) {

        for (const row of batch) {

          rowResults.push(await this.processFaysalRow(row, options.userId));

        }

      }

    } else {

      const parsed = parseMeezanCsv(options.file.buffer);

      total_credit_rows = parsed.rows.length;

      skipped_non_credit = parsed.skippedNonCredit;

      skipped_meta_rows = parsed.skippedMetaRows;

      dates = parsed.rows

        .map((r) => r.bookingDate)

        .filter((d): d is Date => d != null);



      const batches = this.chunk(parsed.rows, MEEZAN_SHEET.BATCH_SIZE);

      for (const batch of batches) {

        for (const row of batch) {

          rowResults.push(await this.processMeezanRow(row, options.userId));

        }

      }

    }



    const created_count = rowResults.filter((r) => r.status === "created").length;

    const skipped_count = rowResults.filter((r) => r.status === "skipped").length;

    const failed_count = rowResults.filter((r) => r.status === "failed").length;



    const statement_from = dates.length

      ? new Date(Math.min(...dates.map((d) => d.getTime())))

      : null;

    const statement_to = dates.length

      ? new Date(Math.max(...dates.map((d) => d.getTime())))

      : null;



    const record = this.reconciliationRepository.create({

      bank_name: bankName,

      file_url: upload.url,

      file_key: upload.key,

      original_filename: options.file.originalname || null,

      statement_from,

      statement_to,

      total_credit_rows,

      skipped_non_credit,

      skipped_meta_rows,

      created_count,

      skipped_count,

      failed_count,

      row_results: rowResults,

      notes: options.notes || null,

      ...(options.userId ? { created_by: { id: options.userId } as any } : {}),

    });



    const saved = await this.reconciliationRepository.save(record);



    return {

      reconciliation: saved,

      summary: {

        total_credit_rows,

        skipped_non_credit,

        skipped_meta_rows,

        created_count,

        skipped_count,

        failed_count,

      },

    };

  }



  async findAll(filters?: {

    bankName?: string;

    userId?: number;

    fromDate?: string;

    toDate?: string;

    page?: number;

    pageSize?: number;

  }) {

    const page = Math.max(1, filters?.page || 1);

    const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 20));

    const skip = (page - 1) * pageSize;



    const qb = this.reconciliationRepository

      .createQueryBuilder("reconciliation")

      .leftJoinAndSelect("reconciliation.created_by", "created_by")

      .orderBy("reconciliation.created_at", "DESC");



    if (filters?.bankName) {

      qb.andWhere("LOWER(reconciliation.bank_name) = LOWER(:bankName)", {

        bankName: filters.bankName,

      });

    }



    if (filters?.userId) {

      qb.andWhere("reconciliation.created_by = :userId", {

        userId: filters.userId,

      });

    }



    if (filters?.fromDate) {

      qb.andWhere("reconciliation.created_at >= :fromDate", {

        fromDate: filters.fromDate,

      });

    }



    if (filters?.toDate) {

      qb.andWhere("reconciliation.created_at <= :toDate", {

        toDate: `${filters.toDate} 23:59:59`,

      });

    }



    const [data, total] = await qb.skip(skip).take(pageSize).getManyAndCount();



    return {

      data,

      pagination: {

        page,

        pageSize,

        total,

        totalPages: Math.ceil(total / pageSize),

      },

    };

  }



  async findOne(id: number) {

    const record = await this.reconciliationRepository.findOne({

      where: { id },

      relations: ["created_by", "updated_by"],

    });

    if (!record) {

      throw new BadRequestException(`Reconciliation record ${id} not found`);

    }

    return record;

  }



  private async processFaysalRow(

    row: FaysalStatementRow,

    userId?: number,

  ): Promise<ReconciliationRowResult> {

    const base = {

      rowIndex: row.rowIndex,

      serialNo: row.serialNo,

      tranSeqNo: row.tranSeqNo,

    };



    try {

      const hints = parseFaysalTranDescription(

        row.tranDescription,

        row.transferAccountNo,

        row.transferAccountTitle,

        row.transferBranchName,

      );



      if (await this.donationAlreadyExists(hints, row.tranSeqNo, row.reference)) {

        return { ...base, status: "skipped", reason: "Donation already exists" };

      }



      if (hints.pattern === "unknown") {

        return {

          ...base,

          status: "skipped",

          reason: `Unsupported tran description pattern (${row.tranType})`,

        };

      }



      const donorId = await this.resolveReconciliationDonorId(

        hints,

        FAYSAL_BANK_NAME,

        row.tranSeqNo,

        { transferAccountNo: row.transferAccountNo },

        userId,

      );



      const donation = await this.createReconciliationDonation(

        {

          rowIndex: row.rowIndex,

          serialNo: row.serialNo,

          tranSeqNo: row.tranSeqNo,

          tranDate: row.tranDate,

          effectDate: row.effectDate,

          tranType: row.tranType,

          tranDescription: row.tranDescription,

          stan: row.stan,

          reference: row.reference,

          depositAmount: row.depositAmount || 0,

        },

        hints,

        donorId,

        FAYSAL_BANK_NAME,

        userId,

      );



      return {

        ...base,

        status: "created",

        donationId: donation.id,

        ...(donorId != null ? { donorId } : {}),

      };

    } catch (error: any) {

      this.logger.warn(

        `Reconciliation row ${row.rowIndex} failed: ${error?.message || error}`,

      );

      return {

        ...base,

        status: "failed",

        reason: error?.message || "Processing failed",

      };

    }

  }



  private async processMeezanRow(

    row: MeezanStatementRow,

    userId?: number,

  ): Promise<ReconciliationRowResult> {

    const base = {

      rowIndex: row.rowIndex,

      serialNo: row.docNo || undefined,

      tranSeqNo: row.docNo || undefined,

    };



    try {

      if (row.creditAmount == null || row.creditAmount <= 0) {

        return {

          ...base,

          status: "skipped",

          reason: "No credit amount",

        };

      }

      const hints = parseMeezanDescription(row.description);



      if (await this.donationAlreadyExists(hints, row.docNo, hints.descriptionRef)) {

        return { ...base, status: "skipped", reason: "Donation already exists" };

      }



      if (MEEZAN_SKIP_PATTERNS.has(hints.pattern)) {

        return {

          ...base,

          status: "skipped",

          reason: `Unsupported Meezan pattern (${hints.pattern})`,

        };

      }



      const donorId = await this.resolveReconciliationDonorId(

        hints,

        MEEZAN_BANK_NAME,

        row.docNo || String(row.rowIndex),

        {},

        userId,

      );



      const donation = await this.createReconciliationDonation(

        {

          rowIndex: row.rowIndex,

          serialNo: row.docNo,

          tranSeqNo: row.docNo,

          tranDate: row.bookingDate,

          effectDate: row.valueDate,

          tranDescription: row.description,

          stan: hints.descriptionRef || undefined,

          reference: hints.descriptionRef || undefined,

          depositAmount: row.creditAmount || 0,

        },

        hints,

        donorId,

        MEEZAN_BANK_NAME,

        userId,

      );



      return {

        ...base,

        status: "created",

        donationId: donation.id,

        ...(donorId != null ? { donorId } : {}),

      };

    } catch (error: any) {

      this.logger.warn(

        `Meezan reconciliation row ${row.rowIndex} failed: ${error?.message || error}`,

      );

      return {

        ...base,

        status: "failed",

        reason: error?.message || "Processing failed",

      };

    }

  }



  private async donationAlreadyExists(

    hints: ReconciliationDonorHints,

    tranSeqNo?: string | null,

    reference?: string | null,

  ): Promise<boolean> {

    if (tranSeqNo) {

      const bySeq = await this.donationRepository.findOne({

        where: { tran_seq_no: tranSeqNo },

        select: ["id"],

      });

      if (bySeq) return true;

    }



    const ref = hints.descriptionRef || reference;

    if (ref) {

      const byTxn = await this.donationRepository.findOne({

        where: { transaction_id: ref },

        select: ["id"],

      });

      if (byTxn) return true;

      const byRef = await this.donationRepository.findOne({

        where: { reference_no: ref },

        select: ["id"],

      });

      if (byRef) return true;

    }



    return false;

  }



  private async resolveReconciliationDonorId(

    hints: ReconciliationDonorHints,

    bankName: string,

    rowKey: string,

    extras: { transferAccountNo?: string },

    userId?: number,

  ): Promise<number | null> {

    if (!hints.donorName?.trim()) {

      return null;

    }

    const donor = await this.findOrCreateReconciliationDonor(

      hints,

      bankName,

      rowKey,

      extras,

      userId,

    );

    return donor.id;

  }



  private async findOrCreateReconciliationDonor(

    hints: ReconciliationDonorHints,

    bankName: string,

    rowKey: string,

    extras: { transferAccountNo?: string },

    userId?: number,

  ): Promise<Donor> {

    const ref = hints.descriptionRef || rowKey;



    if (ref) {

      const linked = await this.donationRepository.findOne({

        where: [{ transaction_id: ref }, { reference_no: ref }],

        relations: ["donor"],

      });

      if (linked?.donor) return linked.donor;

    }



    const seqKey = rowKey || randomUUID();

    const email = `recon.${bankName}.${seqKey}@donor.internal`;

    const phone = `RECON-${seqKey}`.slice(0, 20);

    const address = hints.branch?.trim() || null;



    const donorNotes = [

      hints.bank ? `Bank: ${hints.bank}` : null,

      hints.accountLastDigits ? `A/C last digits: ${hints.accountLastDigits}` : null,

      extras.transferAccountNo ? `Transfer acct: ${extras.transferAccountNo}` : null,

    ]

      .filter(Boolean)

      .join("; ");



    const donor = this.donorRepository.create({

      donor_type: DonorType.INDIVIDUAL,

      email,

      phone,

      name: hints.donorName!.trim(),

      source: "reconciliation",

      is_active: true,

      address,

      country: address ? "Pakistan" : null,

      notes: donorNotes || "Created from bank reconciliation import",

      ...(userId ? { created_by: { id: userId } as any } : {}),

    });



    donor.geo_search = buildDonorGeoSearch({

      country: donor.country,

      city: null,

      address: donor.address,

    });



    return this.donorRepository.save(donor);

  }



  private async createReconciliationDonation(

    row: DonationRowInput,

    hints: ReconciliationDonorHints,

    donorId: number | null,

    bankName: string,

    userId?: number,

  ): Promise<Donation> {

    const amount = Math.round(row.depositAmount || 0);

    const descriptionRef =

      hints.descriptionRef || row.reference || row.tranSeqNo || null;

    const donorAddress = hints.branch?.trim() || null;



    const donation = this.donationRepository.create({

      donor_id: donorId,

      amount,

      paid_amount: amount,

      date: row.tranDate || new Date(),

      effect_date: row.effectDate,

      tran_seq_no: row.tranSeqNo || null,

      tran_type: row.tranType || null,

      tran_description: row.tranDescription,

      stan: row.stan || hints.descriptionRef || null,

      reference_no: row.reference || hints.descriptionRef || null,

      transaction_id: descriptionRef,

      bank_name: hints.bank || bankName.toUpperCase(),

      bank: bankName,

      donation_source: RECONCILIATION_DONATION_SOURCE,

      donation_method: RECONCILIATION_DONATION_METHOD,

      donation_type: "general",

      status: "completed",

      currency: "PKR",

      ...(userId ? { created_by: { id: userId } as any } : {}),

    });



    donation.geo_search = buildDonationGeoSearch({

      country: donorAddress ? "Pakistan" : null,

      city: null,

      address: donorAddress,

    });



    return this.donationRepository.save(donation);

  }



  private chunk<T>(items: T[], size: number): T[][] {

    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += size) {

      batches.push(items.slice(i, i + size));

    }

    return batches;

  }

}


