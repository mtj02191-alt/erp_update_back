# Donor Migration Controller

## 📋 Overview
Migration controller to migrate existing donation data to the new normalized donor structure.

## 🚀 Migration Steps

### **Step 1: Create Donors from Donations**
```bash
POST http://localhost:3000/donations/migration/create-donors
```

**What it does:**
- Reads all donations with donor info (email, phone)
- Creates unique donors in the `donors` table
- Skips if donor already exists
- Password set to `null` for all auto-created donors

### **Step 2: Link Donations to Donors**
```bash
POST http://localhost:3000/donations/migration/link-donations
```

**What it does:**
- Finds all donations without `donor_id`
- Matches them to donors by email + phone
- Updates `donor_id` foreign key in donations table

### **Step 3: Check Migration Status**
```bash
GET http://localhost:3000/donations/migration/status
```

**What it shows:**
- Total donations vs linked donations
- Total donors vs auto-registered donors
- Migration completion percentage

## 📊 Current State

### **Donation Entity:**
- ✅ Has `donor_id` foreign key column
- ✅ Has `donor` relationship
- ✅ Still has denormalized fields (`donor_name`, `donor_email`, `donor_phone`)
- ⏳ Denormalized fields will be removed after testing

### **Donor Entity:**
- ✅ Has `donations` relationship
- ✅ Password is nullable
- ✅ City and country are nullable

## 🎯 Usage

1. **Run migration:**
   ```bash
   # Step 1: Create all donors
   curl -X POST http://localhost:3000/donations/migration/create-donors
   
   # Step 2: Link donations to donors
   curl -X POST http://localhost:3000/donations/migration/link-donations
   
   # Step 3: Check status
   curl http://localhost:3000/donations/migration/status
   ```

2. **Test the migration:**
   - Query donations with donor info
   - Verify donor_id is set correctly
   - Check donor table for new records

3. **After successful testing:**
   - Remove denormalized fields from donation entity
   - Update queries to use relationships

## ✅ Files Created/Modified

1. **`src/donations/migration.controller.ts`** - Migration endpoints
2. **`src/donations/donations.module.ts`** - Added MigrationController
3. **`src/dms/donor/donor.module.ts`** - Export TypeOrmModule
4. **`src/donations/entities/donation.entity.ts`** - No changes (kept as-is for now)

**Ready to migrate!** 🎉

