import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateTehsilDto } from "./dto/create-tehsil.dto";
import { UpdateTehsilDto } from "./dto/update-tehsil.dto";
import { Tehsil } from "./entities/tehsil.entity";
import { District } from "../districts/entities/district.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";

@Injectable()
export class TehsilsService {
  constructor(
    @InjectRepository(Tehsil)
    private readonly tehsilRepository: Repository<Tehsil>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createTehsilDto: CreateTehsilDto): Promise<Tehsil> {
    try {
      // Validate that district exists
      const district = await this.districtRepository.findOne({
        where: { id: createTehsilDto.district_id },
      });

      if (!district) {
        throw new NotFoundException(
          `District with ID ${createTehsilDto.district_id} not found`,
        );
      }

      // Validate that region exists
      const region = await this.regionRepository.findOne({
        where: { id: createTehsilDto.region_id },
      });

      if (!region) {
        throw new NotFoundException(
          `Region with ID ${createTehsilDto.region_id} not found`,
        );
      }

      // Validate that country exists
      const country = await this.countryRepository.findOne({
        where: { id: createTehsilDto.country_id },
      });

      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createTehsilDto.country_id} not found`,
        );
      }

      // Check if tehsil with same name already exists in the district
      const existingTehsil = await this.tehsilRepository.findOne({
        where: {
          name: createTehsilDto.name,
          district_id: createTehsilDto.district_id,
        },
      });

      if (existingTehsil) {
        throw new ConflictException(
          "Tehsil with this name already exists in this district",
        );
      }

      const tehsil = this.tehsilRepository.create(createTehsilDto);
      return await this.tehsilRepository.save(tehsil);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to create tehsil: ${error.message}`);
    }
  }

  async findAll(): Promise<Tehsil[]> {
    try {
      return await this.tehsilRepository.find({
        where: { is_active: true },
        order: { name: "ASC" },
        relations: ["district", "region", "country"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve tehsils: ${error.message}`);
    }
  }

  async findByDistrict(districtId: number): Promise<Tehsil[]> {
    try {
      return await this.tehsilRepository.find({
        where: { district_id: districtId, is_active: true },
        order: { name: "ASC" },
        relations: ["district", "region", "country"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve tehsils for district: ${error.message}`,
      );
    }
  }

  async findByRegion(regionId: number): Promise<Tehsil[]> {
    try {
      return await this.tehsilRepository.find({
        where: { region_id: regionId, is_active: true },
        order: { name: "ASC" },
        relations: ["district", "region", "country"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve tehsils for region: ${error.message}`,
      );
    }
  }

  async findByCountry(countryId: number): Promise<Tehsil[]> {
    try {
      return await this.tehsilRepository.find({
        where: { country_id: countryId, is_active: true },
        order: { name: "ASC" },
        relations: ["district", "region", "country"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve tehsils for country: ${error.message}`,
      );
    }
  }

  async findOne(id: number): Promise<Tehsil> {
    try {
      const tehsil = await this.tehsilRepository.findOne({
        where: { id },
        relations: ["district", "region", "country", "cities"],
      });

      if (!tehsil) {
        throw new NotFoundException(`Tehsil with ID ${id} not found`);
      }

      return tehsil;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve tehsil: ${error.message}`);
    }
  }

  async update(id: number, updateTehsilDto: UpdateTehsilDto): Promise<Tehsil> {
    try {
      const tehsil = await this.tehsilRepository.findOne({ where: { id } });

      if (!tehsil) {
        throw new NotFoundException(`Tehsil with ID ${id} not found`);
      }

      // Validate district if updating district_id
      if (updateTehsilDto.district_id) {
        const district = await this.districtRepository.findOne({
          where: { id: updateTehsilDto.district_id },
        });

        if (!district) {
          throw new NotFoundException(
            `District with ID ${updateTehsilDto.district_id} not found`,
          );
        }
      }

      // Validate region if updating region_id
      if (updateTehsilDto.region_id) {
        const region = await this.regionRepository.findOne({
          where: { id: updateTehsilDto.region_id },
        });

        if (!region) {
          throw new NotFoundException(
            `Region with ID ${updateTehsilDto.region_id} not found`,
          );
        }
      }

      // Validate country if updating country_id
      if (updateTehsilDto.country_id) {
        const country = await this.countryRepository.findOne({
          where: { id: updateTehsilDto.country_id },
        });

        if (!country) {
          throw new NotFoundException(
            `Country with ID ${updateTehsilDto.country_id} not found`,
          );
        }
      }

      // Check for conflicts if updating name
      if (updateTehsilDto.name) {
        const existingTehsil = await this.tehsilRepository.findOne({
          where: {
            name: updateTehsilDto.name,
            district_id: updateTehsilDto.district_id || tehsil.district_id,
          },
        });

        if (existingTehsil && existingTehsil.id !== id) {
          throw new ConflictException(
            "Tehsil with this name already exists in this district",
          );
        }
      }

      await this.tehsilRepository.update(id, updateTehsilDto);
      return await this.tehsilRepository.findOne({ where: { id } });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update tehsil: ${error.message}`);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const tehsil = await this.tehsilRepository.findOne({ where: { id } });

      if (!tehsil) {
        throw new NotFoundException(`Tehsil with ID ${id} not found`);
      }

      // Soft delete by setting is_active to false
      await this.tehsilRepository.update(id, { is_active: false });

      return { message: "Tehsil deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to deactivate tehsil: ${error.message}`);
    }
  }
}
