import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Regular client for authentication (use dummy values if env vars missing for dev)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storageKey: 'salon-admin-auth',
      autoRefreshToken: true,
      persistSession: true
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: { 'x-client-info': 'salon-admin-panel' }
    }
  }
);

// Admin client with service role key - bypasses RLS
// Use this for admin operations that need elevated privileges
// Note: Only create this if service role key is available to avoid duplicate instances
export const supabaseAdmin = supabaseServiceRoleKey && supabaseServiceRoleKey !== supabaseAnonKey
  ? createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )
  : supabase; // Fallback to regular client if no service role key

// Helper to check if user is admin
export const isAdminUser = async (userId) => {
  try {
    // Check profiles table (not auth.users) for role
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      return false;
    }
    
    return data?.role === 'admin' || data?.role === 'super_admin';
  } catch (error) {
    return false;
  }
};
