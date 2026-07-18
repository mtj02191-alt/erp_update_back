import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { PublicEventsController } from "./public-events.controller";
import { Event } from "./entities/event.entity";
import { EventPass } from "./entities/event_pass.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { PermissionsModule } from "../../permissions/permissions.module";
import { User } from "../../users/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventPass, Donation, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [EventsController, PublicEventsController],
  providers: [EventsService],
  exports: [EventsService, TypeOrmModule],
})
export class EventsModule {}
