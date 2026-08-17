import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeBaseDto } from './create-knowledge_base.dto';

export class UpdateKnowledgeBaseDto extends PartialType(CreateKnowledgeBaseDto) {}
