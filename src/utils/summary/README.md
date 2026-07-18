# Summary Utility Module

A reusable date range utility for creating summary/statistics endpoints across different entities.

## Features

- **Flexible Duration Types**: year, month, week, day, custom
- **Default Behavior**: Current year if no parameters provided
- **Type-Safe**: TypeScript interfaces and validation
- **Reusable**: Can be used by any entity module

## Usage

### 1. Date Range Utility

The `DateRangeUtil` class provides date range calculation:

```typescript
import { DateRangeUtil, DateRangeOptions } from '../utils/summary/date-range.util';

// Current year (default)
const dateRange = DateRangeUtil.calculateDateRange({});

// Specific year
const dateRange = DateRangeUtil.calculateDateRange({ 
  duration: 'year',
  year: 2024 
});

// Specific month
const dateRange = DateRangeUtil.calculateDateRange({
  duration: 'month',
  year: 2024,
  month: 3 // March
});

// Specific week
const dateRange = DateRangeUtil.calculateDateRange({
  duration: 'week',
  year: 2024,
  week: 15 // Week 15
});

// Specific day
const dateRange = DateRangeUtil.calculateDateRange({
  duration: 'day',
  year: 2024,
  month: 3,
  day: 15
});

// Custom date range
const dateRange = DateRangeUtil.calculateDateRange({
  duration: 'custom',
  start_date: '2024-01-01',
  end_date: '2024-12-31'
});
```

### 2. Implementing Summary for Donations

**Service Method:**
```typescript
async getSummary(options: DateRangeOptions = {}) {
  // Calculate date range
  DateRangeUtil.validateOptions(options);
  const dateRange = DateRangeUtil.calculateDateRange(options);
  
  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;
  
  // Your aggregation queries here
  const queryBuilder = this.repository
    .createQueryBuilder('entity')
    .where('entity.created_at >= :startDate', { startDate })
    .andWhere('entity.created_at <= :endDate', { endDate });
  
  // ... perform aggregations
}
```

**Controller:**
```typescript
@Get()
async getSummary(
  @Query('duration') duration?: 'year' | 'month' | 'week' | 'day' | 'custom',
  @Query('year') year?: string,
  @Query('month') month?: string,
  @Query('week') week?: string,
  @Query('day') day?: string,
  @Query('start_date') startDate?: string,
  @Query('end_date') endDate?: string,
) {
  const options: DateRangeOptions = {};
  
  if (duration) options.duration = duration;
  if (year) options.year = parseInt(year, 10);
  if (month) options.month = parseInt(month, 10);
  if (week) options.week = parseInt(week, 10);
  if (day) options.day = parseInt(day, 10);
  if (startDate) options.start_date = startDate;
  if (endDate) options.end_date = endDate;
  
  return this.service.getSummary(options);
}
```

## API Examples

### Current Year (Default)
```
GET /donations/summary
```

### Specific Year
```
GET /donations/summary?duration=year&year=2023
```

### Specific Month
```
GET /donations/summary?duration=month&year=2024&month=3
```

### Specific Week
```
GET /donations/summary?duration=week&year=2024&week=15
```

### Specific Day
```
GET /donations/summary?duration=day&year=2024&month=3&day=15
```

### Custom Date Range
```
GET /donations/summary?duration=custom&start_date=2024-01-01&end_date=2024-03-31
```

## Extending to Other Entities

To add summary support to another entity (e.g., `donation-box`):

1. **Add method to service:**
   ```typescript
   // donation-box.service.ts
   async getSummary(options: DateRangeOptions = {}) {
     DateRangeUtil.validateOptions(options);
     const dateRange = DateRangeUtil.calculateDateRange(options);
     // ... your entity-specific aggregations
   }
   ```

2. **Create summary controller:**
   ```typescript
   // donation-box-summary.controller.ts
   @Controller('donation-box/summary')
   export class DonationBoxSummaryController {
     // ... similar to DonationsSummaryController
   }
   ```

3. **Register controller in module:**
   ```typescript
   controllers: [..., DonationBoxSummaryController]
   ```

## Response Format

The summary should return a consistent structure:

```typescript
{
  dateRange: {
    startDate: "2024-01-01T00:00:00.000Z",
    endDate: "2024-12-31T23:59:59.999Z",
    durationType: "year",
    description: "Year 2024"
  },
  totals: {
    totalCount: 150,
    totalAmount: 50000.00,
    // ... entity-specific totals
  },
  breakdowns: {
    byStatus: [...],
    byMethod: [...],
    // ... entity-specific breakdowns
  }
}
```

## Validation

The utility validates:
- Custom date ranges require both `start_date` and `end_date`
- `start_date` must be before `end_date`
- Month must be 1-12
- Week must be 1-52
- Day must be 1-31
- Date formats must be YYYY-MM-DD

## Notes

- Dates are calculated in the server's timezone
- Week calculation follows ISO 8601 standard (Monday as first day)
- All dates are inclusive (start and end dates include the full day)

