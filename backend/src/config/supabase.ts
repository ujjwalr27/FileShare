import { createClient } from '@supabase/supabase-js';
import config from './index';

// Extract Supabase URL and key from DATABASE_URL or use explicit env vars
const getSupabaseConfig = () => {
  // Option 1: Explicit env vars (preferred)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_KEY,
    };
  }

  // Option 2: Extract from DATABASE_URL
  // Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  // or: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const projectRefMatch = dbUrl.match(/postgres\.([a-zA-Z0-9]+):|@db\.([a-zA-Z0-9]+)\.supabase/);
    
    if (projectRefMatch) {
      const projectRef = projectRefMatch[1] || projectRefMatch[2];
      const supabaseUrl = `https://${projectRef}.supabase.co`;
      
      // For storage, we need the anon key - this should be set explicitly
      if (process.env.SUPABASE_ANON_KEY) {
        return {
          url: supabaseUrl,
          key: process.env.SUPABASE_ANON_KEY,
        };
      }
    }
  }

  throw new Error('Supabase configuration not found. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
};

const supabaseConfig = getSupabaseConfig();

export const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

export default supabase;
