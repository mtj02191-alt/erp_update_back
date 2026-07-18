import { Controller, Post, Get, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { DonationsService } from "./donations.service";
import { DonorService } from "../dms/donor/donor.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not } from "typeorm";
import { Donation } from "./entities/donation.entity";
import { Donor } from "../dms/donor/entities/donor.entity";

@Controller("donations/migration")
export class MigrationController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly donorService: DonorService,
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    @InjectRepository(Donor)
    private donorRepository: Repository<Donor>,
  ) {}

  /**
   * Step 1: Create donors from existing donations
   * GET /donations/migration/create-donors
   */
  @Post("create-donors")
  // async createDonorsFromDonations(@Res() res: Response) {
  //   try {
  //     console.log('🚀 Starting donor migration from donations...');

  //     // Get all donations with donor info
  //     const donations = await this.donationRepository
  //     .createQueryBuilder('d')
  //     .select(['d.id','d.donor_name','d.donor_email','d.donor_phone','d.city','d.country','d.address'])
  //     .where('d.donor_email IS NOT NULL')
  //     .andWhere("TRIM(d.donor_email) <> ''")
  //     .getMany();

  //     console.log(`📊 Found ${donations.length} donations with donor info`);

  //     const results = {
  //       total: donations.length,
  //       created: 0,
  //       skipped: 0,
  //       errors: 0,
  //       donors: [] as any[],
  //     };

  //     // Process each unique donor
  //     const processedDonors = new Map<string, number>(); // email+phone -> donor_id

  //     for (const donation of donations) {
  //       const { donor_email, donor_phone, donor_name, city, country, address } = donation;

  //       // Skip if missing required fields
  //       if (!donor_email || !donor_phone) {
  //         results.skipped++;
  //         console.log(`⚠️ Skipping donation ${donation.id}: missing email or phone`);
  //         continue;
  //       }

  //       // here just use auto increment id
  //       // Create unique key for donor
  //       const donorKey = `${donation.id}`;

  //       // Check if we've already processed this donor
  //       if (processedDonors.has(donorKey)) {
  //         results.skipped++;
  //         console.log(`✓ Donor already processed: ${donation.id}`);
  //         continue;
  //       }

  //       try {
  //         // Check if donor exists in database
  //         const existingDonor = await this.donorService.findByEmailAndPhone(
  //           donor_email,
  //           donor_phone
  //         );

  //         if (existingDonor) {
  //           results.skipped++;
  //           processedDonors.set(donorKey, existingDonor.id);
  //           console.log(`✓ Donor already exists: ${donor_email} (ID: ${existingDonor.id})`);
  //           continue;
  //         }

  //         // Create new donor
  //         const newDonor = await this.donorService.autoRegisterFromDonation({
  //           donor_name,
  //           donor_email,
  //           donor_phone,
  //           city,
  //           country,
  //           address,
  //         });

  //         if (newDonor) {
  //           results.created++;
  //           processedDonors.set(donorKey, newDonor.id);
  //           results.donors.push({
  //             id: newDonor.id,
  //             email: newDonor.email,
  //             phone: newDonor.phone,
  //             name: newDonor.name,
  //           });
  //           console.log(`✅ Created donor: ${donor_email} (ID: ${newDonor.id})`);
  //         } else {
  //           results.errors++;
  //           console.error(`❌ Failed to create donor: ${donor_email}`);
  //         }
  //       } catch (error) {
  //         results.errors++;
  //         console.error(`❌ Error processing donor ${donor_email}:`, error.message);
  //       }
  //     }

  //     console.log('✅ Donor migration completed!');
  //     console.log(`📊 Results: Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       message: 'Donor migration completed',
  //       results,
  //     });
  //   } catch (error) {
  //     console.error('❌ Migration error:', error);
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: error.message,
  //       error: error.stack,
  //     });
  //   }
  // }

  /**
   * Step 2: Link donations to donors using donor_id
   * POST /donations/migration/link-donations
   */
  @Post("link-donations")
  // async linkDonationsToDonors(@Res() res: Response) {
  //   try {
  //     console.log('🔗 Starting donation linking...');

  //     // Get all donations without donor_id but with donor_email
  //     const donations = await this.donationRepository.find({
  //       where: { donor_id: null },
  //     });

  //     console.log(`📊 Found ${donations.length} donations to link`);

  //     const results = {
  //       total: donations.length,
  //       linked: 0,
  //       skipped: 0,
  //       errors: 0,
  //       details: [] as any[],
  //     };

  //     for (const donation of donations) {
  //       const { id, donor_email, donor_phone } = donation;

  //       // Skip if missing required fields
  //       if (!donor_email || !donor_phone) {
  //         results.skipped++;
  //         console.log(`⚠️ Skipping donation ${id}: missing email or phone`);
  //         continue;
  //       }

  //       try {
  //         // Find donor by email and phone
  //         const donor = await this.donorService.findByEmailAndPhone(
  //           donor_email,
  //           donor_phone
  //         );

  //         if (donor) {
  //           // Update donation with donor_id
  //           await this.donationRepository.update(id, { donor_id: donor.id });
  //           results.linked++;
  //           results.details.push({
  //             donation_id: id,
  //             donor_id: donor.id,
  //             donor_email: donor.email,
  //           });
  //           console.log(`✅ Linked donation ${id} to donor ${donor.id}`);
  //         } else {
  //           results.skipped++;
  //           console.log(`⚠️ No donor found for donation ${id}: ${donor_email}`);
  //         }
  //       } catch (error) {
  //         results.errors++;
  //         console.error(`❌ Error linking donation ${id}:`, error.message);
  //       }
  //     }

  //     console.log('✅ Donation linking completed!');
  //     console.log(`📊 Results: Linked: ${results.linked}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       message: 'Donation linking completed',
  //       results,
  //     });
  //   } catch (error) {
  //     console.error('❌ Linking error:', error);
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: error.message,
  //       error: error.stack,
  //     });
  //   }
  // }

  /**
   * Step 3: Get migration status/report
   * GET /donations/migration/status
   */
  @Get("status")
  async getMigrationStatus(@Res() res: Response) {
    try {
      // Count donations
      const totalDonations = await this.donationRepository.count();
      const donationsWithDonorId = await this.donationRepository.count({
        where: { donor_id: Not(null) },
      });
      const donationsWithoutDonorId = totalDonations - donationsWithDonorId;

      // Count donors
      const totalDonors = await this.donorRepository.count();
      const donorsWithPassword = await this.donorRepository.count({
        where: { password: Not(null) },
      });
      const donorsWithoutPassword = totalDonors - donorsWithPassword;

      // Get unique donor emails in donations
      const uniqueDonorEmails = await this.donationRepository
        .createQueryBuilder("donation")
        .select("DISTINCT donation.donor_email", "email")
        .where("donation.donor_email IS NOT NULL")
        .getRawMany();

      const report = {
        donations: {
          total: totalDonations,
          with_donor_id: donationsWithDonorId,
          without_donor_id: donationsWithoutDonorId,
          migration_percentage:
            ((donationsWithDonorId / totalDonations) * 100).toFixed(2) + "%",
        },
        donors: {
          total: totalDonors,
          with_password: donorsWithPassword,
          without_password: donorsWithoutPassword,
          auto_registered: donorsWithoutPassword,
        },
        unique_donors_in_donations: uniqueDonorEmails.length,
        migration_complete: donationsWithoutDonorId === 0,
      };

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Migration status retrieved",
        report,
      });
    } catch (error) {
      console.error("❌ Status error:", error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}
