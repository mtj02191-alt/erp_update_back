import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Department, UserRole } from "../users/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";

interface SeedUser {
  email: string;
  password: string;
  department: Department;
  role: UserRole;
}

@Injectable()
export class UsersSeeder {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(shouldDeleteExisting: boolean = false) {
    if (shouldDeleteExisting) {
      console.log("Deleting existing users...");
      await this.userRepository.delete({});
    }

    const users: SeedUser[] = [
      {
        email: "store@example.com",
        password: "store%1123",
        department: Department.STORE,
        role: UserRole.USER,
      },
      {
        email: "procurements@example.com",
        password: "procurements%1123",
        department: Department.PROCUREMENTS,
        role: UserRole.USER,
      },
      {
        email: "program@example.com",
        password: "program%1123",
        department: Department.PROGRAM,
        role: UserRole.USER,
      },
      {
        email: "finance@example.com",
        password: "finance%1123",
        department: Department.ACCOUNTS_AND_FINANCE,
        role: UserRole.USER,
      },
      {
        email: "admin@example.com",
        password: "admin%1123",
        department: Department.ADMIN, // Admin can access all departments
        role: UserRole.ADMIN,
      },
    ];

    for (const user of users) {
      try {
        // Check if user exists (only if we're not deleting existing users)
        if (!shouldDeleteExisting) {
          const existingUser = await this.userRepository.findOne({
            where: { email: user.email },
          });
          if (existingUser) {
            console.log(`User ${user.email} already exists, skipping...`);
            continue;
          }
        }

        // Create new user
        await this.usersService.create(
          user.email,
          user.password,
          user.department,
          user.role,
        );
        console.log(`Created user: ${user.email}`);
      } catch (error) {
        console.error(`Error creating user ${user.email}:`, error.message);
      }
    }
  }
}
