import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateRegionDto } from "./dto/create-region.dto";
import { UpdateRegionDto } from "./dto/update-region.dto";
import { Region } from "./entities/region.entity";
import { Country } from "../countries/entities/country.entity";

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createRegionDto: CreateRegionDto): Promise<Region> {
    try {
      // Validate that country exists
      const country = await this.countryRepository.findOne({
        where: { id: createRegionDto.country_id },
      });

      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createRegionDto.country_id} not found`,
        );
      }

      // Check if region with same name already exists in the country
      const existingRegion = await this.regionRepository.findOne({
        where: {
          name: createRegionDto.name,
          country_id: createRegionDto.country_id,
        },
      });

      if (existingRegion) {
        throw new ConflictException(
          "Region with this name already exists in this country",
        );
      }

      const region = this.regionRepository.create(createRegionDto);
      return await this.regionRepository.save(region);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to create region: ${error.message}`);
    }
  }

  async findAll(): Promise<Region[]> {
    try {
      return await this.regionRepository.find({
        where: { is_active: true },
        order: { name: "ASC" },
        relations: ["country", "cities"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve regions: ${error.message}`);
    }
  }

  async findByCountry(countryId: number): Promise<Region[]> {
    try {
      return await this.regionRepository.find({
        where: { country_id: countryId, is_active: true },
        order: { name: "ASC" },
        relations: ["country", "cities"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve regions for country: ${error.message}`,
      );
    }
  }

  async findOne(id: number): Promise<Region> {
    try {
      const region = await this.regionRepository.findOne({
        where: { id },
        relations: ["country", "cities", "cities.routes"],
      });

      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found`);
      }

      return region;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve region: ${error.message}`);
    }
  }

  async update(id: number, updateRegionDto: UpdateRegionDto): Promise<Region> {
    try {
      const region = await this.regionRepository.findOne({ where: { id } });

      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found`);
      }

      // Validate country if updating country_id
      if (updateRegionDto.country_id) {
        const country = await this.countryRepository.findOne({
          where: { id: updateRegionDto.country_id },
        });

        if (!country) {
          throw new NotFoundException(
            `Country with ID ${updateRegionDto.country_id} not found`,
          );
        }
      }

      // Check for conflicts if updating name
      if (updateRegionDto.name) {
        const existingRegion = await this.regionRepository.findOne({
          where: {
            name: updateRegionDto.name,
            country_id: updateRegionDto.country_id || region.country_id,
          },
        });

        if (existingRegion && existingRegion.id !== id) {
          throw new ConflictException(
            "Region with this name already exists in this country",
          );
        }
      }

      await this.regionRepository.update(id, updateRegionDto);
      return await this.regionRepository.findOne({ where: { id } });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update region: ${error.message}`);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const region = await this.regionRepository.findOne({ where: { id } });

      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found`);
      }

      // Soft delete by setting is_active to false
      await this.regionRepository.update(id, { is_active: false });

      return { message: "Region deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to deactivate region: ${error.message}`);
    }
  }
}
