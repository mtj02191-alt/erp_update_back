import { PartialType } from "@nestjs/mapped-types";
import { CreateEmailTemplateDto } from "./create-email_template.dto";

export class UpdateEmailTemplateDto extends PartialType(
  CreateEmailTemplateDto,
) {}
