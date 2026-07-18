import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { SeedersModule } from "./seeders.module";
import { UsersSeeder } from "./users.seeder";

async function bootstrap() {
  const app = await NestFactory.create(SeedersModule);
  const usersSeeder = app.get(UsersSeeder);

  console.log("Starting seeding...");

  try {
    await usersSeeder.seed();
    console.log("Seeding completed successfully");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await app.close();
  }
}

bootstrap();
