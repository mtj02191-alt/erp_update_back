-- Migration script for procurements_daily_reports table
-- Run this script to create the new table structure

-- Create the new procurements_daily_reports table
CREATE TABLE IF NOT EXISTS procurements_daily_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    totalGeneratedPOs INT DEFAULT 0,
    pendingPOs INT DEFAULT 0,
    fulfilledPOs INT DEFAULT 0,
    totalGeneratedPIs INT DEFAULT 0,
    totalPaidAmount DECIMAL(10,2) DEFAULT 0.00,
    unpaidAmount DECIMAL(10,2) DEFAULT 0.00,
    unpaidPIs INT DEFAULT 0,
    tenders INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add unique constraint on date to prevent duplicate reports
    UNIQUE KEY unique_date (date),
    
    -- Add indexes for better query performance
    INDEX idx_date (date),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
);

-- Verify the table was created successfully
SELECT 'procurements_daily_reports table created successfully' as status;

-- Show table structure
DESCRIBE procurements_daily_reports; 