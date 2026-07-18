-- Migration: Create store_daily_reports table
-- Run this script to create the new table structure

CREATE TABLE IF NOT EXISTS store_daily_reports (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    demand_generated INTEGER DEFAULT 0,
    pending_demands INTEGER DEFAULT 0,
    generated_grn INTEGER DEFAULT 0,
    pending_grn INTEGER DEFAULT 0,
    rejected_demands INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_daily_reports_date ON store_daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_store_daily_reports_created_by ON store_daily_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_store_daily_reports_created_at ON store_daily_reports(created_at);

-- Optional: Migrate existing data from store table (if needed)
-- INSERT INTO store_daily_reports (date, demand_generated, pending_demands, generated_grn, pending_grn, rejected_demands, created_by, created_at)
-- SELECT date, demand_generated, pending_demands, generated_grn, pending_grn, rejected_demands, created_by, created_at
-- FROM store;

-- Optional: Drop the old store table after migration (uncomment when ready)
-- DROP TABLE IF EXISTS store; 