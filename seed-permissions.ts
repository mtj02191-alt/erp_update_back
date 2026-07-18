// import 'tsconfig-paths/register';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './src/app.module';
// // import { PermissionsSeeder } from './src/permissions/seeder/permissions.seeder';

// async function bootstrap() {
//   const app = await NestFactory.createApplicationContext(AppModule);
//   const permissionsSeeder = app.get(PermissionsSeeder);

//   try {
//     // Get user ID from command line arguments or use default
//     const userId = process.argv[2] ? parseInt(process.argv[2]) : 1;
    
//     console.log(`Seeding super admin permissions for user ID: ${userId}`);
    
//     await permissionsSeeder.seedSuperAdminPermissions(userId);
    
//     console.log('✅ Super admin permissions seeded successfully!');
//   } catch (error) {
//     console.error('❌ Error seeding permissions:', error.message);
//     process.exit(1);
//   } finally {
//     await app.close();
//   }
// }

// bootstrap(); 