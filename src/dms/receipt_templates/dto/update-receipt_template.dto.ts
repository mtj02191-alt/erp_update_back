import { PartialType } from '@nestjs/mapped-types';
import { CreateReceiptTemplateDto } from './create-receipt_template.dto';

export class UpdateReceiptTemplateDto extends PartialType(CreateReceiptTemplateDto) {}
