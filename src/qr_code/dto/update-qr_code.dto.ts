import { PartialType } from "@nestjs/mapped-types";
import { CreateQrCodeDto } from "./create-qr_code.dto";

export class UpdateQrCodeDto extends PartialType(CreateQrCodeDto) {}
