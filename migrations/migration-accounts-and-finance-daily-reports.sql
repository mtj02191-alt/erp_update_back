-- Migration: Create accounts_and_finance_daily_reports table
-- Date: 2024-12-19
-- Description: Create new table for accounts and finance daily reports with improved structure

-- Create the new table
CREATE TABLE IF NOT EXISTS `accounts_and_finance_daily_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `daily_inflow` decimal(10,2) NOT NULL,
  `daily_outflow` decimal(10,2) NOT NULL,
  `pending_payable` decimal(10,2) NOT NULL,
  `petty_cash` decimal(10,2) NOT NULL,
  `available_funds` decimal(10,2) NOT NULL,
  `tax_late_payments` decimal(10,2) NOT NULL,
  `payable_reports` decimal(10,2) NOT NULL,
  `restricted_funds_reports` decimal(10,2) NOT NULL,
  `payment_commitment_party_vise` decimal(10,2) NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_date` (`date`),
  KEY `IDX_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;