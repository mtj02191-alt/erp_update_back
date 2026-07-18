# Procurements Daily Reports Migration Guide

## Overview
This document outlines the migration from the old procurements module to the new `procurements_daily_reports` module structure.

## Changes Made

### 1. New Module Structure
- Created `procurements_daily_reports` module inside the procurements directory
- New routes: `/procurements/reports/*` instead of `/procurements/*`
- Separate entity, DTOs, service, controller, and module

### 2. New Files Created
```
src/procurements/procurements_daily_reports/
├── entities/
│   └── procurements-daily-report.entity.ts
├── dto/
│   ├── create-procurements-daily-report.dto.ts
│   └── update-procurements-daily-report.dto.ts
├── procurements-daily-reports.service.ts
├── procurements-daily-reports.controller.ts
└── procurements-daily-reports.module.ts
```

### 3. Database Changes
- New table: `procurements_daily_reports`
- Added `updatedAt` column for better tracking
- Added unique constraint on date field
- Added indexes for better performance

## Migration Steps

### Step 1: Run Database Migration
```sql
-- Execute the migration script
mysql -u your_username -p your_database < migration-procurements-daily-reports.sql
```

### Step 2: Optional Data Migration
If you want to migrate existing data from the old `procurements` table:
1. Uncomment the data migration section in `migration-procurements-daily-reports.sql`
2. Run the script again

### Step 3: Update Frontend Routes
Update all frontend API calls from:
- `GET /procurements` → `GET /procurements/reports`
- `POST /procurements` → `POST /procurements/reports`
- `GET /procurements/{id}` → `GET /procurements/reports/{id}`
- `PATCH /procurements/{id}` → `PATCH /procurements/reports/{id}`
- `DELETE /procurements/{id}` → `DELETE /procurements/reports/{id}`

### Step 4: Restart Application
```bash
npm run start:dev
```

## API Endpoints

### New Endpoints
- `POST /procurements/reports` - Create new report
- `GET /procurements/reports` - List reports (with pagination)
- `GET /procurements/reports/:id` - Get single report
- `PATCH /procurements/reports/:id` - Submit Report
- `DELETE /procurements/reports/:id` - Delete report

### Query Parameters for List Endpoint
- `page` (default: 1) - Page number
- `pageSize` (default: 10) - Items per page
- `sortField` (default: 'date') - Field to sort by
- `sortOrder` (default: 'DESC') - Sort order (ASC/DESC)

## Rollback Plan

If you need to rollback:

1. **Database Rollback**:
```sql
DROP TABLE IF EXISTS procurements_daily_reports;
```

2. **Code Rollback**:
- Uncomment the old controller and service in `procurements.module.ts`
- Remove the `ProcurementsDailyReportsModule` import
- Delete the `procurements_daily_reports` directory

3. **Frontend Rollback**:
- Revert API endpoints back to `/procurements/*`

## Features

### Enhanced Features
- **Pagination**: Built-in pagination support
- **Sorting**: Sort by any field in ASC/DESC order
- **Error Handling**: Comprehensive try-catch blocks with proper logging
- **Validation**: Input validation with class-validator
- **Role-based Access**: JWT authentication and role-based authorization
- **Date Uniqueness**: Prevents duplicate reports for the same date
- **Audit Trail**: Created and updated timestamps

### Security
- JWT authentication required for all endpoints
- Role-based authorization (admin and user roles)
- Input validation and sanitization
- SQL injection protection through TypeORM

## Testing

### Test the New Endpoints
```bash
# Create a new report
curl -X POST http://localhost:3000/procurements/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "date": "2024-01-15",
    "totalGeneratedPOs": 10,
    "pendingPOs": 5,
    "fulfilledPOs": 5,
    "totalGeneratedPIs": 8,
    "totalPaidAmount": 50000.00,
    "unpaidAmount": 10000.00,
    "unpaidPIs": 2,
    "tenders": 3
  }'

# List reports with pagination
curl -X GET "http://localhost:3000/procurements/reports?page=1&pageSize=10&sortField=date&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notes
- The old procurements controller and service are disabled but not removed
- Existing data in the old `procurements` table remains untouched
- The new structure provides better separation of concerns
- All endpoints require authentication and proper authorization 