import { IsString, IsNotEmpty } from "class-validator";

export class CreateReceiptTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  raw_html: string;
}
