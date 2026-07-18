import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { City } from "./entities/city.entity";
import { Tehsil } from "../tehsils/entities/tehsil.entity";
import { District } from "../districts/entities/district.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Tehsil)
    private readonly tehsilRepository: Repository<Tehsil>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createCityDto: CreateCityDto): Promise<City> {
    try {
      // Validate that tehsil exists
      const tehsil = await this.tehsilRepository.findOne({
        where: { id: createCityDto.tehsil_id },
      });

      if (!tehsil) {
        throw new NotFoundException(
          `Tehsil with ID ${createCityDto.tehsil_id} not found`,
        );
      }

      // Validate that district exists
      const district = await this.districtRepository.findOne({
        where: { id: createCityDto.district_id },
      });

      if (!district) {
        throw new NotFoundException(
          `District with ID ${createCityDto.district_id} not found`,
        );
      }

      // Validate that region exists
      const region = await this.regionRepository.findOne({
        where: { id: createCityDto.region_id },
      });

      if (!region) {
        throw new NotFoundException(
          `Region with ID ${createCityDto.region_id} not found`,
        );
      }

      // Validate that country exists
      const country = await this.countryRepository.findOne({
        where: { id: createCityDto.country_id },
      });

      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createCityDto.country_id} not found`,
        );
      }

      // Check if city with same name already exists in the tehsil
      const existingCity = await this.cityRepository.findOne({
        where: {
          name: createCityDto.name,
          tehsil_id: createCityDto.tehsil_id,
        },
      });

      if (existingCity) {
        throw new ConflictException(
          "City with this name already exists in this tehsil",
        );
      }

      const city = this.cityRepository.create(createCityDto);
      return await this.cityRepository.save(city);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to create city: ${error.message}`);
    }
  }

  async findAll(): Promise<City[]> {
    try {
      return await this.cityRepository.find({
        where: { is_active: true },
        order: { name: "ASC" },
        relations: ["tehsil", "district", "region", "country", "routes"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve cities: ${error.message}`);
    }
  }

  async findByTehsil(tehsilId: number): Promise<City[]> {
    try {
      return await this.cityRepository.find({
        where: { tehsil_id: tehsilId, is_active: true },
        order: { name: "ASC" },
        relations: ["tehsil", "district", "region", "country", "routes"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve cities for tehsil: ${error.message}`);
    }
  }

  async findByDistrict(districtId: number): Promise<City[]> {
    try {
      return await this.cityRepository.find({
        where: { district_id: districtId, is_active: true },
        order: { name: "ASC" },
        relations: ["tehsil", "district", "region", "country", "routes"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve cities for district: ${error.message}`,
      );
    }
  }

  async findByRegion(regionId: number): Promise<City[]> {
    try {
      return await this.cityRepository.find({
        where: { region_id: regionId, is_active: true },
        order: { name: "ASC" },
        relations: ["tehsil", "district", "region", "country", "routes"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve cities for region: ${error.message}`);
    }
  }

  async findByCountry(countryId: number): Promise<City[]> {
    try {
      return await this.cityRepository.find({
        where: { country_id: countryId, is_active: true },
        order: { name: "ASC" },
        relations: ["tehsil", "district", "region", "country", "routes"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve cities for country: ${error.message}`,
      );
    }
  }

  async findOne(id: number): Promise<City> {
    try {
      const city = await this.cityRepository.findOne({
        where: { id },
        relations: ["tehsil", "district", "region", "country", "routes"],
      });

      if (!city) {
        throw new NotFoundException(`City with ID ${id} not found`);
      }

      return city;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve city: ${error.message}`);
    }
  }

  async update(id: number, updateCityDto: UpdateCityDto): Promise<City> {
    try {
      const city = await this.cityRepository.findOne({ where: { id } });

      if (!city) {
        throw new NotFoundException(`City with ID ${id} not found`);
      }

      // Validate tehsil if updating tehsil_id
      if (updateCityDto.tehsil_id) {
        const tehsil = await this.tehsilRepository.findOne({
          where: { id: updateCityDto.tehsil_id },
        });

        if (!tehsil) {
          throw new NotFoundException(
            `Tehsil with ID ${updateCityDto.tehsil_id} not found`,
          );
        }
      }

      // Validate district if updating district_id
      if (updateCityDto.district_id) {
        const district = await this.districtRepository.findOne({
          where: { id: updateCityDto.district_id },
        });

        if (!district) {
          throw new NotFoundException(
            `District with ID ${updateCityDto.district_id} not found`,
          );
        }
      }

      // Validate region if updating region_id
      if (updateCityDto.region_id) {
        const region = await this.regionRepository.findOne({
          where: { id: updateCityDto.region_id },
        });

        if (!region) {
          throw new NotFoundException(
            `Region with ID ${updateCityDto.region_id} not found`,
          );
        }
      }

      // Validate country if updating country_id
      if (updateCityDto.country_id) {
        const country = await this.countryRepository.findOne({
          where: { id: updateCityDto.country_id },
        });

        if (!country) {
          throw new NotFoundException(
            `Country with ID ${updateCityDto.country_id} not found`,
          );
        }
      }

      // Check for conflicts if updating name
      if (updateCityDto.name) {
        const existingCity = await this.cityRepository.findOne({
          where: {
            name: updateCityDto.name,
            tehsil_id: updateCityDto.tehsil_id || city.tehsil_id,
          },
        });

        if (existingCity && existingCity.id !== id) {
          throw new ConflictException(
            "City with this name already exists in this tehsil",
          );
        }
      }

      await this.cityRepository.update(id, updateCityDto);
      return await this.cityRepository.findOne({ where: { id } });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update city: ${error.message}`);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const city = await this.cityRepository.findOne({ where: { id } });

      if (!city) {
        throw new NotFoundException(`City with ID ${id} not found`);
      }

      // Soft delete by setting is_active to false
      await this.cityRepository.update(id, { is_active: false });

      return { message: "City deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to deactivate city: ${error.message}`);
    }
  }
}
