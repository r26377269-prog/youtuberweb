const express = require('express');
const router = express.Router();
const { supabase, isSupabaseConfigured, readLocalDb } = require('../config/supabase');

// Consolidated Public Homepage Data Endpoint (Supports both /data and /public-data)
const getPublicData = async (req, res) => {
  try {
    let settings = null;
    let streams = [];
    let videos = [];
    let subscribers = null;
    let support = null;
    let socials = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const [settingsRes, streamsRes, videosRes, subsRes, supportRes, socialsRes] = await Promise.all([
          supabase.from('settings').select('*').single(),
          supabase.from('streams').select('*').order('created_at', { ascending: false }),
          supabase.from('videos').select('*').eq('status', 'published').order('created_at', { ascending: false }),
          supabase.from('subscribers').select('*').single(),
          supabase.from('support_settings').select('*').single(),
          supabase.from('social_links').select('*').eq('is_active', true).order('sort_order', { ascending: true })
        ]);

        if (settingsRes.data) settings = settingsRes.data;
        if (streamsRes.data && streamsRes.data.length > 0) streams = streamsRes.data;
        if (videosRes.data && videosRes.data.length > 0) videos = videosRes.data;
        if (subsRes.data) subscribers = subsRes.data;
        if (supportRes.data) support = supportRes.data;
        if (socialsRes.data && socialsRes.data.length > 0) socials = socialsRes.data;
      } catch (sbErr) {
        console.warn('[Supabase Query Warning] Falling back to local data:', sbErr.message);
      }
    }

    // Merge with local db defaults if any property is null or empty
    const local = readLocalDb();
    if (!settings || !settings.creator_name) settings = local.settings || settings || {};
    if (streams.length === 0) streams = local.streams || [];
    if (videos.length === 0) videos = (local.videos || []).filter(v => v.status === 'published');
    if (!subscribers || !subscribers.count) subscribers = local.subscribers || { count: 1245890, is_api_enabled: false };
    if (!support || !support.upi_id) support = local.support_settings || support || {};
    if (socials.length === 0) socials = (local.social_links || []).filter(s => s.is_active);

    return res.json({
      success: true,
      data: { settings, streams, videos, subscribers, support, socials }
    });
  } catch (err) {
    console.error('Error fetching public website data:', err);
    return res.status(500).json({ success: false, message: 'Server error loading website content' });
  }
};

router.get('/data', getPublicData);
router.get('/public-data', getPublicData);

module.exports = router;
