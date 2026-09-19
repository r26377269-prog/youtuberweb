const express = require('express');
const router = express.Router();
const { supabase, isSupabaseConfigured, readLocalDb } = require('../config/supabase');

// Consolidated Public Homepage Data Endpoint (Supports both /data and /public-data)
const getPublicData = async (req, res) => {
  try {
    let settings = null;
    let streams = null;
    let videos = null;
    let subscribers = null;
    let support = null;
    let socials = null;

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
        if (streamsRes.data !== null && streamsRes.data !== undefined) streams = streamsRes.data;
        if (videosRes.data !== null && videosRes.data !== undefined) videos = videosRes.data;
        if (subsRes.data) subscribers = subsRes.data;
        if (supportRes.data) support = supportRes.data;
        if (socialsRes.data !== null && socialsRes.data !== undefined) socials = socialsRes.data;
      } catch (sbErr) {
        console.warn('[Supabase Query Warning]:', sbErr.message);
      }
    }

    const local = readLocalDb();

    if (!settings) {
      settings = local.settings || {};
    }
    // Handle legacy disk image paths if any exist
    if (settings.profile_image && settings.profile_image.startsWith('/uploads/')) {
      settings.profile_image = '/images/profile.jpg';
    }

    if (streams === null) {
      streams = local.streams || [];
    }
    if (videos === null) {
      videos = (local.videos || []).filter(v => v.status === 'published');
    }
    if (subscribers === null) {
      subscribers = local.subscribers || { count: 1245890, is_api_enabled: false };
    }
    if (!support) {
      support = local.support_settings || {};
    }
    if (support.qr_code_url && support.qr_code_url.startsWith('/uploads/')) {
      support.qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=' + encodeURIComponent(support.upi_id || 'creator@upi');
    }
    if (socials === null) {
      socials = (local.social_links || []).filter(s => s.is_active);
    }

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

