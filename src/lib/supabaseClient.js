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

  const mergedSettings = incoming.settings || existing.settings || {};
  const mergedSupport = incoming.support || existing.support || {};
  const mergedSubscribers = incoming.subscribers || existing.subscribers || {};
  const mergedStreams = Array.isArray(incoming.streams) && incoming.streams.length > 0 ? incoming.streams : (existing.streams || []);
  const mergedVideos = Array.isArray(incoming.videos) && incoming.videos.length > 0 ? incoming.videos : (existing.videos || []);
  const mergedSocials = Array.isArray(incoming.socials) && incoming.socials.length > 0 ? incoming.socials : (existing.socials || []);

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

// --- DIRECT SUPABASE MUTATIONS ---

export const saveStreamToSupabase = async (streamData, editId) => {
  if (!supabase) return null;
  const payload = {
    title: streamData.title,
    description: streamData.description || '',
    thumbnail_url: streamData.thumbnail_url || '',
    scheduled_date: streamData.scheduled_date || new Date().toISOString().split('T')[0],
    scheduled_time: streamData.scheduled_time || '19:00',
    youtube_url: streamData.youtube_url || '',
    status: streamData.status || 'UPCOMING'
  };

  if (editId) {
    const { data, error } = await supabase
      .from('streams')
      .update(payload)
      .eq('id', editId)
      .select();
    if (error) console.warn('[Supabase saveStream update error]:', error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('streams')
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select();
    if (error) console.warn('[Supabase saveStream insert error]:', error.message);
    return data;
  }
};

export const deleteStreamFromSupabase = async (streamId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('streams')
    .delete()
    .eq('id', streamId);
  if (error) console.warn('[Supabase deleteStream error]:', error.message);
  return data;
};

export const saveVideoToSupabase = async (videoData, editId) => {
  if (!supabase) return null;
  const payload = {
    title: videoData.title,
    description: videoData.description || '',
    youtube_url: videoData.youtube_url || '',
    thumbnail_url: videoData.thumbnail_url || '',
    category: videoData.category || 'Gaming',
    status: videoData.status || 'published',
    is_trending: Boolean(videoData.is_trending)
  };

  if (editId) {
    const { data, error } = await supabase
      .from('videos')
      .update(payload)
      .eq('id', editId)
      .select();
    if (error) console.warn('[Supabase saveVideo update error]:', error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('videos')
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select();
    if (error) console.warn('[Supabase saveVideo insert error]:', error.message);
    return data;
  }
};

export const toggleTrendingVideoInSupabase = async (vidId, currentStatus) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('videos')
    .update({ is_trending: !currentStatus })
    .eq('id', vidId)
    .select();
  if (error) console.warn('[Supabase toggleTrending error]:', error.message);
  return data;
};

export const deleteVideoFromSupabase = async (vidId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('id', vidId);
  if (error) console.warn('[Supabase deleteVideo error]:', error.message);
  return data;
};

export const saveSubscribersToSupabase = async (subData) => {
  if (!supabase) return null;
  const upsertData = {
    id: 1,
    count: Number(subData.count) || 0,
    counter_font: subData.counter_font || "'Bebas Neue', sans-serif",
    is_api_enabled: Boolean(subData.is_api_enabled),
    youtube_channel_id: subData.youtube_channel_id || '',
    youtube_api_key: subData.youtube_api_key || '',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('subscribers')
    .upsert(upsertData, { onConflict: 'id' })
    .select();
  if (error) console.warn('[Supabase saveSubscribers error]:', error.message);
  return data;
};

export const saveSupportToSupabase = async (supportData) => {
  if (!supabase) return null;
  const upsertData = {
    id: 1,
    upi_id: supportData.upi_id || 'creator@upi',
    creator_name: supportData.creator_name || 'ALEX VANCE',
    qr_code_url: supportData.qr_code_url || '',
    default_amount: Number(supportData.default_amount) || 100,
    support_message: supportData.support_message || '',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('support_settings')
    .upsert(upsertData, { onConflict: 'id' })
    .select();
  if (error) console.warn('[Supabase saveSupport error]:', error.message);
  return data;
};

export const saveSettingsToSupabase = async (settingsData) => {
  if (!supabase) return null;
  const upsertData = {
    id: 1,
    website_title: settingsData.website_title || 'CREATOR • Official YouTuber Website',
    creator_name: settingsData.creator_name || 'ALEX VANCE',
    profile_image: settingsData.profile_image || '',
    logo_url: settingsData.logo_url || '',
    hero_welcome_text: settingsData.hero_welcome_text || '',
    hero_typing_texts: Array.isArray(settingsData.hero_typing_texts) ? settingsData.hero_typing_texts.join(', ') : (settingsData.hero_typing_texts || ''),
    youtube_channel_url: settingsData.youtube_channel_url || '',
    about_text: settingsData.about_text || '',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('settings')
    .upsert(upsertData, { onConflict: 'id' })
    .select();
  if (error) console.warn('[Supabase saveSettings error]:', error.message);
  return data;
};

export const addSocialToSupabase = async (socialData) => {
  if (!supabase) return null;
  const payload = {
    platform: socialData.platform,
    url: socialData.url,
    icon_class: socialData.icon_class || 'fa-solid fa-link',
    is_active: true,
    sort_order: Number(socialData.sort_order) || 0
  };
  const { data, error } = await supabase
    .from('social_links')
    .insert([payload])
    .select();
  if (error) console.warn('[Supabase addSocial error]:', error.message);
  return data;
};

export const deleteSocialFromSupabase = async (socialId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('social_links')
    .delete()
    .eq('id', socialId);
  if (error) console.warn('[Supabase deleteSocial error]:', error.message);
  return data;
};
