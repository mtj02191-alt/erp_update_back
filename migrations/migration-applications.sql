-- Migration script for Applications table
-- Run this script to create the applications table for job applications

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    applicant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    resume_url VARCHAR(500) NOT NULL,
    cover_letter TEXT NOT NULL,
    project_id INTEGER NULL,
    department_id INTEGER NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_project_id ON applications(project_id);
CREATE INDEX idx_applications_department_id ON applications(department_id);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_is_archived ON applications(is_archived);

-- Create unique constraint on email to prevent duplicate applications
ALTER TABLE applications ADD CONSTRAINT uk_applications_email UNIQUE (email);

-- Add comments for documentation
COMMENT ON TABLE applications IS 'Stores job application submissions with resume and cover letter';
COMMENT ON COLUMN applications.applicant_name IS 'Full name of the applicant';
COMMENT ON COLUMN applications.email IS 'Email address of the applicant (unique)';
COMMENT ON COLUMN applications.phone_number IS 'Contact phone number of the applicant';
COMMENT ON COLUMN applications.resume_url IS 'URL to the uploaded resume file';
COMMENT ON COLUMN applications.cover_letter IS 'Cover letter text content';
COMMENT ON COLUMN applications.project_id IS 'Optional reference to specific project';
COMMENT ON COLUMN applications.department_id IS 'Optional reference to specific department';
COMMENT ON COLUMN applications.is_archived IS 'Flag to mark application as archived';
COMMENT ON COLUMN applications.created_by IS 'User who created the application record';
COMMENT ON COLUMN applications.updated_by IS 'User who last updated the application record';
COMMENT ON COLUMN applications.created_at IS 'Timestamp when application was created';
COMMENT ON COLUMN applications.updated_at IS 'Timestamp when application was last updated';
