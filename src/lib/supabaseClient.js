import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const getValidUUID = (id) => {
  if (isUUID(id)) return id;
  return generateUUID();
};

export const isDefaultSupport = () => false;
export const isDefaultSettings = () => false;

export const mergeWithUserPriority = (localData, cloudData) => {
  if (!cloudData || Object.keys(cloudData).length === 0) return {};
  return {
    settings: cloudData.settings || {},
    support: cloudData.support || {},
    subscribers: cloudData.subscribers || {},
    streams: Array.isArray(cloudData.streams) ? cloudData.streams : [],
    videos: Array.isArray(cloudData.videos) ? cloudData.videos : [],
    socials: Array.isArray(cloudData.socials) ? cloudData.socials : []
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
    const streams = streamsRes.status === 'fulfilled' && Array.isArray(streamsRes.value?.data) ? streamsRes.value.data : [];
    const videos = videosRes.status === 'fulfilled' && Array.isArray(videosRes.value?.data) ? videosRes.value.data : [];
    const subscribers = subsRes.status === 'fulfilled' && subsRes.value?.data ? subsRes.value.data : null;
    const support = supportRes.status === 'fulfilled' && supportRes.value?.data ? supportRes.value.data : null;
    const socials = socialsRes.status === 'fulfilled' && Array.isArray(socialsRes.value?.data) ? socialsRes.value.data : [];

    const result = {};
    if (settings) result.settings = settings;
    if (streams) result.streams = streams;
    if (videos) result.videos = videos;
    if (subscribers) result.subscribers = subscribers;
    if (support) result.support = support;
    if (socials) result.socials = socials;

    return result;
  } catch (err) {
    console.error('[Supabase Direct Fetch Error]:', err);
    return null;
  }
};

// --- DIRECT SUPABASE MUTATIONS WITH VERIFICATION ---

export const saveStreamToSupabase = async (streamData, editId) => {
  if (!supabase) return null;
  const idToUse = getValidUUID(editId);
  const payload = {
    id: idToUse,
    title: streamData.title,
    description: streamData.description || '',
    thumbnail_url: streamData.thumbnail_url || '',
    scheduled_date: streamData.scheduled_date || new Date().toISOString().split('T')[0],
    scheduled_time: streamData.scheduled_time || '19:00',
    youtube_url: streamData.youtube_url || '',
    status: streamData.status || 'UPCOMING',
    created_at: streamData.created_at || new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('streams')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) {
      console.error('[Supabase saveStream ERROR]:', error.message, error.details);
      throw error;
    }

    const { data: verifyData, error: verifyErr } = await supabase
      .from('streams')
      .select('*')
      .eq('id', idToUse)
      .single();

    if (verifyErr || !verifyData) {
      console.error('[Supabase saveStream Verification Failed]:', verifyErr?.message);
      throw new Error('Database save verification failed.');
    }

    console.log('[Supabase saveStream Verified Success]:', verifyData);
    return verifyData;
  } catch (err) {
    console.error('[Supabase saveStream Exception]:', err);
    throw err;
  }
};

export const deleteStreamFromSupabase = async (streamId) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('streams')
      .delete()
      .eq('id', streamId);
    if (error) {
      console.error('[Supabase deleteStream error]:', error.message);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[Supabase deleteStream Exception]:', err);
    throw err;
  }
};

export const saveVideoToSupabase = async (videoData, editId) => {
  if (!supabase) return null;
  const idToUse = getValidUUID(editId);
  const payload = {
    id: idToUse,
    title: videoData.title,
    description: videoData.description || '',
    youtube_url: videoData.youtube_url || '',
    thumbnail_url: videoData.thumbnail_url || '',
    category: videoData.category || 'Gaming',
    status: videoData.status || 'published',
    is_trending: Boolean(videoData.is_trending),
    created_at: videoData.created_at || new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('videos')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) {
      console.error('[Supabase saveVideo ERROR]:', error.message, error.details);
      throw error;
    }

    const { data: verifyData, error: verifyErr } = await supabase
      .from('videos')
      .select('*')
      .eq('id', idToUse)
      .single();

    if (verifyErr || !verifyData) {
      console.error('[Supabase saveVideo Verification Failed]:', verifyErr?.message);
      throw new Error('Database video save verification failed.');
    }

    console.log('[Supabase saveVideo Verified Success]:', verifyData);
    return verifyData;
  } catch (err) {
    console.error('[Supabase saveVideo Exception]:', err);
    throw err;
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
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase toggleTrending Exception]:', err);
    throw err;
  }
};

export const deleteVideoFromSupabase = async (vidId) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('videos')
      .delete()
      .eq('id', vidId);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase deleteVideo Exception]:', err);
    throw err;
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

    if (error) {
      console.error('[Supabase saveSubscribers ERROR]:', error.message, error.details);
      throw error;
    }

    const { data: verifyData, error: verifyErr } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', 1)
      .single();

    if (verifyErr || !verifyData) {
      console.error('[Supabase saveSubscribers Verification Failed]:', verifyErr?.message);
      throw new Error('Database subscriber count verification failed.');
    }

    console.log('[Supabase saveSubscribers Verified Success]:', verifyData);
    return verifyData;
  } catch (err) {
    console.error('[Supabase saveSubscribers Exception]:', err);
    throw err;
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

    if (error) {
      console.error('[Supabase saveSupport ERROR]:', error.message, error.details);
      throw error;
    }

    const { data: verifyData, error: verifyErr } = await supabase
      .from('support_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (verifyErr || !verifyData) {
      console.error('[Supabase saveSupport Verification Failed]:', verifyErr?.message);
      throw new Error('Database support settings verification failed.');
    }

    console.log('[Supabase saveSupport Verified Success]:', verifyData);
    return verifyData;
  } catch (err) {
    console.error('[Supabase saveSupport Exception]:', err);
    throw err;
  }
};

export const saveSettingsToSupabase = async (settingsData) => {
  if (!supabase) return null;
  let typingArr = [];
  if (Array.isArray(settingsData.hero_typing_texts)) {
    typingArr = settingsData.hero_typing_texts;
  } else if (typeof settingsData.hero_typing_texts === 'string' && settingsData.hero_typing_texts.trim()) {
    typingArr = settingsData.hero_typing_texts.split(',').map(s => s.trim()).filter(Boolean);
  }

  const upsertData = {
    id: 1,
    website_title: settingsData.website_title || '',
    creator_name: settingsData.creator_name || '',
    profile_image: settingsData.profile_image || '',
    logo_url: settingsData.logo_url || '',
    hero_welcome_text: settingsData.hero_welcome_text || '',
    hero_typing_texts: typingArr,
    youtube_channel_url: settingsData.youtube_channel_url || '',
    about_text: settingsData.about_text || '',
    updated_at: new Date().toISOString()
  };
  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert(upsertData, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('[Supabase saveSettings ERROR]:', error.message, error.details);
      throw error;
    }

    const { data: verifyData, error: verifyErr } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (verifyErr || !verifyData) {
      console.error('[Supabase saveSettings Verification Failed]:', verifyErr?.message);
      throw new Error('Database settings verification failed.');
    }

    console.log('[Supabase saveSettings Verified Success]:', verifyData);
    return verifyData;
  } catch (err) {
    console.error('[Supabase saveSettings Exception]:', err);
    throw err;
  }
};

export const addSocialToSupabase = async (socialData) => {
  if (!supabase) return null;
  const idToUse = getValidUUID(socialData.id);
  const payload = {
    id: idToUse,
    platform: socialData.platform,
    url: socialData.url,
    icon_class: socialData.icon_class || 'fa-solid fa-link',
    is_active: true,
    sort_order: Number(socialData.sort_order) || 0
  };
  try {
    const { data, error } = await supabase
      .from('social_links')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) {
      console.error('[Supabase addSocial ERROR]:', error.message, error.details);
      throw error;
    }

    const { data: verifyData, error: verifyErr } = await supabase
      .from('social_links')
      .select('*')
      .eq('id', idToUse)
      .single();

    if (verifyErr || !verifyData) {
      console.error('[Supabase addSocial Verification Failed]:', verifyErr?.message);
      throw new Error('Database social link verification failed.');
    }

    console.log('[Supabase addSocial Verified Success]:', verifyData);
    return verifyData;
  } catch (err) {
    console.error('[Supabase addSocial Exception]:', err);
    throw err;
  }
};

export const deleteSocialFromSupabase = async (socialId) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('social_links')
      .delete()
      .eq('id', socialId);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase deleteSocial Exception]:', err);
    throw err;
  }
};


