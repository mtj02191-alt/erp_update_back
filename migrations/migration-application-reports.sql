-- Migration script for Application Reports and Applications tables
-- Run this script to create the necessary database tables

-- Create application_reports table
CREATE TABLE IF NOT EXISTS application_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project VARCHAR(255) NOT NULL,
    pending_last_month INT DEFAULT 0,
    application_count INT DEFAULT 0,
    investigation_count INT DEFAULT 0,
    approved_count INT DEFAULT 0,
    rejected_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    application_report_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_report_id) REFERENCES application_reports(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_application_reports_date ON application_reports(report_date);
CREATE INDEX idx_application_reports_created_at ON application_reports(created_at);
CREATE INDEX idx_applications_report_id ON applications(application_report_id);
CREATE INDEX idx_applications_project ON applications(project);

-- Insert sample data (optional)
INSERT INTO application_reports (report_date, notes) VALUES 
('2024-01-15', 'Daily application status report'),
('2024-01-16', 'Follow-up report on pending applications'),
('2024-01-17', 'Weekly summary report');

INSERT INTO applications (project, pending_last_month, application_count, investigation_count, approved_count, rejected_count, pending_count, application_report_id) VALUES 
('Youth Empowerment Program', 5, 12, 3, 2, 1, 2, 1),
('Women Skills Development', 3, 8, 2, 2, 0, 1, 1),
('Community Health Initiative', 2, 15, 5, 3, 1, 0, 2),
('Education Support Program', 0, 20, 8, 4, 1, 0, 3),
('Environmental Awareness', 1, 10, 4, 2, 0, 1, 3); 