-- Add metadata column to files table for ML features
-- This column stores JSON data for OCR results, summaries, PII detection, and ML categorization

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE files ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_files_metadata ON files USING gin(metadata);

-- Add index for ML category queries
CREATE INDEX IF NOT EXISTS idx_files_ml_category ON files ((metadata->'ml_category'));

-- Add index for PII detection queries
CREATE INDEX IF NOT EXISTS idx_files_pii ON files ((metadata->'pii_detection'));
