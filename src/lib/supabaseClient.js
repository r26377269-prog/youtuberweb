import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://mdnobmktdijxashunzbs.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbm9ibWt0ZGlqeGFzaHVuemJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTAyMTIsImV4cCI6MjEwNDg4NjIxMn0.jKoh60Y8pD285w3PfjKN5mDg2zwpjkHvcVcUfVqjkqE';

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project-id'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isDefaultSupport = (sup) => !sup || !sup.upi_id || sup.upi_id === 'creator@upi' || sup.upi_id.includes('fam_2f43d815507f5ee1714a857d7454c93c7e6e661e');
export const isDefaultSettings = (st) => !st || st.creator_name === 'ALEX VANCE';

export const mergeWithUserPriority = (existing, incoming) => {
  if (!incoming) return existing || {};
  if (!existing || Object.keys(existing).length === 0) return incoming;

  const mergedSettings = (existing.settings && !isDefaultSettings(existing.settings))
    ? { ...incoming.settings, ...existing.settings }
    : { ...(existing.settings || {}), ...(incoming.settings || {}) };

  const mergedSupport = (existing.support && !isDefaultSupport(existing.support))
    ? { ...incoming.support, ...existing.support }
    : { ...(existing.support || {}), ...(incoming.support || {}) };

  const mergedSubscribers = (existing.subscribers && existing.subscribers._userEdited)
    ? { ...incoming.subscribers, ...existing.subscribers }
    : { ...(existing.subscribers || {}), ...(incoming.subscribers || {}) };

  const mergedStreams = (Array.isArray(existing.streams) && existing.streams.length > 0 && existing._streamsUserEdited)
    ? existing.streams
    : (Array.isArray(incoming.streams) && incoming.streams.length > 0 ? incoming.streams : (existing.streams || []));

  const mergedVideos = (Array.isArray(existing.videos) && existing.videos.length > 0 && existing._videosUserEdited)
    ? existing.videos
    : (Array.isArray(incoming.videos) && incoming.videos.length > 0 ? incoming.videos : (existing.videos || []));

  const mergedSocials = (Array.isArray(existing.socials) && existing.socials.length > 0 && existing._socialsUserEdited)
    ? existing.socials
    : (Array.isArray(incoming.socials) && incoming.socials.length > 0 ? incoming.socials : (existing.socials || []));

  return {
    ...existing,
    settings: mergedSettings,
    support: mergedSupport,
    subscribers: mergedSubscribers,
    streams: mergedStreams,
    videos: mergedVideos,
    socials: mergedSocials
  };
};

export const fetchAllSiteDataFromSupabase = async () => {
  if (!supabase) return null;
  try {
    const [settingsRes, streamsRes, videosRes, subsRes, supportRes, socialsRes] = await Promise.allSettled([
      supabase.from('settings').select('*').single(),
      supabase.from('streams').select('*').order('created_at', { ascending: false }),
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
      supabase.from('subscribers').select('*').single(),
      supabase.from('support_settings').select('*').single(),
      supabase.from('social_links').select('*').order('sort_order', { ascending: true })
    ]);

    const settings = settingsRes.status === 'fulfilled' && settingsRes.value?.data ? settingsRes.value.data : null;
    const streams = streamsRes.status === 'fulfilled' && Array.isArray(streamsRes.value?.data) && streamsRes.value.data.length > 0 ? streamsRes.value.data : null;
    const videos = videosRes.status === 'fulfilled' && Array.isArray(videosRes.value?.data) && videosRes.value.data.length > 0 ? videosRes.value.data : null;
    const subscribers = subsRes.status === 'fulfilled' && subsRes.value?.data ? subsRes.value.data : null;
    const support = supportRes.status === 'fulfilled' && supportRes.value?.data ? supportRes.value.data : null;
    const socials = socialsRes.status === 'fulfilled' && Array.isArray(socialsRes.value?.data) && socialsRes.value.data.length > 0 ? socialsRes.value.data : null;

    if (!settings && !streams && !videos && !subscribers && !support && !socials) {
      return null;
    }

    const result = {};
    if (settings) result.settings = settings;
    if (streams) result.streams = streams;
    if (videos) result.videos = videos;
    if (subscribers) result.subscribers = subscribers;
    if (support) result.support = support;
    if (socials) result.socials = socials;

    return result;
  } catch (err) {
    console.warn('[Supabase Direct Fetch Error]:', err);
    return null;
  }
};
