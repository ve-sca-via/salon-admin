import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please create a .env file with:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_anon_key');
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
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
      console.error('Error checking admin status:', error);
      return false;
    }
    
    console.log('User role check:', { userId, role: data?.role });
    return data?.role === 'admin' || data?.role === 'super_admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
