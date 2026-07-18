import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "../users/users.module";
import { UsersSeeder } from "./users.seeder";
import { User } from "../users/user.entity";
import { PermissionsEntity } from "../permissions/entities/permissions.entity";
import { DonationBox } from "../dms/donation_box/entities/donation-box.entity";
import { Donor } from "../dms/donor/entities/donor.entity";
import { Donation } from "../donations/entities/donation.entity";
import { City } from "../dms/geographic/cities/entities/city.entity";
import { Tehsil } from "../dms/geographic/tehsils/entities/tehsil.entity";
import { District } from "../dms/geographic/districts/entities/district.entity";
import { Region } from "../dms/geographic/regions/entities/region.entity";
import { Country } from "../dms/geographic/countries/entities/country.entity";
import { Route } from "../dms/geographic/routes/entities/route.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
    }),
    TypeOrmModule.forRoot({
      // type: "postgres",
      // host: process.env.DB_HOST,
      // port: parseInt(process.env.DB_PORT),
      // username: process.env.DB_USERNAME,
      // password: process.env.DB_PASSWORD,
      // database: process.env.DB_NAME,
      // Explicitly register ONLY the entities needed for seeding
      // This avoids cascading entity metadata issues
      entities: [
        User,
        PermissionsEntity,
        DonationBox,
        Donor,
        Donation, // Required because Donor has OneToMany to Donation
        City,
        Tehsil,
        District,
        Region,
        Country,
        Route,
      ],
      synchronize: false, // Never use synchronize in seeders
    }),
    UsersModule,
    TypeOrmModule.forFeature([User, PermissionsEntity]),
  ],
  providers: [UsersSeeder],
})
export class SeedersModule {}
