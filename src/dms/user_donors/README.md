# User-Donors Module

This module manages the many-to-many relationship between users and donors in the MTJ Foundation ERP system. It allows users to be assigned to multiple donors for feedback collection, lead generation, and relationship management.

## Features

- **Assignment Management**: Assign donors to users with status tracking
- **Transfer Operations**: Transfer donors between users
- **Status Tracking**: Track assignment status (active, inactive, transferred)
- **Audit Trail**: Track who assigned what and when
- **Statistics**: Get assignment statistics and reports

## Database Schema

### user_donors Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table |
| donor_id | INTEGER | Foreign key to donors table |
| status | VARCHAR(20) | Assignment status (active, inactive, transferred) |
| notes | TEXT | Additional notes about the assignment |
| assigned_by | INTEGER | ID of user who made the assignment |
| assigned_at | TIMESTAMP | When the assignment was created |
| updated_at | TIMESTAMP | Last update timestamp |

## API Endpoints

### Basic CRUD Operations

- `POST /user-donors` - Create new assignment
- `GET /user-donors` - Get all assignments (paginated)
- `GET /user-donors/:id` - Get specific assignment
- `PATCH /user-donors/:id` - Update assignment
- `DELETE /user-donors/:id` - Deactivate assignment

### Specialized Operations

- `POST /user-donors/assign` - Assign donor to user
- `POST /user-donors/transfer` - Transfer donor between users
- `GET /user-donors/user/:userId/donors` - Get donors assigned to user
- `GET /user-donors/donor/:donorId/users` - Get users assigned to donor
- `GET /user-donors/stats` - Get assignment statistics

## Usage Examples

### Assign Donor to User

```typescript
const assignment = await userDonorsService.assignDonor({
  user_id: 1,
  donor_id: 5,
  assigned_by: 2,
  notes: 'High priority donor for follow-up'
});
```

### Transfer Donor

```typescript
const transfer = await userDonorsService.transferDonor({
  donor_id: 5,
  from_user_id: 1,
  to_user_id: 3,
  assigned_by: 2,
  notes: 'Transferring due to workload redistribution'
});
```

### Get User's Assigned Donors

```typescript
const donors = await userDonorsService.getUserAssignedDonors(1, 'active');
```

## Permissions

The module requires the following permissions:

- `user_donors.create` - Create assignments
- `user_donors.view` - View assignments
- `user_donors.update` - Update assignments
- `user_donors.delete` - Delete assignments
- `super_admin` - Full access

## Status Values

- **active**: Assignment is currently active
- **inactive**: Assignment has been deactivated
- **transferred**: Assignment was transferred to another user

## Business Rules

1. A donor can only be assigned to one user at a time (active status)
2. When transferring, the old assignment is marked as 'transferred'
3. All assignments are soft-deleted (status changed to 'inactive')
4. Assignment history is preserved for audit purposes
5. Users can only manage assignments they have permission for

## Integration

This module integrates with:

- **Users Module**: For user management and permissions
- **Donors Module**: For donor information and management
- **Auth Module**: For authentication and authorization
- **Permissions Module**: For role-based access control

## Migration

Run the migration script to create the database table:

```sql
-- See migrations/migration-user-donors.sql
```

## Testing

The module includes comprehensive test coverage:

- Unit tests for service methods
- Integration tests for API endpoints
- Validation tests for DTOs
- Permission tests for access control
