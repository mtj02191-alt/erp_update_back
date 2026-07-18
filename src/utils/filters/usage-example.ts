import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  applyCommonFilters,
  createFilteredQuery,
  FilterPayload,
} from "./common-filter.util";
import { Donation } from "../../donations/entities/donation.entity";

@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
  ) {}

  // Example 1: Using applyCommonFilters with existing query
  async findDonationsWithFilters(filters: FilterPayload) {
    // Define searchable fields for donations
    const searchFields = [
      "donor_name",
      "donor_email",
      "item_name",
      "description",
    ];

    // Start with your base query
    const query = this.donationRepository
      .createQueryBuilder("donation")
      .leftJoin("donation.user", "user")
      .where("donation.isActive = :isActive", { isActive: true });

    // Apply common filters (modifies the query in-place)
    applyCommonFilters(query, filters, searchFields, "donation");

    // You can continue adding more conditions
    query.andWhere("user.role = :role", { role: "donor" });

    // Execute the query
    return await query.getManyAndCount();
  }

  // Example 2: Using createFilteredQuery helper
  async findDonationsSimple(filters: FilterPayload) {
    const searchFields = ["donor_name", "donor_email", "item_name"];
    const relations = ["user", "project"];

    const query = createFilteredQuery(
      this.donationRepository,
      "donation",
      filters,
      searchFields,
      relations,
    );

    return await query.getManyAndCount();
  }

  // Example 3: Controller usage
  async findAllWithPagination(
    page: number = 1,
    pageSize: number = 10,
    filters: FilterPayload = {},
  ) {
    const searchFields = ["donor_name", "donor_email", "item_name"];

    const query = this.donationRepository.createQueryBuilder("donation");

    // Apply filters
    applyCommonFilters(query, filters, searchFields, "donation");

    // Apply pagination
    const skip = (page - 1) * pageSize;
    query.skip(skip).take(pageSize);

    // Apply sorting
    query.orderBy("donation.created_at", "DESC");

    const [data, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

// Example filter payloads:
const exampleFilters: FilterPayload = {
  search: "john", // Searches in donor_name, donor_email, item_name
  status: "completed", // donation.status = 'completed'
  donation_type: "zakat", // donation.donation_type = 'zakat'
  donation_method: "payfast", // donation.donation_method = 'payfast'
  start_date: "2024-01-01", // donation.date >= '2024-01-01'
  end_date: "2024-12-31", // donation.date <= '2024-12-31'
  // OR
  date: "2024-06-15", // donation.date = '2024-06-15' (exact match)
};
