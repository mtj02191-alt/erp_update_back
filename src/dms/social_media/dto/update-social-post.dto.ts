import { PartialType } from "@nestjs/mapped-types";
import { CreateSocialPostDto } from "./create-social-post.dto";

export class UpdateSocialPostDto extends PartialType(CreateSocialPostDto) {}
