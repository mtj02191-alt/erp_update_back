import { PartialType } from "@nestjs/mapped-types";
import { CreateProjectCommandSheetDto } from "./create-project-command-sheet.dto";

export class UpdateProjectCommandSheetDto extends PartialType(
  CreateProjectCommandSheetDto,
) {}
