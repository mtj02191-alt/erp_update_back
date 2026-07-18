# Gold & Silver Price Module

This module manages gold and silver prices fetched from an external API, stores them in the database, and provides endpoints to retrieve current and historical prices.

## Features

- ✅ Fetch prices from external API
- ✅ Store prices in database with date tracking
- ✅ Get latest prices
- ✅ Get prices by specific date
- ✅ Daily automatic price updates via cron job
- ✅ Paginated list of all prices

## API Endpoints

### 1. Fetch and Store Price
```
GET /gold-silver-price/fetch?date=2024-01-15
```
- **Description**: Fetches price from external API and stores in database
- **Query Parameters**:
  - `date` (optional): Date in YYYY-MM-DD format. If not provided, fetches current date price
- **Response**:
```json
{
  "success": true,
  "message": "Price fetched and stored successfully",
  "data": {
    "id": 1,
    "gold_price": "123.45",
    "silver_price": "12.34",
    "price_date": "2024-01-15",
    "created_at": "2024-01-15T09:00:00.000Z"
  }
}
```

### 2. Get Latest Price
```
GET /gold-silver-price/latest
```
- **Description**: Returns the most recent price from database
- **Response**:
```json
{
  "success": true,
  "message": "Latest price retrieved successfully",
  "data": {
    "id": 1,
    "gold_price": "123.45",
    "silver_price": "12.34",
    "price_date": "2024-01-15"
  }
}
```

### 3. Get Price by Date
```
GET /gold-silver-price/date?date=2024-01-15
```
- **Description**: Returns price for a specific date
- **Query Parameters**:
  - `date` (required): Date in YYYY-MM-DD format
- **Response**:
```json
{
  "success": true,
  "message": "Price retrieved successfully",
  "data": {
    "id": 1,
    "gold_price": "123.45",
    "silver_price": "12.34",
    "price_date": "2024-01-15"
  }
}
```

### 4. Get All Prices (Paginated)
```
GET /gold-silver-price?page=1&pageSize=10
```
- **Description**: Returns paginated list of all prices
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `pageSize` (optional): Items per page (default: 10)
- **Response**:
```json
{
  "success": true,
  "message": "Prices retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Cron Job

The module includes a daily cron job that automatically fetches and updates prices:

- **Schedule**: Every day at 9:00 AM (Asia/Karachi timezone)
- **Service**: `GoldSilverPriceCronService`
- **Method**: `handleDailyPriceUpdate()`

### Changing Cron Schedule

Edit `gold-silver-price-cron.service.ts`:

```typescript
// Run at 9 AM daily (current)
@Cron(CronExpression.EVERY_DAY_AT_9AM, {
  name: 'fetch-daily-gold-silver-prices',
  timeZone: 'Asia/Karachi',
})

// Or use custom cron expression
@Cron('0 9 * * *', {  // 9 AM daily
  name: 'fetch-daily-gold-silver-prices',
  timeZone: 'Asia/Karachi',
})

// Run at midnight
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
  name: 'fetch-daily-gold-silver-prices',
  timeZone: 'Asia/Karachi',
})
```

## Environment Variables

Add to your `.env` file:

```env
# Metal Price API Key for gold/silver prices
METAL_PRICE_API_KEY=your_api_key_here
```

**API Details:**
- **Provider**: Metal Price API (https://metalpriceapi.com)
- **Endpoint**: `https://api.metalpriceapi.com/v1/latest`
- **Latest Prices**: `GET /v1/latest?api_key=YOUR_API_KEY&base=PKR&currencies=XAU,XAG`
- **Historical Prices**: `GET /v1/YYYY-MM-DD?api_key=YOUR_API_KEY&base=PKR&currencies=XAU,XAG`
- **XAU**: Gold (per ounce in PKR)
- **XAG**: Silver (per ounce in PKR)

**Get API Key**: Sign up at https://metalpriceapi.com to get your API key.

## API Response Format

The service uses Metal Price API with the following response format:

```json
{
  "success": true,
  "base": "PKR",
  "date": "2024-01-15",
  "rates": {
    "XAU": 123.45,  // Gold price per ounce in PKR
    "XAG": 12.34     // Silver price per ounce in PKR
  }
}
```

**Note**: 
- Prices are in Pakistani Rupees (PKR) per ounce
- XAU = Gold (1 troy ounce)
- XAG = Silver (1 troy ounce)
- The API automatically returns the latest date or the date specified in the historical endpoint

## Database Schema

### `gold_silver_prices` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key (auto-increment) |
| `gold_price` | decimal(10,2) | Gold price |
| `silver_price` | decimal(10,2) | Silver price |
| `price_date` | date | Date of the price (unique) |
| `api_response` | text | Raw API response (optional) |
| `is_archived` | boolean | Soft delete flag |
| `created_by` | integer | User who created (FK to users) |
| `updated_by` | integer | User who updated (FK to users) |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Update timestamp |

## Usage Examples

### Fetch Current Price
```bash
curl -X GET "http://localhost:8080/gold-silver-price/fetch"
```

### Fetch Price for Specific Date
```bash
curl -X GET "http://localhost:8080/gold-silver-price/fetch?date=2024-01-15"
```

### Get Latest Price
```bash
curl -X GET "http://localhost:8080/gold-silver-price/latest"
```

### Get Price by Date
```bash
curl -X GET "http://localhost:8080/gold-silver-price/date?date=2024-01-15"
```

### Get All Prices (Paginated)
```bash
curl -X GET "http://localhost:8080/gold-silver-price?page=1&pageSize=10"
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here",
  "data": null
}
```

Common errors:
- **400 Bad Request**: Invalid date format, missing required parameters
- **404 Not Found**: No price found for the specified date
- **500 Internal Server Error**: API connection issues, database errors

## Testing

1. **Test Manual Fetch**:
   ```bash
   GET /gold-silver-price/fetch
   ```

2. **Test Latest Price**:
   ```bash
   GET /gold-silver-price/latest
   ```

3. **Test Date Query**:
   ```bash
   GET /gold-silver-price/date?date=2024-01-15
   ```

4. **Test Cron Job**:
   - Wait for scheduled time (9 AM)
   - Or manually trigger by calling the service method
   - Check logs for cron execution

## Notes

- Prices are stored with unique date constraint (one price per date)
- If price for a date already exists, it will be updated
- Cron job runs automatically - no manual intervention needed
- API response format should be configured based on your actual API structure
- All prices are stored with timestamps for audit trail

