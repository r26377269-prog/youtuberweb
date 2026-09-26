const express = require('express');
const router = express.Router();
const { supabase, isSupabaseConfigured, readLocalDb, isProduction } = require('../config/supabase');

const DEFAULT_SETTINGS = {
  id: 1,
  website_title: 'CREATOR • Official YouTuber Website',
  creator_name: 'ALEX VANCE',
  profile_image: '/img/prgp.jpg',
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
  count: 42800,
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

      const localData = readLocalDb();

      if (settingsRes.error) {
        console.warn('[Supabase Public Settings Warning]:', settingsRes.error.message);
        settings = localData.settings || DEFAULT_SETTINGS;
      } else {
        settings = settingsRes.data || localData.settings || DEFAULT_SETTINGS;
      }

      if (streamsRes.error) {
        console.warn('[Supabase Public Streams Warning]:', streamsRes.error.message);
        streams = localData.streams || [];
      } else {
        streams = Array.isArray(streamsRes.data) ? streamsRes.data : (localData.streams || []);
      }

      if (videosRes.error) {
        console.warn('[Supabase Public Videos Warning]:', videosRes.error.message);
        videos = (localData.videos || []).filter(v => v.status === 'published');
      } else {
        videos = Array.isArray(videosRes.data) ? videosRes.data : (localData.videos || []).filter(v => v.status === 'published');
      }

      if (subsRes.error) {
        console.warn('[Supabase Public Subscribers Warning]:', subsRes.error.message);
        subscribers = localData.subscribers || DEFAULT_SUBSCRIBERS;
      } else {
        subscribers = subsRes.data || localData.subscribers || DEFAULT_SUBSCRIBERS;
      }

      if (supportRes.error) {
        console.warn('[Supabase Public Support Warning]:', supportRes.error.message);
        support = localData.support_settings || DEFAULT_SUPPORT;
      } else {
        support = supportRes.data || localData.support_settings || DEFAULT_SUPPORT;
      }

      if (socialsRes.error) {
        console.warn('[Supabase Public Socials Warning]:', socialsRes.error.message);
        socials = (localData.social_links || []).filter(s => s.is_active);
      } else {
        socials = Array.isArray(socialsRes.data) ? socialsRes.data : (localData.social_links || []).filter(s => s.is_active);
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


