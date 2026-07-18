# Donor Management System (DMS)

Complete donor management system supporting both Individual and CSR (Corporate Social Responsibility) donors.

## Features

- ✅ **Dual Donor Types**: Individual & CSR/Corporate donors
- ✅ **Password Hashing**: Bcrypt with salt rounds
- ✅ **Authentication Ready**: Email/password validation
- ✅ **Smart Filtering**: Uses common filter utility
- ✅ **Pagination & Sorting**: Full support for large datasets
- ✅ **Donation Tracking**: Total donated, count, last donation date
- ✅ **Soft Delete**: Deactivate instead of hard delete
- ✅ **Password Management**: Change password with validation

## API Endpoints

### 1. Register Donor (Public)
**POST** `/donors`

**Individual Donor Payload:**
```json
{
  "donor_type": "individual",
  "email": "ahmed.khan@gmail.com",
  "password": "SecurePass123!",
  "phone": "03001234567",
  "address": "House 45, Street 12, F-7",
  "city": "Islamabad",
  "country": "Pakistan",
  "postal_code": "",
  "notes": "",
  "name": "Ahmed Khan",
  "first_name": "Ahmed",
  "last_name": "Khan"
}
```

**CSR Donor Payload:**
```json
{
  "donor_type": "csr",
  "email": "donations@mtjfoundation.org",
  "password": "SecurePass2024!",
  "phone": "042-12345678",
  "address": "123 Foundation Road",
  "city": "Karachi",
  "country": "Pakistan",
  "postal_code": "75300",
  "notes": "Annual corporate donation program",
  "name": "MTJ Foundation",
  "company_name": "MTJ Foundation",
  "company_registration": "0123456-7",
  "contact_person": "Ali Hassan",
  "designation": "Finance Manager",
  "company_address": "MTJ Tower, Block A, Gulberg III, Lahore",
  "company_phone": "042-11223344",
  "company_email": "info@mtjfoundation.org"
}
```

### 2. Get All Donors
**GET** `/donors?page=1&pageSize=10&search=ahmed&donor_type=individual`

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10)
- `sortField` - Field to sort by (default: created_at)
- `sortOrder` - ASC or DESC (default: DESC)
- `search` - Search term (searches across multiple fields)
- `donor_type` - Filter by type: individual or csr
- `city` - Filter by city
- `country` - Filter by country
- `is_active` - Filter by active status
- `start_date` - Filter by registration date (from)
- `end_date` - Filter by registration date (to)

**Permissions Required:** `donors.view`, `super_admin`, `fund_raising_manager`, `fund_raising_user`

### 3. Get Donor by ID
**GET** `/donors/:id`

**Permissions Required:** `donors.view`, `super_admin`, `fund_raising_manager`, `fund_raising_user`

### 4. Update Donor
**PATCH** `/donors/:id`

**Permissions Required:** `donors.update`, `super_admin`, `fund_raising_manager`

### 5. Deactivate Donor
**DELETE** `/donors/:id`

**Permissions Required:** `donors.delete`, `super_admin`, `fund_raising_manager`

### 6. Change Password
**POST** `/donors/:id/change-password`

**Payload:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123!",
  "confirmPassword": "newPassword123!"
}
```

**Permissions Required:** `donors.update`, `super_admin`, `fund_raising_manager`

## Password Requirements

All passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*(),.?":{}|<>)

## Donor Entity Structure

### Common Fields (All Donors)
- `id` - Unique identifier
- `donor_type` - individual or csr
- `email` - Unique email address
- `password` - Hashed password
- `phone` - Contact phone
- `address` - Physical address
- `city` - City name
- `country` - Country name
- `postal_code` - Postal/ZIP code
- `notes` - Additional notes
- `is_active` - Active status
- `created_at` - Registration date
- `updated_at` - Last update date

### Individual Donor Fields
- `name` - Full name
- `first_name` - First name
- `last_name` - Last name

### CSR/Corporate Donor Fields
- `company_name` - Company name
- `company_registration` - Registration number
- `contact_person` - Primary contact person
- `designation` - Contact person's designation
- `company_address` - Company address
- `company_phone` - Company phone
- `company_email` - Company email

### Donation Tracking Fields
- `total_donated` - Total amount donated
- `donation_count` - Number of donations
- `last_donation_date` - Date of last donation

## Service Methods

### Core Methods
- `create(createDonorDto)` - Register new donor
- `findAll(options)` - Get all donors with filters
- `findOne(id)` - Get donor by ID
- `findByEmail(email)` - Find donor by email
- `validateDonor(email, password)` - Authenticate donor
- `update(id, updateDto)` - Update donor info
- `changePassword(id, currentPass, newPass)` - Change password
- `remove(id)` - Soft delete (deactivate)

### Helper Methods
- `updateDonationStats(donorId, amount)` - Update donation statistics
- `validatePasswordStrength(password)` - Validate password requirements

## Security Features

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **Password Validation**: Strong password requirements
3. **Email Uniqueness**: Prevents duplicate registrations
4. **Soft Delete**: Preserves donor history
5. **Permission-Based Access**: Role-based endpoint protection
6. **Password Removal**: Passwords never sent in responses

## Integration with Donations

The donor service includes `updateDonationStats()` method that should be called when a donation is completed:

```typescript
// In donations service after successful donation
await this.donorService.updateDonationStats(donorId, donationAmount);
```

## Frontend Integration

### Individual Donor Registration Form
```typescript
const individualDonor = {
  donor_type: 'individual',
  email: formData.email,
  password: formData.password,
  phone: formData.phone,
  city: formData.city,
  country: formData.country,
  name: formData.name,
  first_name: formData.firstName,
  last_name: formData.lastName,
  // ... other fields
};
```

### CSR Donor Registration Form
```typescript
const csrDonor = {
  donor_type: 'csr',
  email: formData.email,
  password: formData.password,
  phone: formData.phone,
  city: formData.city,
  country: formData.country,
  company_name: formData.companyName,
  contact_person: formData.contactPerson,
  designation: formData.designation,
  // ... other fields
};
```

## Error Handling

Common error scenarios:
- **409 Conflict**: Email already exists
- **400 Bad Request**: Validation errors
- **404 Not Found**: Donor not found
- **401 Unauthorized**: Authentication failed
- **403 Forbidden**: Insufficient permissions

## Database Migration

Make sure to run TypeORM migrations to create the donors table:

```bash
npm run migration:generate -- -n CreateDonorsTable
npm run migration:run
```

## Testing

Test the registration endpoint:
```bash
curl -X POST http://localhost:3000/donors \
  -H "Content-Type: application/json" \
  -d '{"donor_type":"individual","email":"test@example.com","password":"SecurePass123!","phone":"1234567890","city":"Lahore","country":"Pakistan","name":"Test User"}'
```

