import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://mdnobmktdijxashunzbs.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbm9ibWt0ZGlqeGFzaHVuemJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTAyMTIsImV4cCI6MjEwNDg4NjIxMn0.jKoh60Y8pD285w3PfjKN5mDg2zwpjkHvcVcUfVqjkqE';

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project-id'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const STORAGE_KEY = 'youtuber_site_data';

export const getLocalSiteData = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const saveLocalSiteData = (data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    const existing = getLocalSiteData() || {};
    const updated = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }
};

export const isDefaultSupport = (sup) => false;
export const isDefaultSettings = (st) => false;

export const mergeWithUserPriority = (localData, cloudData) => {
  if (!cloudData || Object.keys(cloudData).length === 0) return localData || {};
  if (!localData || Object.keys(localData).length === 0) return cloudData;

  // Cloud Data (Supabase) takes precedence for multi-device sync across all devices!
  const mergedSettings = { ...(localData.settings || {}), ...(cloudData.settings || {}) };
  const mergedSupport = { ...(localData.support || {}), ...(cloudData.support || {}) };
  const mergedSubscribers = { ...(localData.subscribers || {}), ...(cloudData.subscribers || {}) };
  const mergedStreams = Array.isArray(cloudData.streams) && cloudData.streams.length > 0 ? cloudData.streams : (localData.streams || []);
  const mergedVideos = Array.isArray(cloudData.videos) && cloudData.videos.length > 0 ? cloudData.videos : (localData.videos || []);
  const mergedSocials = Array.isArray(cloudData.socials) && cloudData.socials.length > 0 ? cloudData.socials : (localData.socials || []);

  return {
    settings: mergedSettings,
    support: mergedSupport,
    subscribers: mergedSubscribers,
    streams: mergedStreams,
    videos: mergedVideos,
    socials: mergedSocials
  };
};

export const fetchAllSiteDataFromSupabase = async () => {
  const localData = getLocalSiteData();
  if (!supabase) return localData;
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
    const streams = streamsRes.status === 'fulfilled' && Array.isArray(streamsRes.value?.data) ? streamsRes.value.data : null;
    const videos = videosRes.status === 'fulfilled' && Array.isArray(videosRes.value?.data) ? videosRes.value.data : null;
    const subscribers = subsRes.status === 'fulfilled' && subsRes.value?.data ? subsRes.value.data : null;
    const support = supportRes.status === 'fulfilled' && supportRes.value?.data ? supportRes.value.data : null;
    const socials = socialsRes.status === 'fulfilled' && Array.isArray(socialsRes.value?.data) ? socialsRes.value.data : null;

    const result = {};
    if (settings) result.settings = settings;
    if (streams !== null) result.streams = streams;
    if (videos !== null) result.videos = videos;
    if (subscribers) result.subscribers = subscribers;
    if (support) result.support = support;
    if (socials !== null) result.socials = socials;

    const merged = mergeWithUserPriority(localData || {}, result);
    if (Object.keys(result).length > 0) {
      saveLocalSiteData(merged);
    }
    return merged;
  } catch (err) {
    console.warn('[Supabase Direct Fetch Error]:', err);
    return localData;
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

  try {
    if (editId) {
      const { data, error } = await supabase
        .from('streams')
        .update(payload)
        .eq('id', editId)
        .select();

      if (error) {
        console.warn('[Supabase saveStream update warning]:', error.message);
        const { data: insData, error: insErr } = await supabase
          .from('streams')
          .insert([payload])
          .select();
        if (insErr) console.warn('[Supabase saveStream insert warning]:', insErr.message);
        return insData;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('streams')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select();
      if (error) console.warn('[Supabase saveStream insert warning]:', error.message);
      return data;
    }
  } catch (err) {
    console.warn('[Supabase saveStream Exception]:', err);
    return null;
  }
};

export const deleteStreamFromSupabase = async (streamId) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('streams')
      .delete()
      .eq('id', streamId);
    if (error) console.warn('[Supabase deleteStream error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase deleteStream Exception]:', err);
    return null;
  }
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

  try {
    if (editId) {
      const { data, error } = await supabase
        .from('videos')
        .update(payload)
        .eq('id', editId)
        .select();

      if (error) {
        console.warn('[Supabase saveVideo update warning]:', error.message);
        const { data: insData, error: insErr } = await supabase
          .from('videos')
          .insert([payload])
          .select();
        if (insErr) console.warn('[Supabase saveVideo insert warning]:', insErr.message);
        return insData;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('videos')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select();
      if (error) console.warn('[Supabase saveVideo insert warning]:', error.message);
      return data;
    }
  } catch (err) {
    console.warn('[Supabase saveVideo Exception]:', err);
    return null;
  }
};

export const toggleTrendingVideoInSupabase = async (vidId, currentStatus) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('videos')
      .update({ is_trending: !currentStatus })
      .eq('id', vidId)
      .select();
    if (error) console.warn('[Supabase toggleTrending error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase toggleTrending Exception]:', err);
    return null;
  }
};

export const deleteVideoFromSupabase = async (vidId) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('videos')
      .delete()
      .eq('id', vidId);
    if (error) console.warn('[Supabase deleteVideo error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase deleteVideo Exception]:', err);
    return null;
  }
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
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .upsert(upsertData, { onConflict: 'id' })
      .select();
    if (error) console.warn('[Supabase saveSubscribers error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase saveSubscribers Exception]:', err);
    return null;
  }
};

export const saveSupportToSupabase = async (supportData) => {
  if (!supabase) return null;
  const upsertData = {
    id: 1,
    upi_id: supportData.upi_id || '',
    creator_name: supportData.creator_name || '',
    qr_code_url: supportData.qr_code_url || '',
    default_amount: Number(supportData.default_amount) || 100,
    support_message: supportData.support_message || '',
    updated_at: new Date().toISOString()
  };
  try {
    const { data, error } = await supabase
      .from('support_settings')
      .upsert(upsertData, { onConflict: 'id' })
      .select();
    if (error) console.warn('[Supabase saveSupport error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase saveSupport Exception]:', err);
    return null;
  }
};

export const saveSettingsToSupabase = async (settingsData) => {
  if (!supabase) return null;
  const upsertData = {
    id: 1,
    website_title: settingsData.website_title || '',
    creator_name: settingsData.creator_name || '',
    profile_image: settingsData.profile_image || '',
    logo_url: settingsData.logo_url || '',
    hero_welcome_text: settingsData.hero_welcome_text || '',
    hero_typing_texts: Array.isArray(settingsData.hero_typing_texts) ? settingsData.hero_typing_texts.join(', ') : (settingsData.hero_typing_texts || ''),
    youtube_channel_url: settingsData.youtube_channel_url || '',
    about_text: settingsData.about_text || '',
    updated_at: new Date().toISOString()
  };
  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert(upsertData, { onConflict: 'id' })
      .select();
    if (error) console.warn('[Supabase saveSettings error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase saveSettings Exception]:', err);
    return null;
  }
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
  try {
    const { data, error } = await supabase
      .from('social_links')
      .insert([payload])
      .select();
    if (error) console.warn('[Supabase addSocial error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase addSocial Exception]:', err);
    return null;
  }
};

export const deleteSocialFromSupabase = async (socialId) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('social_links')
      .delete()
      .eq('id', socialId);
    if (error) console.warn('[Supabase deleteSocial error]:', error.message);
    return data;
  } catch (err) {
    console.warn('[Supabase deleteSocial Exception]:', err);
    return null;
  }
};
