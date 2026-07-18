// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { PermissionsEntity } from '../entities/permissions.entity';
// import { User } from '../../users/user.entity';
// import { getDefaultPermissions, PermissionType, mergePermissions } from '../utils/permissions.util';

// @Injectable()
// export class PermissionsSeeder {
//   private readonly logger = new Logger(PermissionsSeeder.name);

//   constructor(
//     @InjectRepository(PermissionsEntity)
//     private readonly permissionsRepository: Repository<PermissionsEntity>,
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>,
//   ) {}

//   /**
//    * Seed permissions for a specific user
//    * @param userId - User ID to seed permissions for
//    * @param userType - Type of user (super_admin, accounts_manager, etc.)
//    * @param customPermissions - Optional custom permissions to merge
//    * @returns Promise<PermissionsEntity>
//    */
//   async seedUserPermissions(
//     userId: number,
//     userType: PermissionType,
//     customPermissions: Record<string, any> = {}
//   ): Promise<PermissionsEntity> {
//     try {
//       // Check if user exists
//       const user = await this.userRepository.findOne({ where: { id: userId } });
//       if (!user) {
//         throw new Error(`User with ID ${userId} not found`);
//       }

//       // Get default permissions for user type
//       const defaultPermissions = getDefaultPermissions(userType);

//       // Merge with custom permissions if provided
//       const finalPermissions = Object.keys(customPermissions).length > 0
//         ? mergePermissions(userType, customPermissions)
//         : defaultPermissions;

//       // Check if permissions already exist for this user
//       let userPermissions = await this.permissionsRepository.findOne({
//         where: { user_id: userId },
//       });

//       if (userPermissions) {
//         // Update existing permissions
//         userPermissions.permissions = finalPermissions;
//         userPermissions = await this.permissionsRepository.save(userPermissions);
//         this.logger.log(`Updated permissions for user ${userId} (${userType})`);
//       } else {
//         // Create new permissions
//         userPermissions = this.permissionsRepository.create({
//           user_id: userId,
//           permissions: finalPermissions,
//         });
//         userPermissions = await this.permissionsRepository.save(userPermissions);
//         this.logger.log(`Created permissions for user ${userId} (${userType})`);
//       }

//       return userPermissions;
//     } catch (error) {
//       this.logger.error(`Error seeding permissions for user ${userId}:`, error.stack);
//       throw error;
//     }
//   }

//   /**
//    * Seed super admin permissions for a user
//    * @param userId - User ID to make super admin
//    * @param customPermissions - Optional custom permissions to merge
//    * @returns Promise<PermissionsEntity>
//    */
//   async seedSuperAdminPermissions(
//     userId: number,
//     customPermissions: Record<string, any> = {}
//   ): Promise<PermissionsEntity> {
//     return this.seedUserPermissions(userId, 'super_admin', customPermissions);
//   }

//   /**
//    * Seed permissions for multiple users
//    * @param userPermissions - Array of { userId, userType, customPermissions? }
//    * @returns Promise<PermissionsEntity[]>
//    */
//   async seedMultipleUserPermissions(
//     userPermissions: Array<{
//       userId: number;
//       userType: PermissionType;
//       customPermissions?: Record<string, any>;
//     }>
//   ): Promise<PermissionsEntity[]> {
//     const results: PermissionsEntity[] = [];

//     for (const userPerm of userPermissions) {
//       try {
//         const result = await this.seedUserPermissions(
//           userPerm.userId,
//           userPerm.userType,
//           userPerm.customPermissions
//         );
//         results.push(result);
//       } catch (error) {
//         this.logger.error(`Failed to seed permissions for user ${userPerm.userId}:`, error.message);
//         // Continue with other users even if one fails
//       }
//     }

//     return results;
//   }

//   /**
//    * Get all users without permissions and seed them with viewer permissions
//    * @returns Promise<PermissionsEntity[]>
//    */
//   async seedDefaultPermissionsForAllUsers(): Promise<PermissionsEntity[]> {
//     try {
//       // Get all users
//       const allUsers = await this.userRepository.find();

//       // Get users who already have permissions
//       const usersWithPermissions = await this.permissionsRepository.find({
//         select: ['user_id'],
//       });
//       const userIdsWithPermissions = usersWithPermissions.map(p => p.user_id);

//       // Filter users without permissions
//       const usersWithoutPermissions = allUsers.filter(
//         user => !userIdsWithPermissions.includes(user.id)
//       );

//       // Seed viewer permissions for users without permissions
//       const results: PermissionsEntity[] = [];
//       for (const user of usersWithoutPermissions) {
//         try {
//           const result = await this.seedUserPermissions(user.id, 'viewer');
//           results.push(result);
//         } catch (error) {
//           this.logger.error(`Failed to seed default permissions for user ${user.id}:`, error.message);
//         }
//       }

//       this.logger.log(`Seeded default permissions for ${results.length} users`);
//       return results;
//     } catch (error) {
//       this.logger.error('Error seeding default permissions for all users:', error.stack);
//       throw error;
//     }
//   }

//   /**
//    * Delete all permissions (use with caution)
//    * @returns Promise<void>
//    */
//   async deleteAllPermissions(): Promise<void> {
//     try {
//       await this.permissionsRepository.clear();
//       this.logger.log('Deleted all user permissions');
//     } catch (error) {
//       this.logger.error('Error deleting all permissions:', error.stack);
//       throw error;
//     }
//   }
// }
