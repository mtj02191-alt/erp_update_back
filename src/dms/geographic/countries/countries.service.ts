import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { Country } from "./entities/country.entity";

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createCountryDto: CreateCountryDto): Promise<Country> {
    try {
      // Check if country with same name or code already exists
      const existingCountry = await this.countryRepository.findOne({
        where: [
          { name: createCountryDto.name },
          { code: createCountryDto.code },
        ],
      });

      if (existingCountry) {
        throw new ConflictException(
          "Country with this name or code already exists",
        );
      }

      const country = this.countryRepository.create(createCountryDto);
      return await this.countryRepository.save(country);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to create country: ${error.message}`);
    }
  }

  async findAll(): Promise<Country[]> {
    try {
      return await this.countryRepository.find({
        where: { is_active: true },
        order: { name: "ASC" },
        relations: ["regions"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve countries: ${error.message}`);
    }
  }

  async findOne(id: number): Promise<Country> {
    try {
      const country = await this.countryRepository.findOne({
        where: { id },
        relations: ["regions", "regions.cities"],
      });

      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      return country;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve country: ${error.message}`);
    }
  }

  async update(
    id: number,
    updateCountryDto: UpdateCountryDto,
  ): Promise<Country> {
    try {
      const country = await this.countryRepository.findOne({ where: { id } });

      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      // Check for conflicts if updating name or code
      if (updateCountryDto.name || updateCountryDto.code) {
        const existingCountry = await this.countryRepository.findOne({
          where: [
            { name: updateCountryDto.name },
            { code: updateCountryDto.code },
          ],
        });

        if (existingCountry && existingCountry.id !== id) {
          throw new ConflictException(
            "Country with this name or code already exists",
          );
        }
      }

      await this.countryRepository.update(id, updateCountryDto);
      return await this.countryRepository.findOne({ where: { id } });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update country: ${error.message}`);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const country = await this.countryRepository.findOne({ where: { id } });

      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      // Soft delete by setting is_active to false
      await this.countryRepository.update(id, { is_active: false });

      return { message: "Country deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to deactivate country: ${error.message}`);
    }
  }
}
