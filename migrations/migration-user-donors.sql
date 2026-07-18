-- Migration: Create user_donors table
-- Description: Pivot table for many-to-many relationship between users and donors
-- Author: System
-- Date: 2025-01-10

-- Create user_donors table
CREATE TABLE user_donors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    donor_id INTEGER NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
    notes TEXT,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique assignment per user-donor pair
    UNIQUE(user_id, donor_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_donors_user_id ON user_donors(user_id);
CREATE INDEX idx_user_donors_donor_id ON user_donors(donor_id);
CREATE INDEX idx_user_donors_status ON user_donors(status);
CREATE INDEX idx_user_donors_assigned_by ON user_donors(assigned_by);
CREATE INDEX idx_user_donors_assigned_at ON user_donors(assigned_at);

-- Add comments for documentation
COMMENT ON TABLE user_donors IS 'Pivot table for many-to-many relationship between users and donors';
COMMENT ON COLUMN user_donors.user_id IS 'Reference to users table';
COMMENT ON COLUMN user_donors.donor_id IS 'Reference to donors table';
COMMENT ON COLUMN user_donors.status IS 'Assignment status: active, inactive, transferred';
COMMENT ON COLUMN user_donors.notes IS 'Additional notes about the assignment';
COMMENT ON COLUMN user_donors.assigned_by IS 'ID of the user who made this assignment';
COMMENT ON COLUMN user_donors.assigned_at IS 'When the donor was assigned to the user';
COMMENT ON COLUMN user_donors.updated_at IS 'Last time this assignment was updated';
