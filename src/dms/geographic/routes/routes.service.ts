import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { CreateRouteDto } from "./dto/create-route.dto";
import { UpdateRouteDto } from "./dto/update-route.dto";
import { Route } from "./entities/route.entity";
import { City } from "../cities/entities/city.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createRouteDto: CreateRouteDto): Promise<Route> {
    try {
      // Validate that all cities exist
      const cities = await this.cityRepository.findBy({
        id: In(createRouteDto.city_ids),
      });

      if (cities.length !== createRouteDto.city_ids.length) {
        const foundIds = cities.map((city) => city.id);
        const missingIds = createRouteDto.city_ids.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Cities with IDs ${missingIds.join(", ")} not found`,
        );
      }

      // Validate that region exists
      const region = await this.regionRepository.findOne({
        where: { id: createRouteDto.region_id },
      });

      if (!region) {
        throw new NotFoundException(
          `Region with ID ${createRouteDto.region_id} not found`,
        );
      }

      // Validate that country exists
      const country = await this.countryRepository.findOne({
        where: { id: createRouteDto.country_id },
      });

      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createRouteDto.country_id} not found`,
        );
      }

      // Check if route with same name already exists
      const existingRoute = await this.routeRepository.findOne({
        where: {
          name: createRouteDto.name,
        },
      });

      if (existingRoute) {
        throw new ConflictException("Route with this name already exists");
      }

      const route = this.routeRepository.create(createRouteDto);
      route.cities = cities;
      return await this.routeRepository.save(route);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to create route: ${error.message}`);
    }
  }

  async findAll(): Promise<Route[]> {
    try {
      return await this.routeRepository.find({
        where: { is_active: true },
        order: { name: "ASC" },
        relations: ["cities", "region", "country"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve routes: ${error.message}`);
    }
  }

  async findByCity(cityId: number): Promise<Route[]> {
    try {
      return await this.routeRepository
        .createQueryBuilder("route")
        .leftJoinAndSelect("route.cities", "city")
        .leftJoinAndSelect("route.region", "region")
        .leftJoinAndSelect("route.country", "country")
        .where("city.id = :cityId", { cityId })
        .andWhere("route.is_active = :isActive", { isActive: true })
        .orderBy("route.name", "ASC")
        .getMany();
    } catch (error) {
      throw new Error(`Failed to retrieve routes for city: ${error.message}`);
    }
  }

  async findByRegion(regionId: number): Promise<Route[]> {
    try {
      return await this.routeRepository.find({
        where: { region_id: regionId, is_active: true },
        order: { name: "ASC" },
        relations: ["cities", "region", "country"],
      });
    } catch (error) {
      throw new Error(`Failed to retrieve routes for region: ${error.message}`);
    }
  }

  async findByCountry(countryId: number): Promise<Route[]> {
    try {
      return await this.routeRepository.find({
        where: { country_id: countryId, is_active: true },
        order: { name: "ASC" },
        relations: ["cities", "region", "country"],
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve routes for country: ${error.message}`,
      );
    }
  }

  async findOne(id: number): Promise<Route> {
    try {
      const route = await this.routeRepository.findOne({
        where: { id },
        relations: ["cities", "region", "country"],
      });

      if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found`);
      }

      return route;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve route: ${error.message}`);
    }
  }

  async update(id: number, updateRouteDto: UpdateRouteDto): Promise<Route> {
    try {
      const route = await this.routeRepository.findOne({ where: { id } });

      if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found`);
      }

      // Validate cities if updating city_ids
      if (updateRouteDto.city_ids && updateRouteDto.city_ids.length > 0) {
        const cities = await this.cityRepository.findBy({
          id: In(updateRouteDto.city_ids),
        });

        if (cities.length !== updateRouteDto.city_ids.length) {
          const foundIds = cities.map((city) => city.id);
          const missingIds = updateRouteDto.city_ids.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Cities with IDs ${missingIds.join(", ")} not found`,
          );
        }
      }

      // Validate region if updating region_id
      if (updateRouteDto.region_id) {
        const region = await this.regionRepository.findOne({
          where: { id: updateRouteDto.region_id },
        });

        if (!region) {
          throw new NotFoundException(
            `Region with ID ${updateRouteDto.region_id} not found`,
          );
        }
      }

      // Validate country if updating country_id
      if (updateRouteDto.country_id) {
        const country = await this.countryRepository.findOne({
          where: { id: updateRouteDto.country_id },
        });

        if (!country) {
          throw new NotFoundException(
            `Country with ID ${updateRouteDto.country_id} not found`,
          );
        }
      }

      // Check for conflicts if updating name
      if (updateRouteDto.name) {
        const existingRoute = await this.routeRepository.findOne({
          where: {
            name: updateRouteDto.name,
          },
        });

        if (existingRoute && existingRoute.id !== id) {
          throw new ConflictException("Route with this name already exists");
        }
      }

      // Update route properties
      const updateData = { ...updateRouteDto };
      delete updateData.city_ids; // Remove city_ids from update data

      await this.routeRepository.update(id, updateData);

      // Update cities relationship if provided
      if (updateRouteDto.city_ids && updateRouteDto.city_ids.length > 0) {
        const cities = await this.cityRepository.findBy({
          id: In(updateRouteDto.city_ids),
        });
        const updatedRoute = await this.routeRepository.findOne({
          where: { id },
        });
        updatedRoute.cities = cities;
        await this.routeRepository.save(updatedRoute);
      }

      return await this.routeRepository.findOne({
        where: { id },
        relations: ["cities", "region", "country"],
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update route: ${error.message}`);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const route = await this.routeRepository.findOne({ where: { id } });

      if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found`);
      }

      // Soft delete by setting is_active to false
      await this.routeRepository.update(id, { is_active: false });

      return { message: "Route deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to deactivate route: ${error.message}`);
    }
  }
}
