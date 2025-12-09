-- Fix any NULL storage_used values and recalculate actual storage usage
-- This migration ensures all users have accurate storage_used values

-- First, set any NULL storage_used to 0
UPDATE users 
SET storage_used = 0 
WHERE storage_used IS NULL;

-- Recalculate actual storage usage for all users based on their files
-- This creates a temporary function to calculate and update storage
DO $$
DECLARE
    user_record RECORD;
    calculated_storage BIGINT;
BEGIN
    FOR user_record IN SELECT id FROM users
    LOOP
        -- Calculate total storage used by this user's non-deleted files
        SELECT COALESCE(SUM(size), 0) INTO calculated_storage
        FROM files
        WHERE user_id = user_record.id AND is_deleted = false;
        
        -- Update the user's storage_used
        UPDATE users 
        SET storage_used = calculated_storage 
        WHERE id = user_record.id;
        
        RAISE NOTICE 'User % storage updated to % bytes', user_record.id, calculated_storage;
    END LOOP;
END $$;

-- Ensure storage_used is NOT NULL (defensive constraint)
ALTER TABLE users 
ALTER COLUMN storage_used SET NOT NULL;

-- Add a check constraint to ensure storage_used is never negative
ALTER TABLE users 
ADD CONSTRAINT check_storage_used_non_negative 
CHECK (storage_used >= 0);

-- Create an index on storage_used for faster queries
CREATE INDEX IF NOT EXISTS idx_users_storage_used ON users(storage_used);

-- Log the migration
INSERT INTO activity_logs (action, resource_type, metadata, created_at)
VALUES (
    'migration_applied',
    'user',
    '{"migration": "003_fix_storage_used", "description": "Fixed and recalculated storage_used for all users"}'::jsonb,
    CURRENT_TIMESTAMP
);
