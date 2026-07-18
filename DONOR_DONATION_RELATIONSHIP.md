# Donor-Donation Foreign Key Relationship

## 📊 Database Relationship Analysis

### **Relationship Type: One-to-Many**
- **One Donor** → **Many Donations**
- A donor can make multiple donations over time
- Each donation belongs to one donor (or none if anonymous)

## 🔗 Entity Relationships

### **1. Donation Entity (Many Side)**
**File:** `src/donations/entities/donation.entity.ts`

```typescript
@Entity('donations')
export class Donation extends BaseEntity {
  // ============================================
  // FOREIGN KEY RELATIONSHIP TO DONOR
  // ============================================
  
  // ManyToOne relationship - Many donations belong to One donor
  @ManyToOne(() => Donor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'donor_id' })
  donor: Donor;

  // Foreign key column
  @Column({ nullable: true, default: null })
  donor_id: number;
  
  // ============================================
  // OTHER FIELDS
  // ============================================
  
  // Denormalized donor info (kept for historical/backup purposes)
  @Column({ type: 'varchar', nullable: true, default: null })
  donor_name: string;
  
  @Column({ type: 'varchar', nullable: true, default: null })
  donor_email: string;
  
  @Column({ type: 'varchar', nullable: true, default: null })
  donor_phone: string;
  
  // ... other donation fields
}
```

**Key Features:**
- ✅ `nullable: true` - Donations can exist without a donor (anonymous)
- ✅ `onDelete: 'SET NULL'` - If donor is deleted, donation remains but `donor_id` becomes null
- ✅ `@JoinColumn({ name: 'donor_id' })` - Specifies the foreign key column name
- ✅ Denormalized fields (`donor_name`, `donor_email`, `donor_phone`) preserved for historical data

### **2. Donor Entity (One Side)**
**File:** `src/dms/donor/entities/donor.entity.ts`

```typescript
@Entity('donors')
export class Donor extends BaseEntity {
  // ============================================
  // RELATIONSHIP TO DONATIONS
  // ============================================
  
  // OneToMany relationship - One donor has Many donations
  @OneToMany('Donation', 'donor')
  donations: any[];
  
  // ============================================
  // DONOR FIELDS
  // ============================================
  
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  phone: string;
  
  // Additional tracking fields
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_donated: number;

  @Column({ type: 'int', default: 0 })
  donation_count: number;

  @Column({ nullable: true, type: 'timestamp' })
  last_donation_date: Date;
  
  // ... other donor fields
}
```

**Key Features:**
- ✅ `@OneToMany('Donation', 'donor')` - String reference to avoid circular imports
- ✅ `donations` array - Access all donations for a donor
- ✅ Tracking fields - `total_donated`, `donation_count`, `last_donation_date`

## 🔄 Updated Auto-Registration Flow

### **DonationsService.create() Method:**
**File:** `src/donations/donations.service.ts`

```typescript
async create(createDonationDto: CreateDonationDto) {
  try {
    // ============================================
    // AUTO-REGISTER DONOR IF NOT EXISTS & LINK TO DONATION
    // ============================================
    let donorId: number | null = null;
    
    if (createDonationDto.donor_email && createDonationDto.donor_phone) {
      console.log(`🔍 Checking if donor exists: ${createDonationDto.donor_email} / ${createDonationDto.donor_phone}`);
      
      // Check if donor already exists with this email AND phone
      const existingDonor = await this.donorService.findByEmailAndPhone(
        createDonationDto.donor_email,
        createDonationDto.donor_phone
      );
      
      if (existingDonor) {
        console.log(`✅ Donor already exists: ${existingDonor.email} (ID: ${existingDonor.id})`);
        donorId = existingDonor.id;  // ✅ Use existing donor ID
      } else {
        console.log(`❌ Donor not found. Auto-registering...`);
        
        // Auto-register the donor
        const newDonor = await this.donorService.autoRegisterFromDonation({
          donor_name: createDonationDto.donor_name,
          donor_email: createDonationDto.donor_email,
          donor_phone: createDonationDto.donor_phone,
          city: createDonationDto.city,
          country: createDonationDto.country,
          address: createDonationDto.address,
        });
        
        if (newDonor) {
          console.log(`✅ Successfully auto-registered donor: ${newDonor.email} (ID: ${newDonor.id})`);
          donorId = newDonor.id;  // ✅ Use new donor ID
        } else {
          console.warn(`⚠️ Failed to auto-register donor, but continuing with donation...`);
        }
      }
    } else {
      console.log(`⚠️ Skipping donor auto-registration: missing email or phone`);
    }
    // ============================================
    
    // Create donation with donor_id if available
    const donation = this.donationRepository.create({
      ...createDonationDto,
      donor_id: donorId, // ✅ Link donation to donor via foreign key
    });
    const savedDonation = await this.donationRepository.save(donation);
    
    console.log(`💾 Donation saved with donor_id: ${donorId || 'null'} (Donation ID: ${savedDonation.id})`);
    
    // Continue with payment processing...
  }
}
```

## 📊 Database Schema

### **donors Table:**
```sql
CREATE TABLE donors (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NULL,  -- ✅ Nullable for auto-registered donors
  phone VARCHAR NOT NULL,
  name VARCHAR,
  city VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  address VARCHAR,
  donor_type VARCHAR DEFAULT 'individual',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  total_donated DECIMAL(10,2) DEFAULT 0,
  donation_count INT DEFAULT 0,
  last_donation_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- ... other fields
);
```

### **donations Table:**
```sql
CREATE TABLE donations (
  id SERIAL PRIMARY KEY,
  donor_id INT NULL,  -- ✅ Foreign key to donors table
  
  -- Denormalized donor info (for historical data)
  donor_name VARCHAR,
  donor_email VARCHAR,
  donor_phone VARCHAR,
  
  -- Donation details
  amount DECIMAL,
  currency VARCHAR,
  donation_type VARCHAR,
  donation_method VARCHAR,
  status VARCHAR DEFAULT 'pending',
  
  -- Project details
  project_id VARCHAR,
  project_name VARCHAR,
  
  -- Location
  city VARCHAR,
  country VARCHAR,
  address VARCHAR,
  
  -- Timestamps
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_donor
    FOREIGN KEY (donor_id)
    REFERENCES donors(id)
    ON DELETE SET NULL  -- ✅ Keep donation if donor deleted
);

-- Index for faster lookups
CREATE INDEX idx_donations_donor_id ON donations(donor_id);
```

## 🔄 Complete Flow Diagram

```
Donation Request
       |
       v
Extract donor info (email, phone)
       |
       v
Check: findByEmailAndPhone(email, phone)
       |
       ├─── Found ──────────────┐
       |                        |
       └─── Not Found           |
              |                 |
              v                 |
       autoRegisterFromDonation |
              |                 |
              v                 |
       Create donor (password=null)
              |                 |
              v                 |
       Save to donors table     |
              |                 |
              v                 v
       Get donor.id ────────> donorId
              |
              v
       Create donation with donor_id
              |
              v
       Save to donations table
              |
              v
       Database enforces foreign key
              |
              v
       Donation linked to Donor ✅
```

## 📋 Usage Examples

### **Example 1: Query Donations with Donor Info**
```typescript
// In DonationsService
async findAllWithDonors() {
  return await this.donationRepository.find({
    relations: ['donor'],  // ✅ Load donor relationship
    order: { created_at: 'DESC' }
  });
}

// Result:
{
  id: 123,
  amount: 1000,
  donor_id: 45,
  donor: {  // ✅ Populated donor object
    id: 45,
    email: 'john@example.com',
    name: 'John Doe',
    phone: '+1234567890'
  }
}
```

### **Example 2: Query Donor with All Donations**
```typescript
// In DonorService
async findOneWithDonations(id: number) {
  return await this.donorRepository.findOne({
    where: { id },
    relations: ['donations'],  // ✅ Load donations relationship
  });
}

// Result:
{
  id: 45,
  email: 'john@example.com',
  name: 'John Doe',
  donations: [  // ✅ Array of all donations
    { id: 123, amount: 1000, date: '2024-01-15' },
    { id: 124, amount: 2000, date: '2024-02-20' },
    { id: 125, amount: 1500, date: '2024-03-10' }
  ]
}
```

### **Example 3: Update Donor Statistics**
```typescript
// In DonorService
async updateDonationStats(donorId: number) {
  const donor = await this.donorRepository.findOne({
    where: { id: donorId },
    relations: ['donations']
  });
  
  if (donor) {
    // Calculate from related donations
    donor.donation_count = donor.donations.length;
    donor.total_donated = donor.donations.reduce((sum, d) => sum + d.amount, 0);
    donor.last_donation_date = new Date();
    
    await this.donorRepository.save(donor);
  }
}
```

## 🎯 Benefits of Foreign Key Relationship

### **✅ Data Integrity:**
- Database enforces referential integrity
- Cannot have invalid `donor_id` values
- `ON DELETE SET NULL` preserves donation history

### **✅ Query Efficiency:**
- Single query to get donor with all donations
- Indexed foreign key for fast lookups
- TypeORM handles joins automatically

### **✅ Data Consistency:**
- Single source of truth for donor info
- Denormalized fields preserved for historical data
- Easy to update donor info in one place

### **✅ Reporting & Analytics:**
```sql
-- Get total donations per donor
SELECT 
  d.id,
  d.name,
  d.email,
  COUNT(dn.id) as donation_count,
  SUM(dn.amount) as total_donated
FROM donors d
LEFT JOIN donations dn ON d.id = dn.donor_id
GROUP BY d.id, d.name, d.email
ORDER BY total_donated DESC;

-- Get donors who donated in last 30 days
SELECT DISTINCT d.*
FROM donors d
INNER JOIN donations dn ON d.id = dn.donor_id
WHERE dn.created_at >= NOW() - INTERVAL '30 days';
```

## 🔒 Data Safety Features

### **✅ Nullable Foreign Key:**
- Anonymous donations don't require a donor
- `donor_id` can be `null`
- Donation still has denormalized donor info

### **✅ ON DELETE SET NULL:**
- If donor account is deleted (GDPR, etc.)
- Donations remain in database
- `donor_id` becomes `null`
- Historical data preserved in denormalized fields

### **✅ Denormalized Fields:**
- `donor_name`, `donor_email`, `donor_phone` stored in donation
- Preserves snapshot of donor info at time of donation
- Useful for historical reports
- Not affected by donor updates/deletions

## 📊 Console Logs

### **New Donor:**
```bash
🔍 Checking if donor exists: john@example.com / +1234567890
❌ Donor not found. Auto-registering...
✅ Auto-registered donor WITHOUT password: john@example.com (ID: 45)
✅ Successfully auto-registered donor: john@example.com (ID: 45)
💾 Donation saved with donor_id: 45 (Donation ID: 123)
```

### **Existing Donor:**
```bash
🔍 Checking if donor exists: jane@example.com / +9876543210
✅ Donor already exists: jane@example.com (ID: 67)
💾 Donation saved with donor_id: 67 (Donation ID: 124)
```

### **Anonymous Donation:**
```bash
⚠️ Skipping donor auto-registration: missing email or phone
💾 Donation saved with donor_id: null (Donation ID: 125)
```

## 🎉 Summary

### **✅ What Was Implemented:**
1. **Foreign Key Relationship** - `donations.donor_id` → `donors.id`
2. **Auto-Link on Creation** - Donations automatically linked to donors
3. **Bidirectional Relationship** - Can query from either side
4. **Safe Deletion** - `ON DELETE SET NULL` preserves donations
5. **Denormalized Backup** - Historical donor info preserved

### **✅ Files Modified:**
1. `src/donations/entities/donation.entity.ts` - Already had relationship ✅
2. `src/dms/donor/entities/donor.entity.ts` - Cleaned up relationship syntax
3. `src/donations/donations.service.ts` - Added `donor_id` linking logic

### **✅ Key Features:**
- ✅ Automatic donor-donation linking
- ✅ Existing donor detection
- ✅ New donor auto-registration
- ✅ Foreign key constraint enforcement
- ✅ Historical data preservation
- ✅ Efficient querying with relations

**Donations are now properly linked to donors via foreign key relationship!** 🎉

