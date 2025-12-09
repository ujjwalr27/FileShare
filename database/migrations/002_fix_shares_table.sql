-- Fix shares table: This migration is now a no-op since the initial schema is already correct
-- The shares table already has share_token and share_url columns

-- Just ensure the index exists (it should from migration 001)
CREATE INDEX IF NOT EXISTS idx_shares_share_token ON shares(share_token);
