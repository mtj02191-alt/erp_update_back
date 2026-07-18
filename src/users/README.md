# User Management - Password Change Functionality

## Overview
This module provides secure password change functionality for the ERP system with two distinct endpoints:

1. **Self-Service Password Change**: Users can change their own passwords
2. **Admin Password Change**: Administrators can change any user's password

## API Endpoints

### 1. Self-Service Password Change
**Endpoint**: `POST /users/change-password`
**Description**: Allows users to change their own password
**Authentication**: Required (JWT)
**Permissions**: `users.update` or `super_admin`

**Request Body**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123!",
  "confirmPassword": "newPassword123!"
}
```

**Response**:
```json
{
  "message": "Password changed successfully"
}
```

### 2. Admin Password Change
**Endpoint**: `POST /users/:id/change-password`
**Description**: Allows administrators to change any user's password
**Authentication**: Required (JWT)
**Permissions**: `users.update` or `super_admin`

**Request Body**:
```json
{
  "newPassword": "newPassword123!",
  "confirmPassword": "newPassword123!"
}
```

**Response**:
```json
{
  "message": "Password changed successfully"
}
```

## Password Requirements

All passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*(),.?":{}|<>)

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
2. **Current Password Verification**: Self-service changes require current password verification
3. **Admin Authorization**: Only admin users can change other users' passwords
4. **Input Validation**: Comprehensive validation on both frontend and backend
5. **Error Handling**: Secure error messages that don't leak sensitive information

## Frontend Integration

The UpdateUser component in the admin panel provides a user-friendly interface for password changes:
- Password strength indicator
- Show/hide password toggle
- Real-time validation feedback
- Confirmation matching
- Error handling and success notifications

## Error Handling

Common error scenarios:
- **400 Bad Request**: Invalid input data or validation failures
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: User not found
- **409 Conflict**: Current password incorrect or other business logic errors

 