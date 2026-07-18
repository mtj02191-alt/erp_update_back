import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateDistrictDto } from "./dto/create-district.dto";
import { UpdateDistrictDto } from "./dto/update-district.dto";
import { District } from "./entities/district.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";

@Injectable()
export class DistrictsService {
  constructor(
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createDistrictDto: CreateDistrictDto): Promise<District> {
    try {
      // Validate that region exists
      const region = await this.regionRepository.findOne({
        where: { id: createDistrictDto.region_id },
      });

      if (!region) {
        throw new NotFoundException(
          `Region with ID ${createDistrictDto.region_id} not found`,
        );
      }

      // Validate that country exists
      const country = await this.countryRepository.findOne({
        where: { id: createDistrictDto.country_id },
      });

      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createDistrictDto.country_id} not found`,
        );
      }

      // Check if district with same name already exists in the region
      const existingDistrict = await this.districtRepository.findOne({
        where: {
          name: createDistrictDto.name,
          region_id: createDistrictDto.region_id,
        },
      });

      if (existingDistrict) {
        throw new ConflictException(
          "District with this name already exists in this region",
        );
      }

      const district = this.districtRepository.create(createDistrictDto);
      return await this.districtRepository.save(district);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to create district: ${error.message}`);
    }
  }

  async findAll(): Promise<District[]> {
    try {
      return await this.districtRepository.find({
        where: { is_active: true },
        order: { name: "ASC" },
        relations: ["region", "country", "tehsils"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve districts: ${error.message}`);
    }
  }

  async findByRegion(regionId: number): Promise<District[]> {
    try {
      return await this.districtRepository.find({
        where: { region_id: regionId, is_active: true },
        order: { name: "ASC" },
        relations: ["region", "country", "tehsils"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve districts for region: ${error.message}`,
      );
    }
  }

  async findByCountry(countryId: number): Promise<District[]> {
    try {
      return await this.districtRepository.find({
        where: { country_id: countryId, is_active: true },
        order: { name: "ASC" },
        relations: ["region", "country", "tehsils"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve districts for country: ${error.message}`,
      );
    }
  }

  async findOne(id: number): Promise<District> {
    try {
      const district = await this.districtRepository.findOne({
        where: { id },
        relations: ["region", "country", "tehsils", "tehsils.cities"],
      });

      if (!district) {
        throw new NotFoundException(`District with ID ${id} not found`);
      }

      return district;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve district: ${error.message}`);
    }
  }

  async update(
    id: number,
    updateDistrictDto: UpdateDistrictDto,
  ): Promise<District> {
    try {
      const district = await this.districtRepository.findOne({ where: { id } });

      if (!district) {
        throw new NotFoundException(`District with ID ${id} not found`);
      }

      // Validate region if updating region_id
      if (updateDistrictDto.region_id) {
        const region = await this.regionRepository.findOne({
          where: { id: updateDistrictDto.region_id },
        });

        if (!region) {
          throw new NotFoundException(
            `Region with ID ${updateDistrictDto.region_id} not found`,
          );
        }
      }

      // Validate country if updating country_id
      if (updateDistrictDto.country_id) {
        const country = await this.countryRepository.findOne({
          where: { id: updateDistrictDto.country_id },
        });

        if (!country) {
          throw new NotFoundException(
            `Country with ID ${updateDistrictDto.country_id} not found`,
          );
        }
      }

      // Check for conflicts if updating name
      if (updateDistrictDto.name) {
        const existingDistrict = await this.districtRepository.findOne({
          where: {
            name: updateDistrictDto.name,
            region_id: updateDistrictDto.region_id || district.region_id,
          },
        });

        if (existingDistrict && existingDistrict.id !== id) {
          throw new ConflictException(
            "District with this name already exists in this region",
          );
        }
      }

      await this.districtRepository.update(id, updateDistrictDto);
      return await this.districtRepository.findOne({ where: { id } });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update district: ${error.message}`);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const district = await this.districtRepository.findOne({ where: { id } });

      if (!district) {
        throw new NotFoundException(`District with ID ${id} not found`);
      }

      // Soft delete by setting is_active to false
      await this.districtRepository.update(id, { is_active: false });

      return { message: "District deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to deactivate district: ${error.message}`);
    }
  }
}
