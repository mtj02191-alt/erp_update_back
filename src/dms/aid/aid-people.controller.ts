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
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import {
  AID_PEOPLE_CREATE_GUARD,
  AID_PEOPLE_DELETE_GUARD,
  AID_PEOPLE_LIST_GUARD,
  AID_PEOPLE_UPDATE_GUARD,
  AID_PEOPLE_VIEW_GUARD,
} from "../../permissions/aid-permissions.constants";
import { AidPeopleService } from "./aid-people.service";
import {
  CreateAidFamilyMemberDto,
  CreateAidKinshipDto,
  CreateAidPersonDto,
  UpdateAidPersonDto,
} from "./dto/aid.dto";

@Controller("aid/people")
@UseGuards(JwtGuard, PermissionsGuard)
export class AidPeopleController {
  constructor(private readonly peopleService: AidPeopleService) {}

  @Post()
  @RequiredPermissions([...AID_PEOPLE_CREATE_GUARD])
  async create(@Body() dto: CreateAidPersonDto, @Req() req: any, @Res() res: Response) {
    const data = await this.peopleService.create(dto, req?.user);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Person created",
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
    const result = await this.peopleService.findAll({
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "People retrieved",
      ...result,
    });
  }

  @Delete("kinship/:edgeId")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async removeKinship(
    @Param("edgeId") edgeId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.peopleService.removeKinship(Number(edgeId), req?.user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Kinship link removed",
      data,
    });
  }

  @Post(":id/family-members")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async addFamilyMember(
    @Param("id") id: string,
    @Body() dto: CreateAidFamilyMemberDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.peopleService.addFamilyMember(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Family member added",
      data,
    });
  }

  @Post(":id/kinship")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async addKinship(
    @Param("id") id: string,
    @Body() dto: CreateAidKinshipDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.peopleService.addKinship(Number(id), dto, req?.user);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Kinship link added",
      data,
    });
  }

  @Get(":id")
  @RequiredPermissions([...AID_PEOPLE_VIEW_GUARD])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    const data = await this.peopleService.findOneDetailed(Number(id));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Person retrieved",
      data,
    });
  }

  @Patch(":id")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAidPersonDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.peopleService.update(Number(id), dto, req?.user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Person updated",
      data,
    });
  }

  @Delete(":id")
  @RequiredPermissions([...AID_PEOPLE_DELETE_GUARD])
  async remove(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const data = await this.peopleService.softDelete(Number(id), req?.user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Person archived",
      data,
    });
  }
}
