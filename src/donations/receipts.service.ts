import { BadRequestException, Injectable } from "@nestjs/common";
import { Donation } from "./entities/donation.entity";
import { DonationReceiptsService } from "src/email/donationReceipts.service";

@Injectable()
export class DonationsReceiptsService {
  constructor(
    private readonly donationReceiptsService: DonationReceiptsService,
  ) {}

  /**
   * Sends an in-kind donation receipt email for the given donation.
   * This service intentionally does not create templates; it delegates to the email receipt service.
   */
  async sendDonationReceipt(donation: any): Promise<boolean> {
    const donor = donation.donor;
    if (!donor?.email) {
      throw new BadRequestException("Donor email not found for this donation");
    }

    const donorName =
      donor.name || donor.company_name || donor.first_name || "Valued Donor";

    const products =
      donation?.in_kind_items?.map((item: any) => ({
        name: item.item_name,
        qty: item.quantity,
        amount: item.estimated_value ?? 0,
      })) || [];

    const data = {
      receiptNo: donation.ref || donation.id,
      location: donation.city || donor.city || "-",
      project: donation.project_name || "-",
      libraryAccount: "-",
      donorName: donorName,
      address: donor.address || "-",
      donorBank: donation.bank_name || "-",
      unrestrictedAccount: "-",
      narration: "-",
      receiptDate: donation.date ? String(donation.date) : "-",
      store: "-",
      activity: donation.donation_type || "-",
      donationType: donation.donation_type || "-",
      contactNo: donor.phone || "-",
      cnic: donor.cnic || "-",
      bankAccount:
        donation.bank ||
        donation.cheque_number ||
        donation.transaction_id ||
        "-",
    };

    const logoUrl = process.env.DONATION_RECEIPT_LOGO_URL || "";

    return this.donationReceiptsService.sendDonationInKindReceipt({
      donorEmail: donor.email,
      donorName,
      donationId: donation.id,
      amount: donation.amount,
      currency: donation.currency,
      logoUrl,
      data,
      products,
    });
  }
}
