# Common Filter Utility

A simple, reusable filtering utility for ERP systems to avoid code duplication across hundreds of APIs.

## Features

- **Search**: Search across multiple fields defined in `searchFields` array
- **Equality Filters**: Direct equality check for any entity field
- **Date Filtering**: 
  - `start_date` + `end_date` → BETWEEN query
  - `date` only → exact match
- **In-place Query Modification**: Modifies existing QueryBuilder

## Usage

### 1. Basic Usage

```typescript
import { applyCommonFilters, FilterPayload } from '../utils/filters/common-filter.util';

// Define searchable fields for your entity
const searchFields = ['name', 'email', 'description'];

// Start with your base query
const query = this.repository.createQueryBuilder('entity')
  .leftJoin('entity.user', 'user')
  .where('entity.isActive = :isActive', { isActive: true });

// Apply filters (modifies query in-place)
const filters: FilterPayload = {
  search: 'john',           // Searches in name, email, description
  status: 'active',         // entity.status = 'active'
  start_date: '2024-01-01', // entity.date >= '2024-01-01'
  end_date: '2024-12-31',   // entity.date <= '2024-12-31'
};

applyCommonFilters(query, filters, searchFields, 'entity');

// Continue adding more conditions if needed
query.andWhere('user.role = :role', { role: 'admin' });

// Execute
const results = await query.getManyAndCount();
```

### 2. Service Implementation

```typescript
async findAll(filters: FilterPayload = {}) {
  const searchFields = ['donor_name', 'donor_email', 'item_name'];
  
  const query = this.donationRepository.createQueryBuilder('donation');
  applyCommonFilters(query, filters, searchFields, 'donation');
  
  return await query.getManyAndCount();
}
```

### 3. Controller Implementation

```typescript
@Get()
async findAll(
  @Query('search') search?: string,
  @Query('status') status?: string,
  @Query('start_date') start_date?: string,
  @Query('end_date') end_date?: string,
) {
  const filters: FilterPayload = {
    search,
    status,
    start_date,
    end_date,
  };
  
  return await this.service.findAll(filters);
}
```

## Filter Payload Format

```typescript
interface FilterPayload {
  search?: string;        // Searches in searchFields array
  status?: string;        // entity.status = 'value'
  donation_type?: string; // entity.donation_type = 'value'
  date?: string;          // entity.date = 'value' (exact match)
  start_date?: string;    // entity.date >= 'value'
  end_date?: string;      // entity.date <= 'value'
  [key: string]: any;     // Any additional fields
}
```

## API Examples

```
GET /donations?search=john&status=completed&start_date=2024-01-01&end_date=2024-12-31
GET /users?search=admin&role=manager&date=2024-06-15
GET /orders?status=pending&customer_type=premium&start_date=2024-01-01
```

## Benefits

- ✅ **No Code Duplication**: Same filtering logic across all APIs
- ✅ **Consistent Interface**: Same filter format for all entities
- ✅ **Flexible**: Works with any entity and any fields
- ✅ **Type Safe**: TypeScript interfaces for better development experience
- ✅ **Performance**: Uses TypeORM QueryBuilder for optimized queries
