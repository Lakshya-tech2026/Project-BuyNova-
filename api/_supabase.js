const { createClient } = require('@supabase/supabase-js');

function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url && 
    key && 
    !url.includes('YOUR_PROJECT') && 
    !url.includes('your-project-id') &&
    url.startsWith('http')
  );
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase server credentials are not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY in your environment variables or .env file.');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = { getSupabaseAdmin, isSupabaseConfigured };
