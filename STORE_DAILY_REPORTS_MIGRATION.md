# Store Daily Reports Module Migration

## Overview
This migration restructures the store module to use a proper `store_daily_reports` sub-module instead of the direct store entity.

## Changes Made

### 1. New Module Structure
```
src/store/
├── store.module.ts (updated)
├── store_daily_reports/ (new)
│   ├── entities/
│   │   └── store-daily-report.entity.ts
│   ├── dto/
│   │   ├── create-store-daily-report.dto.ts
│   │   └── update-store-daily-report.dto.ts
│   ├── store-daily-reports.controller.ts
│   ├── store-daily-reports.service.ts
│   └── store-daily-reports.module.ts
└── store.controller.ts (disabled)
```

### 2. New API Routes
- **Before:** `/store/*`
- **After:** `/store/reports/*`

#### Available Endpoints:
- `POST /store/reports` - Create new report
- `GET /store/reports` - List all reports (with pagination)
- `GET /store/reports/:id` - Get specific report
- `PATCH /store/reports/:id` - Submit Report
- `DELETE /store/reports/:id` - Delete report

### 3. Database Changes
- **New Table:** `store_daily_reports`
- **Old Table:** `store` (can be dropped after migration)

## Migration Steps

### Step 1: Run Database Migration
```sql
-- Execute the migration script
\i migration-store-daily-reports.sql
```

### Step 2: Update Frontend API Calls
Update all frontend components to use the new endpoints:

**Before:**
```javascript
// Old endpoints
axiosInstance.get('/store')
axiosInstance.post('/store', data)
axiosInstance.put(`/store/${id}`, data)
axiosInstance.delete(`/store/${id}`)
```

**After:**
```javascript
// New endpoints
axiosInstance.get('/store/reports')
axiosInstance.post('/store/reports', data)
axiosInstance.put(`/store/reports/${id}`, data)
axiosInstance.delete(`/store/reports/${id}`)
```

### Step 3: Test the New Module
1. Start the server: `npm run start:dev`
2. Test all CRUD operations
3. Verify pagination and sorting work correctly
4. Check user permissions and role-based access

### Step 4: Data Migration (Optional)
If you have existing data in the `store` table, uncomment the migration lines in the SQL script:

```sql
-- Migrate existing data
INSERT INTO store_daily_reports (date, demand_generated, pending_demands, generated_grn, pending_grn, rejected_demands, created_by, created_at)
SELECT date, demand_generated, pending_demands, generated_grn, pending_grn, rejected_demands, created_by, created_at
FROM store;
```

### Step 5: Clean Up (After Testing)
Once everything is working correctly:

1. Drop the old table:
```sql
DROP TABLE IF EXISTS store;
```

2. Remove old files:
   - `src/store/store.controller.ts`
   - `src/store/services/store.service.ts`
   - `src/store/entities/store.entity/`

## Benefits

1. **Better Organization:** Clear separation between store management and daily reports
2. **Scalability:** Easy to add more store-related modules
3. **API Clarity:** Routes clearly indicate the resource type
4. **Maintainability:** Each module has its own responsibility
5. **Future-Proof:** Can easily add more report types

## Rollback Plan

If issues arise, you can:

1. **Revert the module changes** by uncommenting the old controller and service in `store.module.ts`
2. **Keep the old table** by not running the DROP TABLE command
3. **Update frontend** to use the old endpoints again

## Testing Checklist

- [ ] Create new store daily report
- [ ] List all reports with pagination
- [ ] Get specific report by ID
- [ ] Update existing report
- [ ] Delete report (admin only)
- [ ] Test user permissions (admin vs regular user)
- [ ] Test sorting and filtering
- [ ] Verify data integrity 