# Application Reports Migration

This migration creates the database structure for the Program module's Application Reports feature.

## Overview

The Application Reports system allows tracking of various program applications with detailed status counts. Each report can contain multiple applications, and each application tracks different stages of the application process.

## Tables Created

### 1. `application_reports` Table

**Purpose**: Stores the main application report metadata.

**Columns**:
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY) - Unique identifier
- `report_date` (DATE, NOT NULL) - Date of the report
- `notes` (TEXT, NULLABLE) - Additional notes or comments
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Record last update timestamp

**Indexes**:
- `idx_application_reports_date` - On `report_date` for date-based queries
- `idx_application_reports_created_at` - On `created_at` for sorting

### 2. `applications` Table

**Purpose**: Stores individual application data within each report.

**Columns**:
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY) - Unique identifier
- `project` (VARCHAR(255), NOT NULL) - Name of the project/program
- `pending_last_month` (INT, DEFAULT 0) - Applications pending from previous month
- `application_count` (INT, DEFAULT 0) - Total new applications received
- `investigation_count` (INT, DEFAULT 0) - Applications under investigation
- `approved_count` (INT, DEFAULT 0) - Applications that have been approved
- `rejected_count` (INT, DEFAULT 0) - Applications that have been rejected
- `pending_count` (INT, DEFAULT 0) - Applications currently pending
- `application_report_id` (INT, NOT NULL) - Foreign key to application_reports
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Record last update timestamp

**Foreign Key**:
- `application_report_id` → `application_reports(id)` with CASCADE DELETE

**Indexes**:
- `idx_applications_report_id` - On `application_report_id` for joins
- `idx_applications_project` - On `project` for project-based queries

## Data Flow

```
Application Report (1) ←→ (Many) Applications
```

- One application report can contain multiple applications
- When an application report is deleted, all its applications are automatically deleted (CASCADE)
- Each application belongs to exactly one report

## Sample Data

The migration includes sample data to demonstrate the structure:

### Sample Application Reports:
1. **2024-01-15**: Daily application status report
2. **2024-01-16**: Follow-up report on pending applications  
3. **2024-01-17**: Weekly summary report

### Sample Applications:
- Youth Empowerment Program
- Women Skills Development
- Community Health Initiative
- Education Support Program
- Environmental Awareness

## API Endpoints

After running this migration, the following API endpoints will be available:

- `POST /application-reports` - Create new application report
- `GET /application-reports` - List all reports with pagination
- `GET /application-reports/:id` - Get specific report with applications
- `PATCH /application-reports/:id` - Update existing report
- `DELETE /application-reports/:id` - Delete report (cascades to applications)

## Frontend Integration

This migration supports the existing frontend structure:

- **Create Form**: Supports multiple applications per report
- **List View**: Shows reports with application summaries
- **View Page**: Displays detailed application information
- **Update Form**: Allows editing of reports and applications

## Validation Rules

The backend enforces the following validation:

- All count fields must be non-negative integers
- Project names are required and cannot be empty
- Report dates are required
- Applications array is required (minimum 1 application)

## Performance Considerations

- Indexes are created on frequently queried fields
- Foreign key relationships are optimized
- Pagination is supported for large datasets
- Eager loading of applications is implemented

## Rollback

To rollback this migration:

```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS application_reports;
```

## Dependencies

This migration has no dependencies on other tables and can be run independently.

## Testing

After running the migration, test the following:

1. Create a new application report with multiple applications
2. Verify that applications are properly linked to reports
3. Test pagination and sorting functionality
4. Verify that deleting a report cascades to delete its applications
5. Test the API endpoints with the frontend application 