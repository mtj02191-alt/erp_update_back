import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "../../auth/jwt.guard";
import {
  AID_PEOPLE_CREATE_GUARD,
  AID_PEOPLE_DELETE_GUARD,
  AID_PEOPLE_LIST_GUARD,
  AID_PEOPLE_UPDATE_GUARD,
  AID_PEOPLE_VIEW_GUARD,
} from "../../permissions/aid-permissions.constants";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { AidHouseholdsService } from "./aid-households.service";
import {
  CreateAidHouseholdDto,
  CreateAidHouseholdMemberDto,
  UpdateAidHouseholdDto,
} from "./dto/aid.dto";

@Controller("aid/households")
@UseGuards(JwtGuard, PermissionsGuard)
export class AidHouseholdsController {
  constructor(private readonly householdsService: AidHouseholdsService) {}

  @Post()
  @RequiredPermissions([...AID_PEOPLE_CREATE_GUARD])
  async create(
    @Body() dto: CreateAidHouseholdDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.householdsService.create(dto, req?.user);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Household created",
      data,
    });
  }

  @Get()
  @RequiredPermissions([...AID_PEOPLE_LIST_GUARD])
  async findAll(
    @Query("search") search: string,
    @Query("page") page: string,
    @Query("pageSize") pageSize: string,
    @Res() res: Response,
  ) {
    const result = await this.householdsService.findAll({
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Households retrieved",
      ...result,
    });
  }

  @Get(":id")
  @RequiredPermissions([...AID_PEOPLE_VIEW_GUARD])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    const data = await this.householdsService.findOne(Number(id));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Household retrieved",
      data,
    });
  }

  @Patch(":id")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAidHouseholdDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.householdsService.update(Number(id), dto, req?.user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Household updated",
      data,
    });
  }

  @Delete("members/:memberId")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async removeMember(
    @Param("memberId") memberId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.householdsService.removeMember(
      Number(memberId),
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Member removed",
      data,
    });
  }

  @Post(":id/members")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async addMember(
    @Param("id") id: string,
    @Body() dto: CreateAidHouseholdMemberDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.householdsService.addMember(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Member added",
      data,
    });
  }

  @Delete(":id")
  @RequiredPermissions([...AID_PEOPLE_DELETE_GUARD])
  async remove(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const data = await this.householdsService.softDelete(Number(id), req?.user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Household archived",
      data,
    });
  }
}
