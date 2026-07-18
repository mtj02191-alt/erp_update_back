# Donation Box Module

## 📋 Overview
Complete module for managing donation boxes (collection boxes) placed at shops and locations across different regions.

## 🏗️ Architecture

### **Entity: DonationBox**
- Extends `BaseEntity` (includes: id, created_at, updated_at, is_archived, created_by, updated_by)
- Tracks box location, shop details, and collection statistics
- Uses enums for box_type and status

### **Key Features:**
- ✅ Full CRUD operations
- ✅ Pagination and filtering
- ✅ Search across multiple fields
- ✅ Collection statistics tracking
- ✅ Soft delete (archiving)
- ✅ Role-based permissions
- ✅ Active box queries by region

## 📊 Database Schema

### **Table: donation_boxes**

```sql
CREATE TABLE donation_boxes (
  -- Base Entity Fields (from BaseEntity)
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  created_by INT,
  updated_by INT,
  
  -- Box Identification
  box_id_no VARCHAR UNIQUE NOT NULL,
  key_no VARCHAR,
  
  -- Location Details
  region VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  route VARCHAR,
  
  -- Shop Details
  shop_name VARCHAR NOT NULL,
  shopkeeper VARCHAR,
  cell_no VARCHAR,
  landmark_marketplace VARCHAR,
  
  -- Box Details
  box_type ENUM('small', 'medium', 'large', 'custom') DEFAULT 'medium',
  status ENUM('active', 'inactive', 'maintenance', 'retired') DEFAULT 'active',
  
  -- Reference & Dates
  frd_officer_reference VARCHAR,
  active_since DATE NOT NULL,
  last_collection_date DATE,
  
  -- Collection Statistics
  total_collected DECIMAL(10,2) DEFAULT 0,
  collection_count INT DEFAULT 0,
  
  -- Additional Info
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_donation_boxes_box_id_no ON donation_boxes(box_id_no);
CREATE INDEX idx_donation_boxes_region ON donation_boxes(region);
CREATE INDEX idx_donation_boxes_city ON donation_boxes(city);
CREATE INDEX idx_donation_boxes_status ON donation_boxes(status);
CREATE INDEX idx_donation_boxes_active ON donation_boxes(is_active, is_archived);
```

## 🎯 API Endpoints

### **1. Create Donation Box**
```http
POST /donation-boxes
```

**Permissions:** `donation_boxes.create`, `super_admin`, `fund_raising_manager`

**Request Body:**
```json
{
  "box_id_no": "BOX-001",
  "key_no": "KEY-123",
  "region": "Punjab",
  "city": "Lahore",
  "shop_name": "ABC Store",
  "shopkeeper": "John Doe",
  "cell_no": "+92-300-1234567",
  "landmark_marketplace": "Main Market",
  "route": "Route A",
  "box_type": "medium",
  "status": "active",
  "frd_officer_reference": "OFF-001",
  "active_since": "2024-01-15",
  "notes": "Near main entrance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Donation box created successfully",
  "data": {
    "id": 1,
    "box_id_no": "BOX-001",
    "region": "Punjab",
    "city": "Lahore",
    ...
  }
}
```

### **2. Get All Donation Boxes**
```http
GET /donation-boxes?page=1&pageSize=10&search=ABC&region=Punjab
```

**Permissions:** `donation_boxes.view`, `super_admin`, `fund_raising_manager`, `fund_raising_user`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 10)
- `sortField` (string): Field to sort by (default: 'created_at')
- `sortOrder` ('ASC' | 'DESC'): Sort direction (default: 'DESC')
- `search` (string): Search across multiple fields
- `region` (string): Filter by region
- `city` (string): Filter by city
- `box_type` (string): Filter by box type
- `status` (string): Filter by status
- `is_active` (boolean): Filter by active status
- `start_date` (string): Filter from date
- `end_date` (string): Filter to date

**Response:**
```json
{
  "success": true,
  "message": "Donation boxes retrieved successfully",
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

### **3. Get Donation Box by ID**
```http
GET /donation-boxes/:id
```

**Permissions:** `donation_boxes.view`, `super_admin`, `fund_raising_manager`, `fund_raising_user`

### **4. Get Donation Box by Box ID Number**
```http
GET /donation-boxes/by-box-id/:box_id_no
```

**Permissions:** `donation_boxes.view`, `super_admin`, `fund_raising_manager`, `fund_raising_user`

### **5. Get Active Boxes by Region**
```http
GET /donation-boxes/active-by-region/:region
```

**Permissions:** `donation_boxes.view`, `super_admin`, `fund_raising_manager`, `fund_raising_user`

### **6. Update Donation Box**
```http
PATCH /donation-boxes/:id
```

**Permissions:** `donation_boxes.update`, `super_admin`, `fund_raising_manager`

### **7. Delete (Archive) Donation Box**
```http
DELETE /donation-boxes/:id
```

**Permissions:** `donation_boxes.delete`, `super_admin`, `fund_raising_manager`

### **8. Update Collection Statistics**
```http
POST /donation-boxes/:id/collection
```

**Permissions:** `donation_boxes.update`, `super_admin`, `fund_raising_manager`

**Request Body:**
```json
{
  "amount": 5000
}
```

**What it does:**
- Adds amount to `total_collected`
- Increments `collection_count`
- Updates `last_collection_date`

## 🔍 Searchable Fields

The search parameter searches across:
- `box_id_no`
- `key_no`
- `shop_name`
- `shopkeeper`
- `cell_no`
- `landmark_marketplace`
- `route`
- `frd_officer_reference`

## 📝 Enums

### **BoxType**
```typescript
enum BoxType {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  CUSTOM = 'custom',
}
```

### **BoxStatus**
```typescript
enum BoxStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}
```

## 💡 Usage Examples

### **Example 1: Create a New Box**
```javascript
const boxData = {
  box_id_no: "BOX-KHI-001",
  key_no: "KEY-001",
  region: "Sindh",
  city: "Karachi",
  shop_name: "Al-Madina Store",
  shopkeeper: "Ali Ahmed",
  cell_no: "+92-321-7654321",
  landmark_marketplace: "Tariq Road Market",
  route: "Route B",
  box_type: "medium",
  status: "active",
  frd_officer_reference: "OFF-KHI-05",
  active_since: "2024-02-01"
};

const response = await axios.post('/donation-boxes', boxData);
```

### **Example 2: Search and Filter**
```javascript
const response = await axios.get('/donation-boxes', {
  params: {
    page: 1,
    pageSize: 20,
    search: 'Al-Madina',
    region: 'Sindh',
    status: 'active',
    sortField: 'created_at',
    sortOrder: 'DESC'
  }
});
```

### **Example 3: Record Collection**
```javascript
const boxId = 1;
const collectionAmount = 5000;

const response = await axios.post(`/donation-boxes/${boxId}/collection`, {
  amount: collectionAmount
});
```

### **Example 4: Get Active Boxes for Route Planning**
```javascript
const response = await axios.get('/donation-boxes/active-by-region/Punjab');
// Returns all active boxes in Punjab, sorted by city and shop name
```

## 🔒 Permissions

Required permissions for each operation:
- **Create:** `donation_boxes.create`
- **View:** `donation_boxes.view`
- **Update:** `donation_boxes.update`
- **Delete:** `donation_boxes.delete`
- **Super Admin:** `super_admin` (access to all)
- **Manager:** `fund_raising_manager` (access to all)
- **User:** `fund_raising_user` (view only)

## 📦 Module Structure

```
src/dms/donation_box/
├── entities/
│   └── donation-box.entity.ts          # Entity with BaseEntity
├── dto/
│   ├── create-donation-box.dto.ts      # Validation for create
│   └── update-donation-box.dto.ts      # Validation for update
├── donation-box.controller.ts          # REST API endpoints
├── donation-box.service.ts             # Business logic
├── donation-box.module.ts              # NestJS module
├── donation-box.controller.spec.ts     # Controller tests
├── donation-box.service.spec.ts        # Service tests
└── README.md                           # This file
```

## 🎯 Key Features

### **1. BaseEntity Integration**
- Automatic timestamps (`created_at`, `updated_at`)
- Soft delete support (`is_archived`)
- Audit tracking (`created_by`, `updated_by`)
- Auto-increment primary key (`id`)

### **2. Collection Tracking**
- `total_collected`: Cumulative amount collected
- `collection_count`: Number of times collected
- `last_collection_date`: Most recent collection date

### **3. Smart Filtering**
- Full-text search across multiple fields
- Region and city filtering
- Status and type filtering
- Date range filtering
- Active/inactive filtering

### **4. Validation**
- Required fields validation
- Enum validation for box_type and status
- Unique box_id_no constraint
- Date format validation

## 🚀 Integration with Other Modules

### **With Donations Module:**
```typescript
// Link donation to donation box
const donation = {
  ...donationData,
  donation_box_id: boxId  // Foreign key to donation_box
};
```

### **With Routes Module:**
```typescript
// Get all boxes for a route
const boxes = await donationBoxService.findActiveByRegion('Punjab');
const routeBoxes = boxes.filter(box => box.route === 'Route A');
```

## 📈 Future Enhancements

### **Potential Features:**
1. **QR Code Generation:** Generate QR codes for each box
2. **GPS Tracking:** Add lat/long coordinates
3. **Photo Upload:** Store box photos
4. **Maintenance Schedule:** Track maintenance dates
5. **Performance Analytics:** Dashboard for collections
6. **Route Optimization:** AI-based collection route planning
7. **Mobile App Integration:** Field officer app for updates
8. **SMS Notifications:** Alert when box needs collection

## ✅ Summary

**The donation_box module is production-ready with:**
- ✅ Complete CRUD operations
- ✅ BaseEntity integration
- ✅ Comprehensive validation
- ✅ Role-based security
- ✅ Advanced filtering and search
- ✅ Collection statistics tracking
- ✅ Follows donor module pattern exactly
- ✅ Clean, maintainable code structure

**Ready to manage donation boxes across your organization!** 🎉

