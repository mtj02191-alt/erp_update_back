import { PartialType } from "@nestjs/mapped-types";
import { CreateGoldSilverPriceDto } from "./create-gold_silver_price.dto";

export class UpdateGoldSilverPriceDto extends PartialType(
  CreateGoldSilverPriceDto,
) {}
