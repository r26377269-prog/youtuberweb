const express = require('express');
const router = express.Router();
const { supabase, isSupabaseConfigured, readLocalDb, isProduction } = require('../config/supabase');

const DEFAULT_SETTINGS = {
  id: 1,
  website_title: 'CREATOR • Official YouTuber Website',
  creator_name: 'ALEX VANCE',
  profile_image: '/images/profile.jpg',
  logo_url: '',
  hero_welcome_text: 'WELCOME TO THE CHANNEL',
  hero_typing_texts: ['GAMING', 'LIVE STREAMS', 'TECH REVIEWS', 'DAILY VLOGS'],
  youtube_channel_url: 'https://youtube.com',
  hero_video_url: '',
  about_text: 'Welcome to my official creator portal. I produce high-energy gaming streams, tech reviews, and daily behind-the-scenes content.',
  updated_at: new Date().toISOString()
};

const DEFAULT_SUBSCRIBERS = {
  id: 1,
  count: 1245890,
  is_api_enabled: false,
  youtube_channel_id: '',
  youtube_api_key: '',
  counter_font: "'Bebas Neue', sans-serif",
  updated_at: new Date().toISOString()
};

const DEFAULT_SUPPORT = {
  id: 1,
  upi_id: 'creator@upi',
  creator_name: 'ALEX VANCE',
  qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=creator@upi%26pn=ALEX%20VANCE%26cu=INR',
  default_amount: 100,
  support_message: 'Support the channel directly! Every contribution helps improve our stream hardware and production quality.',
  updated_at: new Date().toISOString()
};

// Consolidated Public Homepage Data Endpoint (Supports both /data and /public-data)
const getPublicData = async (req, res) => {
  try {
    if (isSupabaseConfigured && supabase) {
      let settings = null;
      let streams = [];
      let videos = [];
      let subscribers = null;
      let support = null;
      let socials = [];

      const [settingsRes, streamsRes, videosRes, subsRes, supportRes, socialsRes] = await Promise.all([
        supabase.from('settings').select('*').single(),
        supabase.from('streams').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('subscribers').select('*').single(),
        supabase.from('support_settings').select('*').single(),
        supabase.from('social_links').select('*').eq('is_active', true).order('sort_order', { ascending: true })
      ]);

      if (settingsRes.error) {
        if (settingsRes.error.code === 'PGRST116') {
          settings = DEFAULT_SETTINGS;
        } else {
          console.error('[Supabase Public Settings Error]:', settingsRes.error.message, settingsRes.error.details);
          return res.status(500).json({ success: false, message: `Database error reading settings: ${settingsRes.error.message}` });
        }
      } else {
        settings = settingsRes.data;
      }

      if (streamsRes.error) {
        console.error('[Supabase Public Streams Error]:', streamsRes.error.message);
        return res.status(500).json({ success: false, message: `Database error reading streams: ${streamsRes.error.message}` });
      } else {
        streams = streamsRes.data || [];
      }

      if (videosRes.error) {
        console.error('[Supabase Public Videos Error]:', videosRes.error.message);
        return res.status(500).json({ success: false, message: `Database error reading videos: ${videosRes.error.message}` });
      } else {
        videos = videosRes.data || [];
      }

      if (subsRes.error) {
        if (subsRes.error.code === 'PGRST116') {
          subscribers = DEFAULT_SUBSCRIBERS;
        } else {
          console.error('[Supabase Public Subscribers Error]:', subsRes.error.message);
          return res.status(500).json({ success: false, message: `Database error reading subscribers: ${subsRes.error.message}` });
        }
      } else {
        subscribers = subsRes.data;
      }

      if (supportRes.error) {
        if (supportRes.error.code === 'PGRST116') {
          support = DEFAULT_SUPPORT;
        } else {
          console.error('[Supabase Public Support Error]:', supportRes.error.message);
          return res.status(500).json({ success: false, message: `Database error reading support settings: ${supportRes.error.message}` });
        }
      } else {
        support = supportRes.data;
      }

      if (socialsRes.error) {
        console.error('[Supabase Public Socials Error]:', socialsRes.error.message);
        return res.status(500).json({ success: false, message: `Database error reading social links: ${socialsRes.error.message}` });
      } else {
        socials = socialsRes.data || [];
      }

      return res.json({
        success: true,
        data: {
          settings,
          streams,
          videos,
          subscribers,
          support,
          socials
        }
      });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database read failed: Supabase is not configured in environment variables.' });
    }

    const local = readLocalDb();
    return res.json({
      success: true,
      data: {
        settings: local.settings || DEFAULT_SETTINGS,
        streams: local.streams || [],
        videos: (local.videos || []).filter(v => v.status === 'published'),
        subscribers: local.subscribers || DEFAULT_SUBSCRIBERS,
        support: local.support_settings || DEFAULT_SUPPORT,
        socials: (local.social_links || []).filter(s => s.is_active)
      }
    });
  } catch (err) {
    console.error('Error fetching public website data:', err);
    return res.status(500).json({ success: false, message: 'Server error loading website content: ' + err.message });
  }
};

router.get('/data', getPublicData);
router.get('/public-data', getPublicData);

module.exports = router;


