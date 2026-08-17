import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Res,
  Req,
} from "@nestjs/common";
import { Response } from "express";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { CreateAffiliationDto } from "./dto/create-affiliation.dto";
import { CreateOrganizationBranchDto } from "./dto/create-organization-branch.dto";
import { UpdateOrganizationBranchDto } from "./dto/update-organization-branch.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import {
  ORGANIZATION_CREATE_GUARD,
  ORGANIZATION_DELETE_GUARD,
  ORGANIZATION_LIST_GUARD,
  ORGANIZATION_UPDATE_GUARD,
  ORGANIZATION_VIEW_GUARD,
} from "../../permissions/organization-permissions.constants";

@Controller("organizations")
@UseGuards(JwtGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequiredPermissions([...ORGANIZATION_CREATE_GUARD])
  async create(
    @Body() dto: CreateOrganizationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.organizationsService.create(dto, req?.user);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Organization created",
      data,
    });
  }

  @Get()
  @RequiredPermissions([...ORGANIZATION_LIST_GUARD])
  async findAll(
    @Query("search") search: string,
    @Query("page") page: string,
    @Query("pageSize") pageSize: string,
    @Res() res: Response,
  ) {
    const result = await this.organizationsService.findAll({
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Organizations retrieved",
      ...result,
    });
  }

  @Post("affiliations")
  @RequiredPermissions([...ORGANIZATION_CREATE_GUARD, ...ORGANIZATION_UPDATE_GUARD])
  async createAffiliation(
    @Body() dto: CreateAffiliationDto,
    @Res() res: Response,
  ) {
    const data = await this.organizationsService.createAffiliation(dto);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Affiliation created",
      data,
    });
  }

  @Get("affiliations/donor/:donorId")
  @RequiredPermissions([...ORGANIZATION_VIEW_GUARD])
  async listForDonor(
    @Param("donorId") donorId: string,
    @Res() res: Response,
  ) {
    const data =
      await this.organizationsService.listAffiliationsForDonor(+donorId);
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Get(":id/people")
  @RequiredPermissions([...ORGANIZATION_VIEW_GUARD])
  async listPeople(@Param("id") id: string, @Res() res: Response) {
    const data = await this.organizationsService.listPeopleForOrganization(+id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Organization people retrieved",
      data,
    });
  }

  @Get(":id")
  @RequiredPermissions([...ORGANIZATION_VIEW_GUARD])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    const data = await this.organizationsService.findOne(+id);
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Patch(":id")
  @RequiredPermissions([...ORGANIZATION_UPDATE_GUARD])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateOrganizationDto,
    @Res() res: Response,
  ) {
    const data = await this.organizationsService.update(+id, dto);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Organization updated",
      data,
    });
  }

  @Delete(":id")
  @RequiredPermissions([...ORGANIZATION_DELETE_GUARD])
  async remove(@Param("id") id: string, @Res() res: Response) {
    await this.organizationsService.softDelete(+id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Organization archived",
    });
  }

  @Post(":id/branches")
  @RequiredPermissions([...ORGANIZATION_CREATE_GUARD, ...ORGANIZATION_UPDATE_GUARD])
  async createBranch(
    @Param("id") id: string,
    @Body() body: CreateOrganizationBranchDto,
    @Res() res: Response,
  ) {
    const data = await this.organizationsService.createBranch(+id, body);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: body.parent_branch_id ? "Sub-branch created" : "Branch created",
      data,
    });
  }

  @Patch(":id/branches/:branchId")
  @RequiredPermissions([...ORGANIZATION_UPDATE_GUARD])
  async updateBranch(
    @Param("id") id: string,
    @Param("branchId") branchId: string,
    @Body() body: UpdateOrganizationBranchDto,
    @Res() res: Response,
  ) {
    const data = await this.organizationsService.updateBranch(
      +id,
      +branchId,
      body,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Branch updated",
      data,
    });
  }

  @Delete(":id/branches/:branchId")
  @RequiredPermissions([...ORGANIZATION_DELETE_GUARD, ...ORGANIZATION_UPDATE_GUARD])
  async deleteBranch(
    @Param("id") id: string,
    @Param("branchId") branchId: string,
    @Res() res: Response,
  ) {
    await this.organizationsService.softDeleteBranch(+id, +branchId);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Branch archived",
    });
  }
}
