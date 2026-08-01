import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jsldrehffghgtbjylguw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_e-JXznbpwMNTNm1Ub8EFyw_fXS9FPRF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (typeof window !== 'undefined') {
  window.supabaseClient = supabase;
}

/**
 * Save an inquiry to Supabase table 'inquiries' (with fallback to 'bookings')
 * @param {Object} data { email, name, source, timestamp }
 */
export async function saveInquiryToSupabase(data) {
  const payload = {
    email: data.email,
    name: data.name || 'Website Visitor',
    source: data.source || 'Inquiry Form',
    timestamp: data.timestamp || Date.now(),
    created_at: new Date().toISOString()
  };

  // Always back up locally first
  try {
    const existing = JSON.parse(localStorage.getItem('horloge_bookings') || '[]');
    const localRecord = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...payload };
    existing.push(localRecord);
    localStorage.setItem('horloge_bookings', JSON.stringify(existing));
  } catch (e) {
    console.warn('LocalStorage backup warning:', e);
  }

  try {
    // Attempt insert to 'inquiries'
    let { data: res, error } = await supabase
      .from('inquiries')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Primary table "inquiries" insert error, trying "bookings":', error.message);
      let backupRes = await supabase
        .from('bookings')
        .insert([payload])
        .select();

      if (backupRes.error) {
        console.warn('Backup table "bookings" insert error:', backupRes.error.message);
        return { success: false, error: error.message, savedLocally: true };
      }
      return { success: true, data: backupRes.data, savedLocally: true };
    }

    return { success: true, data: res, savedLocally: true };
  } catch (err) {
    console.error('Supabase save exception:', err);
    return { success: false, error: err.message, savedLocally: true };
  }
}

/**
 * Fetch all inquiries from Supabase, falling back to localStorage if table doesn't exist
 */
export async function fetchInquiriesFromSupabase() {
  try {
    let { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to 'bookings' table
      let backup = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!backup.error && backup.data) {
        return { data: backup.data, source: 'supabase' };
      }
      // Return local storage data if table doesn't exist yet
      const local = JSON.parse(localStorage.getItem('horloge_bookings') || '[]');
      return { data: local, source: 'local', error: error.message };
    }

    return { data: data || [], source: 'supabase' };
  } catch (err) {
    console.error('Supabase fetch exception:', err);
    const local = JSON.parse(localStorage.getItem('horloge_bookings') || '[]');
    return { data: local, source: 'local', error: err.message };
  }
}
