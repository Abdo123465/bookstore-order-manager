import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.config';

// Initialize Supabase Client
export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Test connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('customers').select('count');
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
};
