/**
 * Seed 3 dummy appeals (no images). Skips rows that already exist by slug.
 *
 *   npm run seed:appeals
 */
import { NestFactory } from "@nestjs/core";
import { readFileSync } from "fs";
import { join } from "path";
import { AppModule } from "./src/app.module";
import { AppealsService } from "./src/dms/appeals/appeals.service";
import { CreateAppealDto } from "./src/dms/appeals/dto/create-appeal.dto";
import { Repository } from "typeorm";
import { Appeal } from "./src/dms/appeals/entities/appeal.entity";
import { getRepositoryToken } from "@nestjs/typeorm";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const appealsService = app.get(AppealsService);
  const appealRepo = app.get<Repository<Appeal>>(getRepositoryToken(Appeal));

  const dataPath = join(
    __dirname,
    "src/dms/appeals/data/appeals-dummy-data.json",
  );
  const items = JSON.parse(readFileSync(dataPath, "utf8")) as CreateAppealDto[];

  console.log(`Seeding up to ${items.length} appeals from appeals-dummy-data.json...`);

  for (const dto of items) {
    const slug = dto.slug?.trim();
    if (slug) {
      const existing = await appealRepo.findOne({ where: { slug } });
      if (existing) {
        console.log(`  skip (exists): ${slug} (id=${existing.id})`);
        continue;
      }
    }
    const saved = await appealsService.create(dto, null);
    console.log(`  created: ${saved.title} → id=${saved.id}, slug=${saved.slug}`);
  }

  console.log("Done. Add cover / beneficiary / organizer / gallery images via UI or S3 upload.");
  await app.close();
}

bootstrap().catch((err) => {
  console.error("Appeals seed failed:", err);
  process.exit(1);
});
