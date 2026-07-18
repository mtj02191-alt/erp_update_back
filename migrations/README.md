# Database Migrations

This folder contains all database migration scripts for the MTJF ERP system.

## Migration Files

### 1. Store Daily Reports
- **File**: `migration-store-daily-reports.sql`
- **Description**: Creates tables for store daily reports and related data
- **Tables**: `store_daily_reports`
- **Documentation**: `STORE_DAILY_REPORTS_MIGRATION.md`

### 2. Procurements Daily Reports
- **File**: `migration-procurements-daily-reports.sql`
- **Description**: Creates tables for procurements daily reports
- **Tables**: `procurements_daily_reports`
- **Documentation**: `PROCUREMENTS_DAILY_REPORTS_MIGRATION.md`

### 3. Accounts and Finance Daily Reports
- **File**: `migration-accounts-and-finance-daily-reports.sql`
- **Description**: Creates tables for accounts and finance daily reports
- **Tables**: `accounts_and_finance_daily_reports`
- **Documentation**: `ACCOUNTS_AND_FINANCE_DAILY_REPORTS_MIGRATION.md`

### 4. Application Reports
- **File**: `migration-application-reports.sql`
- **Description**: Creates tables for program application reports and applications
- **Tables**: `application_reports`, `applications`
- **Documentation**: `APPLICATION_REPORTS_MIGRATION.md`

## How to Run Migrations

### Option 1: Run Individual Migration
```bash
# Connect to your MySQL database and run:
mysql -u your_username -p your_database_name < migrations/migration-application-reports.sql
```

### Option 2: Run All Migrations
```bash
# Run all migration files in order:
for file in migrations/*.sql; do
    mysql -u your_username -p your_database_name < "$file"
done
```

### Option 3: Using MySQL Workbench
1. Open MySQL Workbench
2. Connect to your database
3. Open each .sql file
4. Execute the script

## Migration Order

Run migrations in this order to avoid dependency issues:

1. `migration-store-daily-reports.sql`
2. `migration-procurements-daily-reports.sql`
3. `migration-accounts-and-finance-daily-reports.sql`
4. `migration-application-reports.sql`

## Notes

- All migrations use `IF NOT EXISTS` to prevent errors if tables already exist
- Foreign key constraints are properly defined
- Indexes are created for performance optimization
- Sample data is included in some migrations for testing purposes
- All tables follow snake_case naming convention
- Timestamps are automatically managed with `created_at` and `updated_at` fields

## Backup Before Migration

Always backup your database before running migrations:

```bash
mysqldump -u your_username -p your_database_name > backup_before_migration.sql
``` 