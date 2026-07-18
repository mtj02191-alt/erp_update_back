import { PartialType } from "@nestjs/mapped-types";
import { CreateCeoNoteDto } from "./create-ceo-note.dto";

export class UpdateCeoNoteDto extends PartialType(CreateCeoNoteDto) {}
