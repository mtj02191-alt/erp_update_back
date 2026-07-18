import { PartialType } from "@nestjs/mapped-types";
import { CreateWhatsAppDto } from "./create-whatsapp.dto";

export class UpdateWhatsAppDto extends PartialType(CreateWhatsAppDto) {}
