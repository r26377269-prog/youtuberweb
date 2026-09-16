import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://mdnobmktdijxashunzbs.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbm9ibWt0ZGlqeGFzaHVuemJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTAyMTIsImV4cCI6MjEwNDg4NjIxMn0.jKoh60Y8pD285w3PfjKN5mDg2zwpjkHvcVcUfVqjkqE';

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project-id'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const fetchAllSiteDataFromSupabase = async () => {
  if (!supabase) return null;
  try {
    const [settingsRes, streamsRes, videosRes, subsRes, supportRes, socialsRes] = await Promise.all([
      supabase.from('settings').select('*').single(),
      supabase.from('streams').select('*').order('created_at', { ascending: false }),
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
      supabase.from('subscribers').select('*').single(),
      supabase.from('support_settings').select('*').single(),
      supabase.from('social_links').select('*').order('sort_order', { ascending: true })
    ]);

    const settings = settingsRes.data || null;
    const streams = streamsRes.data || null;
    const videos = videosRes.data || null;
    const subscribers = subsRes.data || null;
    const support = supportRes.data || null;
    const socials = socialsRes.data || null;

    if (!settings && !streams && !videos && !subscribers && !support && !socials) {
      return null;
    }

    return {
      settings: settings || {},
      streams: streams || [],
      videos: videos || [],
      subscribers: subscribers || {},
      support: support || {},
      socials: socials || []
    };
  } catch (err) {
    console.warn('[Supabase Direct Fetch Error]:', err);
    return null;
  }
};
