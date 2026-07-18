# Donation API Integration Documentation

## Overview
This document provides comprehensive integration guidelines for the MTJ Foundation Donation API. The API supports multiple payment methods including online gateways (Meezan, Blinq, PayFast) and manual methods (cash, bank transfer, cheque, in-kind).

---

## Base Information

**Base URL:** `https://your-api-domain.com/api`  
**Endpoint:** `POST /donations`  
**Authentication:** Required (JWT Token)  
**Permissions Required:** `fund_raising.donations.create`, `super_admin`, or `fund_raising_manager`

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Request Body Structure

### Common Fields (All Donation Types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | ✅ Yes | Donation amount (minimum: 50 PKR) |
| `currency` | string | Optional | Currency code (default: "PKR") |
| `date` | string (ISO 8601) | Optional | Donation date |
| `donation_type` | string | Optional | Type: "zakat", "sadqa", "sadaqah", or "general" |
| `donation_method` | string | ✅ Yes | See [Donation Methods](#donation-methods) |
| `donation_source` | string | Optional | Source of donation |
| `project_id` | string | Optional | Associated project ID |
| `project_name` | string | Optional | Associated project name |

### Donor Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `donor_id` | number | Optional | Existing donor ID (if donor already exists) |
| `donor_name` | string | Conditional* | Donor's full name |
| `donor_email` | string | Conditional* | Valid email address |
| `donor_phone` | string | Conditional* | Phone number |
| `country` | string | Optional | Country |
| `city` | string | Optional | City |
| `address` | string | Optional | Full address |

**Note:** *If `donor_id` is not provided, then `donor_email` AND `donor_phone` are required for auto-registration.

---

## Donation Methods

### 1. Online Payment Methods

#### 1.1 Meezan Bank (`donation_method: "meezan"`)

**Description:** Integration with Meezan Bank payment gateway. Supports separate credentials for Zakat and Sadqa donations.

**Required Fields:**
- `amount` (minimum: 50 PKR)
- `donation_type` ("zakat" or "sadqa")
- `donor_email` + `donor_phone` (or `donor_id`)

**Request Example:**
```json
{
  "amount": 1000,
  "currency": "PKR",
  "donation_type": "zakat",
  "donation_method": "meezan",
  "donor_name": "John Doe",
  "donor_email": "john@example.com",
  "donor_phone": "+923001234567",
  "country": "Pakistan",
  "city": "Karachi"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Donation created successfully",
  "data": {
    "paymentUrl": "https://acquiring.meezanbank.com/payment/rest/..."
  }
}
```

**Response Fields:**
- `paymentUrl`: Redirect user to this URL to complete payment

**Environment Variables Required:**
- `MEEZAN_URL`: Meezan API base URL
- `MEEZAN_USER` / `MEEZAN_PASS`: For Sadqa donations
- `MEEZAN_ZAKAT_USER` / `MEEZAN_ZAKAT_PASS`: For Zakat donations
- `BASE_Frontend_URL`: Frontend return URL

**Payment Flow:**
1. API creates donation record with status `registered`
2. Returns `paymentUrl` to redirect user
3. User completes payment on Meezan gateway
4. Meezan redirects to `BASE_Frontend_URL/thanks?donation_id={id}`
5. Status updates via callback/webhook

---

#### 1.2 Blinq (`donation_method: "blinq"`)

**Description:** Integration with Blinq payment gateway.

**Required Fields:**
- `amount` (minimum: 50 PKR)
- `donor_email` + `donor_phone` (or `donor_id`)

**Request Example:**
```json
{
  "amount": 500,
  "currency": "PKR",
  "donation_type": "sadqa",
  "donation_method": "blinq",
  "donor_name": "Jane Smith",
  "donor_email": "jane@example.com",
  "donor_phone": "+923001234568",
  "city": "Lahore"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Donation created successfully",
  "data": {
    "paymentUrl": "https://api.blinq.pk/payment/..."
  }
}
```

**Environment Variables Required:**
- `BLINQ_ID`: Blinq Client ID
- `BLINQ_PASS`: Blinq Client Secret
- `BLINQ_CALLBACK_SECRET`: For callback verification (optional, falls back to `BLINQ_PASS`)

**Payment Flow:**
1. API authenticates with Blinq
2. Creates invoice on Blinq
3. Returns `paymentUrl` (ClickToPayUrl)
4. User completes payment
5. Blinq sends callback to `/donations/public/blinq/callback`
6. Status updates to `completed` on successful payment

---

#### 1.3 PayFast (`donation_method: "payfast"`)

**Description:** Integration with PayFast payment gateway.

**Required Fields:**
- `amount` (minimum: 50 PKR)
- `donor_email` + `donor_phone` (or `donor_id`)

**Request Example:**
```json
{
  "amount": 2000,
  "currency": "PKR",
  "donation_type": "general",
  "donation_method": "payfast",
  "donor_name": "Ahmed Ali",
  "donor_email": "ahmed@example.com",
  "donor_phone": "+923001234569"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Donation created successfully",
  "data": {
    "paymentUrl": "https://payfast.io/...",
    "BASKET_ID": "12345",
    "TXNAMT": "2000"
  }
}
```

**Environment Variables Required:**
- PayFast credentials configured in `PayfastService`
- `PF_MERCHANT_ID`: PayFast Merchant ID
- `PF_SECURED_KEY`: PayFast Secret Key

**Payment Flow:**
1. API gets access token from PayFast
2. Returns payment URL and transaction details
3. User completes payment
4. PayFast sends IPN to `/donations/public/payfast/ipn`
5. Status updates based on `err_code`:
   - `"00"` or `"000"` → `completed`
   - Other → `failed`

---

### 2. Manual Payment Methods

#### 2.1 Cash (`donation_method: "cash"`)

**Request Example:**
```json
{
  "amount": 5000,
  "currency": "PKR",
  "donation_type": "sadqa",
  "donation_method": "cash",
  "donor_name": "Fatima Khan",
  "donor_email": "fatima@example.com",
  "donor_phone": "+923001234570",
  "date": "2025-01-06T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Donation created successfully",
  "data": {
    "id": 12345,
    "amount": 5000,
    "status": "pending",
    "donation_method": "cash",
    ...
  }
}
```

---

#### 2.2 Bank Transfer (`donation_method: "bank_transfer"`)

**Request Example:**
```json
{
  "amount": 10000,
  "currency": "PKR",
  "donation_type": "zakat",
  "donation_method": "bank_transfer",
  "donor_name": "Hassan Raza",
  "donor_email": "hassan@example.com",
  "donor_phone": "+923001234571"
}
```

---

#### 2.3 Credit Card (Manual) (`donation_method: "credit_card"`)

**Request Example:**
```json
{
  "amount": 3000,
  "currency": "PKR",
  "donation_type": "general",
  "donation_method": "credit_card",
  "donor_name": "Sara Ahmed",
  "donor_email": "sara@example.com",
  "donor_phone": "+923001234572"
}
```

---

#### 2.4 Cheque (`donation_method: "cheque"`)

**Additional Fields:**
- `cheque_number`: Cheque number
- `bank_name`: Bank name

**Request Example:**
```json
{
  "amount": 15000,
  "currency": "PKR",
  "donation_type": "sadqa",
  "donation_method": "cheque",
  "cheque_number": "CHQ123456",
  "bank_name": "HBL",
  "donor_name": "Ali Hassan",
  "donor_email": "ali@example.com",
  "donor_phone": "+923001234573"
}
```

---

#### 2.5 In-Kind Donation (`donation_method: "in_kind"`)

**Additional Fields:**
- `in_kind_items`: Array of in-kind items

**Item Structure:**
```typescript
{
  name: string;                    // Required
  item_code?: string;              // Optional
  description?: string;             // Optional
  category?: string;               // clothing, food, medical, educational, electronics, furniture, books, toys, household, other
  condition?: string;              // new, like_new, good, fair, poor
  quantity: number;                 // Required
  estimated_value?: number;        // Optional
  brand?: string;                  // Optional
  model?: string;                  // Optional
  size?: string;                   // Optional
  color?: string;                  // Optional
  collection_date: string;         // Required (ISO 8601)
  collection_location?: string;    // Optional
  notes?: string;                  // Optional
}
```

**Request Example:**
```json
{
  "amount": 0,
  "currency": "PKR",
  "donation_type": "general",
  "donation_method": "in_kind",
  "donor_name": "Zainab Malik",
  "donor_email": "zainab@example.com",
  "donor_phone": "+923001234574",
  "in_kind_items": [
    {
      "name": "Winter Clothes",
      "category": "clothing",
      "condition": "good",
      "quantity": 50,
      "estimated_value": 50000,
      "collection_date": "2025-01-10T00:00:00.000Z",
      "collection_location": "Karachi Warehouse",
      "notes": "Mixed sizes"
    },
    {
      "name": "Rice Bags",
      "category": "food",
      "condition": "new",
      "quantity": 100,
      "estimated_value": 150000,
      "collection_date": "2025-01-10T00:00:00.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Donation created successfully",
  "data": {
    "id": 12346,
    "donation_method": "in_kind",
    "status": "pending",
    ...
  }
}
```

---

## Auto-Donor Registration

The API automatically registers donors if they don't exist:

**Logic:**
1. If `donor_id` is provided → Uses existing donor
2. If `donor_email` AND `donor_phone` are provided → Searches for existing donor
3. If donor not found → Auto-registers new donor
4. If donor found but archived → Returns error: "Donor is archived"
5. Links donation to donor via `donor_id`

**Important:**
- Donor must be active and not archived
- If auto-registration fails, donation still proceeds (with warning)

---

## Notifications

When a donation is created, the system automatically:
1. Creates notifications for:
   - User ID 5 (if exists and active)
   - All users in FUND_RAISING department
   - All users with ADMIN role
2. Notification includes:
   - Title: "New Donation Received"
   - Message: Amount and donor name
   - Link: `/donations/online_donations/view/{donation_id}`
   - Metadata: donation_id, amount, donation_type, donation_method

---

## Error Responses

### Validation Errors (400 Bad Request)

```json
{
  "success": false,
  "message": "Donation amount is less than 50 PKR",
  "data": null
}
```

**Common Error Messages:**
- `"Donation amount is less than 50 PKR"` - Amount validation failed
- `"Donor is archived"` - Donor exists but is archived
- `"Invalid donation method"` - Unsupported donation method
- `"Zakat Meezan credentials not configured"` - Missing environment variables
- `"Blinq Token is not valid"` - Blinq authentication failed
- `"Blinq invoice created but ClickToPayUrl missing"` - Blinq API error

### Not Found Errors (404 Not Found)

```json
{
  "success": false,
  "message": "Donation with ID {id} not found",
  "data": null
}
```

### Server Errors (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Failed to create donation: {error details}",
  "data": null
}
```

---

## Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 201 | Created | Donation created successfully |
| 400 | Bad Request | Validation error or invalid input |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

---

## Integration Examples

### JavaScript/TypeScript (Axios)

```javascript
const createDonation = async (donationData) => {
  try {
    const response = await axios.post(
      'https://your-api-domain.com/api/donations',
      donationData,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      // For online payments, redirect to paymentUrl
      if (response.data.data.paymentUrl) {
        window.location.href = response.data.data.paymentUrl;
      } else {
        // Manual donation - show success message
        console.log('Donation created:', response.data.data);
      }
    }
  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
  }
};

// Example: Meezan donation
createDonation({
  amount: 1000,
  currency: "PKR",
  donation_type: "zakat",
  donation_method: "meezan",
  donor_name: "John Doe",
  donor_email: "john@example.com",
  donor_phone: "+923001234567"
});
```

### cURL

```bash
curl -X POST https://your-api-domain.com/api/donations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "PKR",
    "donation_type": "sadqa",
    "donation_method": "blinq",
    "donor_name": "Jane Smith",
    "donor_email": "jane@example.com",
    "donor_phone": "+923001234568"
  }'
```

### Python (Requests)

```python
import requests

def create_donation(donation_data, jwt_token):
    url = "https://your-api-domain.com/api/donations"
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, json=donation_data, headers=headers)
    
    if response.status_code == 201:
        data = response.json()
        if data.get("success"):
            return data.get("data")
    else:
        raise Exception(response.json().get("message"))
    
    return None

# Example usage
donation = create_donation({
    "amount": 500,
    "currency": "PKR",
    "donation_type": "general",
    "donation_method": "cash",
    "donor_name": "Ahmed Ali",
    "donor_email": "ahmed@example.com",
    "donor_phone": "+923001234569"
}, jwt_token="YOUR_JWT_TOKEN")
```

---

## Payment Gateway Callbacks

### PayFast IPN
**Endpoint:** `POST /donations/public/payfast/ipn`  
**Description:** PayFast sends IPN (Instant Payment Notification) to this endpoint

### Blinq Callback
**Endpoint:** `POST /donations/public/blinq/callback`  
**Description:** Blinq sends payment status updates to this endpoint

### Status Update
**Endpoint:** `GET /donations/public/update-status?id={donation_id}&order_id={order_id}`  
**Description:** Public endpoint to manually update donation status

---

## Testing Checklist

- [ ] JWT token is valid and has required permissions
- [ ] Amount is at least 50 PKR
- [ ] Donor information is provided (email + phone OR donor_id)
- [ ] Donation method is valid
- [ ] For Meezan: donation_type is "zakat" or "sadqa"
- [ ] For in_kind: in_kind_items array is provided
- [ ] Payment gateway credentials are configured
- [ ] Callback URLs are accessible

---

## Support

For integration support, contact:
- **Email:** dev@mtjfoundation.org
- **Documentation:** This file
- **API Base URL:** Check with backend team

---

## Version History

- **v1.0** - Initial documentation
- Supports: Meezan, Blinq, PayFast, Cash, Bank Transfer, Credit Card, Cheque, In-Kind

---

**Last Updated:** January 2025

