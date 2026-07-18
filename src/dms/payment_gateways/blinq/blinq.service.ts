import { Injectable, HttpException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateBlinqDto } from "./dto/create-blinq.dto";
import { UpdateBlinqDto } from "./dto/update-blinq.dto";
import { Donation } from "src/donations/entities/donation.entity";
import axios from "axios";

@Injectable()
export class BlinqService {
  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
  ) {}

  create(createBlinqDto: CreateBlinqDto) {
    return "This action adds a new blinq";
  }

  findAll() {
    return `This action returns all blinq`;
  }

  findOne(id: number) {
    return `This action returns a #${id} blinq`;
  }

  update(id: number, updateBlinqDto: UpdateBlinqDto) {
    return `This action updates a #${id} blinq`;
  }

  remove(id: number) {
    return `This action removes a #${id} blinq`;
  }

  // Get all donations with donation_method = 'blinq'
  async getBlinqDonations(status?: string) {
    try {
      const queryBuilder = this.donationRepository
        .createQueryBuilder("donation")
        .where("donation.donation_method = :method", { method: "blinq" })
        .leftJoinAndSelect("donation.donor", "donor")
        .orderBy("donation.created_at", "DESC");

      // Add status filter if provided
      if (status) {
        queryBuilder.andWhere("donation.status = :status", { status });
      }

      const donations = await queryBuilder.getMany();

      // Calculate total amount for blinq donations
      const totalAmount = donations.reduce(
        (sum, donation) => sum + (donation.amount || 0),
        0,
      );

      return {
        data: donations,
        total: donations.length,
        totalAmount,
        status: status || "all",
      };
    } catch (error) {
      throw new Error(`Failed to retrieve Blinq donations: ${error.message}`);
    }
  }

  // Get Blinq donation statistics
  async getBlinqStats() {
    try {
      const donations = await this.donationRepository.find({
        where: { donation_method: "blinq" },
      });

      const stats = {
        total: donations.length,
        completed: donations.filter((d) => d.status === "completed").length,
        pending: donations.filter((d) => d.status === "pending").length,
        failed: donations.filter((d) => d.status === "failed").length,
        registered: donations.filter((d) => d.status === "registered").length,
        totalAmount: donations.reduce(
          (sum, donation) => sum + (donation.amount || 0),
          0,
        ),
        completedAmount: donations
          .filter((d) => d.status === "completed")
          .reduce((sum, donation) => sum + (donation.amount || 0), 0),
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to retrieve Blinq statistics: ${error.message}`);
    }
  }

  // ============================================
  // BLINQ API INTEGRATION METHODS
  // ============================================

  // Get Blinq authentication token
  async getBlinqAuthToken(): Promise<string> {
    try {
      const blinqUrl = "https://api.blinq.pk/";
      const authPayload = {
        ClientID: process.env.BLINQ_ID?.toString(),
        ClientSecret: process.env.BLINQ_PASS?.toString(),
      };

      if (!authPayload.ClientID || !authPayload.ClientSecret) {
        throw new HttpException("Blinq credentials not configured", 500);
      }

      const authResponse = await axios.post(
        `${blinqUrl}api/Auth`,
        authPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const authToken = authResponse?.headers?.token;
      console.log("Authtoken", authToken);
      if (!authToken) {
        throw new HttpException(
          "Failed to get Blinq authentication token",
          401,
        );
      }

      return authToken;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Blinq authentication failed: ${error.message}`,
        500,
      );
    }
  }

  // Check Blinq invoice status
  async checkInvoiceStatus(
    paymentCode: string,
    authToken?: string,
  ): Promise<any> {
    try {
      const blinqUrl = "https://api.blinq.pk/";
      const token = authToken || (await this.getBlinqAuthToken());

      const invoiceStatusData = await axios.get(
        `${blinqUrl}invoice/getstatus?PaymentCode=${paymentCode}`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        },
      );

      // Parse the Blinq response format
      const response = invoiceStatusData?.data;
      const responseDetail = response?.ResponseDetail?.[0];

      if (!responseDetail) {
        return {
          success: false,
          paymentCode,
          status: null,
          error: "No invoice details found",
          rawResponse: response,
        };
      }

      // Extract key information from Blinq response with rounded amounts
      const invoiceData = {
        invoiceNumber: responseDetail.InvoiceNumber,
        invoiceStatus: responseDetail.InvoiceStatus,
        invoiceAmount:
          Math.round(parseFloat(responseDetail.InvoiceAmount || "0") * 100) /
          100, // Round to 2 decimal places
        invoiceAmountPaid:
          Math.round(
            parseFloat(responseDetail.InvoiceAmountPaid || "0") * 100,
          ) / 100, // Round to 2 decimal places
        paymentCode: responseDetail.PaymentCode,
        paymentMode: responseDetail.PaymentMode,
        paymentBank: responseDetail.PaymentBank,
        invoicePaidOn: responseDetail.InvoicePaidOn,
        invoiceIssueDate: responseDetail.InvoiceIssueDate,
        invoiceDuedate: responseDetail.InvoiceDuedate,
        invoiceLink: responseDetail.InvoiceLink,
        clickToPayUrl: responseDetail.ClickToPayUrl,
      };

      return {
        success: true,
        paymentCode,
        status: responseDetail.InvoiceStatus,
        amount: invoiceData.invoiceAmount,
        amountPaid: invoiceData.invoiceAmountPaid,
        paymentMode: invoiceData.paymentMode,
        paymentBank: invoiceData.paymentBank,
        paidOn: invoiceData.invoicePaidOn,
        invoiceData,
        rawResponse: response,
      };
    } catch (error) {
      console.error(
        `Error checking invoice status for ${paymentCode}:`,
        error.message,
      );
      return {
        success: false,
        paymentCode,
        status: null,
        error: error.message,
        rawResponse: null,
      };
    }
  }

  // Get paid invoices for a date range
  async getPaidInvoices(
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<any> {
    try {
      const blinqUrl = "https://api.blinq.pk/";
      const token = authToken || (await this.getBlinqAuthToken());

      const paidInvoicesData = await axios.get(
        `${blinqUrl}invoice/getpaidinvoices?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        },
      );

      const paidInvoices = paidInvoicesData?.data?.ResponseDetail || [];

      return {
        success: true,
        startDate,
        endDate,
        count: paidInvoices.length,
        invoices: paidInvoices,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get paid invoices: ${error.message}`,
        500,
      );
    }
  }

  // Create Blinq invoice
  async createBlinqInvoice(
    donation: Donation,
    authToken?: string,
  ): Promise<any> {
    try {
      const blinqUrl = "https://api.blinq.pk/";
      const token = authToken || (await this.getBlinqAuthToken());

      // Calculate dates
      const currentDate = new Date();
      const dueDate = new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later
      const validityDate = new Date(
        currentDate.getFullYear() + 1,
        currentDate.getMonth(),
        currentDate.getDate(),
      ); // 1 year later

      // Format dates to YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split("T")[0];

      const invoicePayload = [
        {
          InvoiceNumber: donation.id.toString(),
          InvoiceAmount: donation.amount.toString(),
          InvoiceDueDate: formatDate(dueDate),
          ValidityDate: formatDate(validityDate),
          InvoiceType: "Service",
          IssueDate: formatDate(currentDate),
        },
      ];

      const blinqInvoice = await axios.post(
        `${blinqUrl}invoice/create`,
        invoicePayload,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        },
      );

      return {
        success: true,
        donationId: donation.id,
        invoiceData: blinqInvoice?.data,
        paymentCode: blinqInvoice?.data?.ResponseDetail?.[0]?.PaymentCode,
        clickToPayUrl: blinqInvoice?.data?.ResponseDetail?.[0]?.ClickToPayUrl,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create Blinq invoice: ${error.message}`,
        500,
      );
    }
  }

  // Get comprehensive Blinq invoice information
  async getInvoiceInfo(paymentCode: string, authToken?: string): Promise<any> {
    try {
      const token = authToken || (await this.getBlinqAuthToken());

      // Get invoice status
      const statusInfo = await this.checkInvoiceStatus(paymentCode, token);

      return {
        success: true,
        paymentCode,
        status: statusInfo.status,
        details: statusInfo.rawResponse,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get invoice info: ${error.message}`,
        500,
      );
    }
  }

  // Simple and efficient Blinq sync - Accept start and end dates as parameters
  async syncBlinqDonations(startDate?: string, endDate?: string): Promise<any> {
    try {
      console.log("🔄 Starting simple Blinq sync...");

      // Step 1: Use provided dates or default to current date
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date();

      console.log(
        `📅 Date range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`,
      );

      // Step 2: Get all paid invoices from Blinq for this date range
      const blinqInvoices = await this.getPaidInvoices(start, end);

      if (!blinqInvoices.invoices || blinqInvoices.invoices.length === 0) {
        return {
          success: true,
          message: "No Blinq invoices found for the date range",
          results: { updated: 0, errors: 0, details: [] },
        };
      }

      console.log(
        `📊 Found ${blinqInvoices.invoices.length} Blinq invoices to process`,
      );

      const syncResults = {
        totalInvoices: blinqInvoices.invoices.length,
        updated: 0,
        errors: 0,
        details: [] as any[],
      };

      // Step 4: Loop through Blinq invoices and update database
      for (const invoice of blinqInvoices.invoices) {
        try {
          // Convert InvoiceNumber to donation ID
          const donationId = parseInt(invoice.InvoiceNumber);

          if (isNaN(donationId)) {
            syncResults.errors++;
            syncResults.details.push({
              invoiceNumber: invoice.InvoiceNumber,
              status: "error",
              error: "Invalid invoice number",
            });
            continue;
          }

          console.log(
            `🔍 Processing invoice ${invoice.InvoiceNumber} (Donation ID: ${donationId})`,
          );

          // Find donation in database
          const donation = await this.donationRepository.findOne({
            where: { id: donationId },
          });

          if (!donation) {
            syncResults.errors++;
            syncResults.details.push({
              donationId,
              invoiceNumber: invoice.InvoiceNumber,
              status: "error",
              error: "Donation not found in database",
            });
            continue;
          }

          // Map Blinq status to our status
          let newStatus = donation.status;
          switch (invoice.InvoiceStatus?.toUpperCase()) {
            case "PAID":
              newStatus = "completed";
              break;
            case "PENDING":
              newStatus = "pending";
              break;
            case "FAILED":
            case "CANCELLED":
              newStatus = "failed";
              break;
            case "REGISTERED":
              newStatus = "registered";
              break;
          }

          // Prepare update data
          const updateData: any = {};
          const updateMessages = [];

          if (newStatus !== donation.status) {
            updateData.status = newStatus;
            updateMessages.push(`Status: ${newStatus}`);
          }

          if (invoice.InvoiceAmount) {
            const roundedAmount = Math.round(parseFloat(invoice.InvoiceAmount));
            if (roundedAmount !== donation.amount) {
              updateData.amount = roundedAmount;
              updateMessages.push(`Amount: ${roundedAmount}`);
            }
          }

          if (invoice.InvoiceAmountPaid) {
            const roundedPaidAmount = Math.round(
              parseFloat(invoice.InvoiceAmountPaid),
            );
            if (roundedPaidAmount !== donation.paid_amount) {
              updateData.paid_amount = roundedPaidAmount;
              updateMessages.push(`Paid Amount: ${roundedPaidAmount}`);
            }
          }

          // Update if there are changes
          if (Object.keys(updateData).length > 0) {
            updateData.err_msg = `Synced from Blinq - ${updateMessages.join(", ")}`;

            await this.donationRepository.update(donationId, updateData);

            syncResults.updated++;
            syncResults.details.push({
              donationId,
              invoiceNumber: invoice.InvoiceNumber,
              oldStatus: donation.status,
              newStatus: newStatus,
              oldAmount: donation.amount,
              newAmount: updateData.amount || donation.amount,
              oldPaidAmount: donation.paid_amount,
              newPaidAmount: updateData.paid_amount || donation.paid_amount,
              blinqStatus: invoice.InvoiceStatus,
              status: "updated",
            });

            console.log(
              `✅ Updated donation ${donationId}: ${updateMessages.join(", ")}`,
            );
          } else {
            syncResults.details.push({
              donationId,
              invoiceNumber: invoice.InvoiceNumber,
              status: "no_change",
              reason: "Already up to date",
            });
          }
        } catch (error) {
          syncResults.errors++;
          syncResults.details.push({
            invoiceNumber: invoice.InvoiceNumber,
            status: "error",
            error: error.message,
          });

          console.error(
            `❌ Error processing invoice ${invoice.InvoiceNumber}:`,
            error.message,
          );
        }
      }

      console.log("✅ Simple Blinq sync completed!");
      console.log(
        `📊 Results: Updated: ${syncResults.updated}, Errors: ${syncResults.errors}`,
      );

      return {
        success: true,
        message: "Simple Blinq sync completed",
        dateRange: { startDate, endDate },
        results: syncResults,
      };
    } catch (error) {
      console.error("❌ Simple Blinq sync error:", error);
      throw new HttpException(
        `Failed to sync Blinq donations: ${error.message}`,
        500,
      );
    }
  }
}
