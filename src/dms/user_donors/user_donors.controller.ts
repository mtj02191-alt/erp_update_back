import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { UserDonorsService } from "./user_donors.service";
import { CreateUserDonorDto } from "./dto/create-user_donor.dto";
import {
  UpdateUserDonorDto,
  TransferDonorDto,
  AssignDonorDto,
} from "./dto/update-user_donor.dto";
import { RequiredPermissions } from "../../permissions";
import { JwtGuard } from "../../auth/jwt.guard";
import { UseGuards } from "@nestjs/common";

@Controller("user-donors")
@UseGuards(JwtGuard)
export class UserDonorsController {
  constructor(private readonly userDonorsService: UserDonorsService) {}

  @Post()
  @RequiredPermissions(["user_donors.create", "super_admin"])
  async create(
    @Body() createUserDonorDto: CreateUserDonorDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.userDonorsService.create(createUserDonorDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "User-donor assignment created successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get()
  @RequiredPermissions(["user_donors.view", "super_admin"])
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Res() res?: Response,
  ) {
    try {
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      if (isNaN(pageNum) || isNaN(pageSizeNum)) {
        throw new BadRequestException(
          "Page and pageSize must be valid numbers",
        );
      }

      const result = await this.userDonorsService.findAll(
        pageNum,
        pageSizeNum,
        status,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "User-donor assignments retrieved successfully",
        ...result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get("stats")
  @RequiredPermissions(["user_donors.view", "super_admin"])
  async getStats(@Res() res: Response) {
    try {
      const stats = await this.userDonorsService.getAssignmentStats();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Assignment statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("user/:userId/donors")
  @RequiredPermissions(["user_donors.view", "super_admin"])
  async getUserDonors(
    @Param("userId") userId: string,
    @Query("status") status?: string,
    @Res() res?: Response,
  ) {
    try {
      const numericId = parseInt(userId, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException("Invalid user ID. Must be a number.");
      }

      const result = await this.userDonorsService.getUserAssignedDonors(
        numericId,
        status,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "User assigned donors retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get("donor/:donorId/users")
  @RequiredPermissions(["user_donors.view", "super_admin"])
  async getDonorUsers(
    @Param("donorId") donorId: string,
    @Query("status") status?: string,
    @Res() res?: Response,
  ) {
    try {
      const numericId = parseInt(donorId, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException("Invalid donor ID. Must be a number.");
      }

      const result = await this.userDonorsService.getDonorAssignedUsers(
        numericId,
        status,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donor assigned users retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get(":id")
  @RequiredPermissions(["user_donors.view", "super_admin"])
  async findOne(@Param("id") id: string, @Res() res?: Response) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException(
          "Invalid assignment ID. Must be a number.",
        );
      }

      const result = await this.userDonorsService.findOne(numericId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Assignment retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post("assign")
  @RequiredPermissions(["user_donors.create", "super_admin"])
  async assignDonor(@Body() assignDto: AssignDonorDto, @Res() res: Response) {
    try {
      const result = await this.userDonorsService.assignDonor(assignDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Donor assigned successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post("transfer")
  @RequiredPermissions(["user_donors.update", "super_admin"])
  async transferDonor(
    @Body() transferDto: TransferDonorDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.userDonorsService.transferDonor(transferDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donor transferred successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions(["user_donors.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() updateUserDonorDto: UpdateUserDonorDto,
    @Res() res?: Response,
  ) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException(
          "Invalid assignment ID. Must be a number.",
        );
      }

      const result = await this.userDonorsService.update(
        numericId,
        updateUserDonorDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Assignment updated successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions(["user_donors.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res?: Response) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException(
          "Invalid assignment ID. Must be a number.",
        );
      }

      const result = await this.userDonorsService.remove(numericId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Assignment deactivated successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
