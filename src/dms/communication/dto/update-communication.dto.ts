import { PartialType } from '@nestjs/mapped-types';
import { CreateCommunicationDto } from './create-communication.dto';

export class UpdateCommunicationDto extends PartialType(CreateCommunicationDto) {}
