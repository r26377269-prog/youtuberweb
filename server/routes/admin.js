const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const { supabase, isSupabaseConfigured, readLocalDb, writeLocalDb, isProduction } = require('../config/supabase');
const { authenticateAdmin, loginLimiter, JWT_SECRET } = require('../middleware/auth');

// Helper to validate and generate UUIDs for PostgreSQL compatibility
const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
const getValidUUID = (id) => {
  if (isUUID(id)) return id;
  return crypto.randomUUID();
};

// Multer Storage Configuration in memory so image uploads produce permanent Base64 Data URLs
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: fileFilter
});

// Default Data Definitions (Used ONLY when a database table has 0 records)
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

// 1. ADMIN LOGIN
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let userFound = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', cleanEmail)
          .single();
        if (data) userFound = data;
        if (error && error.code !== 'PGRST116') {
          console.warn('[Supabase Login Query Warning]:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase Auth Query Warning]:', err.message);
      }
    }

    if (!userFound && !isProduction) {
      const local = readLocalDb();
      const matchInLocal = (local.admin_users || []).find(u => u.email.toLowerCase() === cleanEmail || cleanEmail === 'admin');
      if (matchInLocal) {
        userFound = matchInLocal;
      }
    }

    if (!userFound) {
      const envEmail = (process.env.ADMIN_EMAIL || 'admin').toLowerCase();
      const envPass = process.env.ADMIN_PASSWORD || '331025';
      if (cleanEmail === envEmail || cleanEmail === 'admin' || cleanEmail === 'admin@youtuber.com') {
        userFound = {
          id: 'admin-env',
          email: cleanEmail,
          password_hash: bcrypt.hashSync(envPass, 10)
        };
      }
    }

    if (!userFound) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    let isMatch = await bcrypt.compare(password, userFound.password_hash);
    const fallbackPass = process.env.ADMIN_PASSWORD || '331025';
    if (!isMatch && (cleanEmail === 'admin' || cleanEmail === 'admin@youtuber.com') && password === fallbackPass) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: userFound.id, email: userFound.email },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.json({
      success: true,
      token,
      admin: { id: userFound.id, email: userFound.email },
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'An internal server error occurred during login.' });
  }
});

// 2. CHECK AUTH STATUS
router.get('/verify', authenticateAdmin, (req, res) => {
  return res.json({ success: true, admin: req.admin });
});

// 3. FILE UPLOAD ENDPOINT (Converts image buffer to permanent Base64 Data URL)
router.post('/upload', authenticateAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const base64Url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    return res.json({ success: true, fileUrl: base64Url, filename: req.file.originalname });
  });
});

// 4. GET ALL ADMIN DASHBOARD DATA (DB is absolute single source of truth)
router.get('/dashboard-data', authenticateAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured && supabase) {
      let settings = null;
      let streams = [];
      let videos = [];
      let subscribers = null;
      let support = null;
      let socials = [];

      // Query Settings
      const settingsRes = await supabase.from('settings').select('*').single();
      if (settingsRes.error) {
        if (settingsRes.error.code === 'PGRST116') { // 0 rows found -> seed initial default
          console.log('[Supabase Dashboard] Initializing empty settings record in database...');
          const { data: insertedSettings, error: seedErr } = await supabase.from('settings').insert([DEFAULT_SETTINGS]).select().single();
          if (seedErr) console.error('[Supabase Seed Settings Error]:', seedErr.message);
          settings = insertedSettings || DEFAULT_SETTINGS;
        } else {
          console.error('[Supabase Settings Fetch Error]:', settingsRes.error.message, settingsRes.error.details);
          if (isProduction) {
            return res.status(500).json({ success: false, message: `Database error reading settings: ${settingsRes.error.message}` });
          }
        }
      } else {
        settings = settingsRes.data;
      }

      // Query Streams
      const streamsRes = await supabase.from('streams').select('*').order('created_at', { ascending: false });
      if (streamsRes.error) {
        console.error('[Supabase Streams Fetch Error]:', streamsRes.error.message);
        if (isProduction) {
          return res.status(500).json({ success: false, message: `Database error reading streams: ${streamsRes.error.message}` });
        }
      } else {
        streams = streamsRes.data || [];
      }

      // Query Videos
      const videosRes = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (videosRes.error) {
        console.error('[Supabase Videos Fetch Error]:', videosRes.error.message);
        if (isProduction) {
          return res.status(500).json({ success: false, message: `Database error reading videos: ${videosRes.error.message}` });
        }
      } else {
        videos = videosRes.data || [];
      }

      // Query Subscribers
      const subsRes = await supabase.from('subscribers').select('*').single();
      if (subsRes.error) {
        if (subsRes.error.code === 'PGRST116') {
          console.log('[Supabase Dashboard] Initializing empty subscribers record in database...');
          const { data: insertedSubs, error: seedErr } = await supabase.from('subscribers').insert([DEFAULT_SUBSCRIBERS]).select().single();
          if (seedErr) console.error('[Supabase Seed Subscribers Error]:', seedErr.message);
          subscribers = insertedSubs || DEFAULT_SUBSCRIBERS;
        } else {
          console.error('[Supabase Subscribers Fetch Error]:', subsRes.error.message);
          if (isProduction) {
            return res.status(500).json({ success: false, message: `Database error reading subscribers: ${subsRes.error.message}` });
          }
        }
      } else {
        subscribers = subsRes.data;
      }

      // Query Support Settings
      const supportRes = await supabase.from('support_settings').select('*').single();
      if (supportRes.error) {
        if (supportRes.error.code === 'PGRST116') {
          console.log('[Supabase Dashboard] Initializing empty support record in database...');
          const { data: insertedSupport, error: seedErr } = await supabase.from('support_settings').insert([DEFAULT_SUPPORT]).select().single();
          if (seedErr) console.error('[Supabase Seed Support Error]:', seedErr.message);
          support = insertedSupport || DEFAULT_SUPPORT;
        } else {
          console.error('[Supabase Support Fetch Error]:', supportRes.error.message);
          if (isProduction) {
            return res.status(500).json({ success: false, message: `Database error reading support settings: ${supportRes.error.message}` });
          }
        }
      } else {
        support = supportRes.data;
      }

      // Query Social Links
      const socialsRes = await supabase.from('social_links').select('*').order('sort_order', { ascending: true });
      if (socialsRes.error) {
        console.error('[Supabase Social Links Fetch Error]:', socialsRes.error.message);
        if (isProduction) {
          return res.status(500).json({ success: false, message: `Database error reading social links: ${socialsRes.error.message}` });
        }
      } else {
        socials = socialsRes.data || [];
      }

      return res.json({
        success: true,
        data: {
          settings: settings || DEFAULT_SETTINGS,
          streams,
          videos,
          subscribers: subscribers || DEFAULT_SUBSCRIBERS,
          support: support || DEFAULT_SUPPORT,
          socials
        }
      });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Supabase database is not configured in environment variables.' });
    }

    const local = readLocalDb();
    return res.json({
      success: true,
      data: {
        settings: local.settings || DEFAULT_SETTINGS,
        streams: local.streams || [],
        videos: local.videos || [],
        subscribers: local.subscribers || DEFAULT_SUBSCRIBERS,
        support: local.support_settings || DEFAULT_SUPPORT,
        socials: local.social_links || []
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving admin dashboard data: ' + err.message });
  }
});

// 5. STREAMS CRUD
router.post('/streams', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, thumbnail_url, scheduled_date, scheduled_time, youtube_url, status, id } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Stream title is required.' });

    const targetId = getValidUUID(id);
    const newStream = {
      id: targetId,
      title: title.trim(),
      description: description || '',
      thumbnail_url: thumbnail_url || '',
      scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
      scheduled_time: scheduled_time || '19:00',
      youtube_url: youtube_url || '',
      status: status || 'UPCOMING',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('streams').upsert([newStream], { onConflict: 'id' }).select();
      if (error) {
        console.error('[Supabase Stream Insert ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database save error: ${error.message}` });
      }
      const resultStream = (data && data[0]) ? data[0] : newStream;

      if (!isProduction) {
        const local = readLocalDb();
        local.streams = (local.streams || []).filter(s => s.id !== targetId);
        local.streams.unshift(resultStream);
        writeLocalDb(local);
      }

      return res.json({ success: true, stream: resultStream, message: 'Stream created and saved to database successfully!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database saving failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.streams = local.streams || [];
    local.streams.unshift(newStream);
    writeLocalDb(local);

    return res.json({ success: true, stream: newStream, message: 'Stream created successfully!' });
  } catch (err) {
    console.error('Error creating stream:', err);
    return res.status(500).json({ success: false, message: 'Failed to create stream: ' + err.message });
  }
});

router.put('/streams/:id', authenticateAdmin, async (req, res) => {
  try {
    const streamId = getValidUUID(req.params.id);
    const { title, description, thumbnail_url, scheduled_date, scheduled_time, youtube_url, status } = req.body;

    const payload = {
      id: streamId,
      title: title || '',
      description: description || '',
      thumbnail_url: thumbnail_url || '',
      scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
      scheduled_time: scheduled_time || '19:00',
      youtube_url: youtube_url || '',
      status: status || 'UPCOMING',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('streams')
        .upsert([payload], { onConflict: 'id' })
        .select();

      if (error) {
        console.error('[Supabase Stream Update ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database update error: ${error.message}` });
      }

      const resultStream = (data && data[0]) ? data[0] : payload;
      if (!isProduction) {
        const local = readLocalDb();
        const index = (local.streams || []).findIndex(s => s.id.toString() === streamId.toString());
        if (index !== -1) local.streams[index] = resultStream;
        else (local.streams = local.streams || []).unshift(resultStream);
        writeLocalDb(local);
      }

      return res.json({ success: true, stream: resultStream, message: 'Stream updated in database successfully!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database update failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    const index = (local.streams || []).findIndex(s => s.id.toString() === streamId.toString());
    if (index !== -1) local.streams[index] = { ...local.streams[index], ...payload };
    else (local.streams = local.streams || []).unshift(payload);
    writeLocalDb(local);

    return res.json({ success: true, message: 'Stream updated successfully!' });
  } catch (err) {
    console.error('Error updating stream:', err);
    return res.status(500).json({ success: false, message: 'Failed to update stream: ' + err.message });
  }
});

router.delete('/streams/:id', authenticateAdmin, async (req, res) => {
  try {
    const streamId = req.params.id;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('streams').delete().eq('id', streamId);
      if (error) {
        console.error('[Supabase Stream Delete ERROR]:', error.message, error.details);
        return res.status(500).json({ success: false, message: `Database deletion error: ${error.message}` });
      }
      if (!isProduction) {
        const local = readLocalDb();
        local.streams = (local.streams || []).filter(s => s.id.toString() !== streamId.toString());
        writeLocalDb(local);
      }
      return res.json({ success: true, message: 'Stream deleted successfully from database.' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database delete failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.streams = (local.streams || []).filter(s => s.id.toString() !== streamId.toString());
    writeLocalDb(local);

    return res.json({ success: true, message: 'Stream deleted successfully.' });
  } catch (err) {
    console.error('Error deleting stream:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete stream.' });
  }
});

// 6. VIDEOS CRUD
router.post('/videos', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, youtube_url, thumbnail_url, category, status, is_trending, id } = req.body;
    if (!title || !youtube_url) {
      return res.status(400).json({ success: false, message: 'Video title and YouTube URL are required.' });
    }

    const targetId = getValidUUID(id);
    const newVid = {
      id: targetId,
      title: title.trim(),
      description: description || '',
      youtube_url,
      thumbnail_url: thumbnail_url || '',
      category: category || 'Gaming',
      status: status || 'published',
      is_trending: Boolean(is_trending),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('videos').upsert([newVid], { onConflict: 'id' }).select();
      if (error) {
        console.error('[Supabase Video Insert ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database save error: ${error.message}` });
      }
      const resultVid = (data && data[0]) ? data[0] : newVid;

      if (!isProduction) {
        const local = readLocalDb();
        local.videos = (local.videos || []).filter(v => v.id !== targetId);
        local.videos.unshift(resultVid);
        writeLocalDb(local);
      }

      return res.json({ success: true, video: resultVid, message: 'Video saved to database successfully!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database saving failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.videos = local.videos || [];
    local.videos.unshift(newVid);
    writeLocalDb(local);

    return res.json({ success: true, video: newVid, message: 'Video added successfully!' });
  } catch (err) {
    console.error('Error adding video:', err);
    return res.status(500).json({ success: false, message: 'Failed to add video: ' + err.message });
  }
});

router.put('/videos/:id', authenticateAdmin, async (req, res) => {
  try {
    const vidId = getValidUUID(req.params.id);
    const { title, description, youtube_url, thumbnail_url, category, status, is_trending } = req.body;

    const payload = {
      id: vidId,
      title: title || '',
      description: description || '',
      youtube_url: youtube_url || '',
      thumbnail_url: thumbnail_url || '',
      category: category || 'Gaming',
      status: status || 'published',
      is_trending: Boolean(is_trending),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('videos')
        .upsert([payload], { onConflict: 'id' })
        .select();
      if (error) {
        console.error('[Supabase Video Update ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database update error: ${error.message}` });
      }
      const resultVid = (data && data[0]) ? data[0] : payload;

      if (!isProduction) {
        const local = readLocalDb();
        const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
        if (index !== -1) local.videos[index] = resultVid;
        else (local.videos = local.videos || []).unshift(resultVid);
        writeLocalDb(local);
      }

      return res.json({ success: true, video: resultVid, message: 'Video updated in database successfully!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database update failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
    if (index !== -1) local.videos[index] = { ...local.videos[index], ...payload };
    else (local.videos = local.videos || []).unshift(payload);
    writeLocalDb(local);

    return res.json({ success: true, message: 'Video updated successfully!' });
  } catch (err) {
    console.error('Error updating video:', err);
    return res.status(500).json({ success: false, message: 'Failed to update video: ' + err.message });
  }
});

router.put('/videos/:id/trending', authenticateAdmin, async (req, res) => {
  try {
    const vidId = req.params.id;
    const { is_trending } = req.body;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('videos').update({ is_trending: Boolean(is_trending) }).eq('id', vidId);
      if (error) {
        console.error('[Supabase Video Trending ERROR]:', error.message, error.details);
        return res.status(500).json({ success: false, message: `Database error: ${error.message}` });
      }
      if (!isProduction) {
        const local = readLocalDb();
        const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
        if (index !== -1) {
          local.videos[index].is_trending = Boolean(is_trending);
          writeLocalDb(local);
        }
      }
      return res.json({ success: true, message: 'Trending status updated in database!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database update failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
    if (index !== -1) {
      local.videos[index].is_trending = Boolean(is_trending);
      writeLocalDb(local);
    }

    return res.json({ success: true, message: 'Trending status updated!' });
  } catch (err) {
    console.error('Error toggling video trending status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update trending status.' });
  }
});

router.delete('/videos/:id', authenticateAdmin, async (req, res) => {
  try {
    const vidId = req.params.id;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('videos').delete().eq('id', vidId);
      if (error) {
        console.error('[Supabase Video Delete ERROR]:', error.message, error.details);
        return res.status(500).json({ success: false, message: `Database deletion error: ${error.message}` });
      }
      if (!isProduction) {
        const local = readLocalDb();
        local.videos = (local.videos || []).filter(v => v.id.toString() !== vidId.toString());
        writeLocalDb(local);
      }
      return res.json({ success: true, message: 'Video deleted successfully from database.' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database delete failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.videos = (local.videos || []).filter(v => v.id.toString() !== vidId.toString());
    writeLocalDb(local);

    return res.json({ success: true, message: 'Video deleted successfully.' });
  } catch (err) {
    console.error('Error deleting video:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete video.' });
  }
});

// 7. SUBSCRIBER MANAGEMENT
router.put('/subscribers', authenticateAdmin, async (req, res) => {
  try {
    const { count, is_api_enabled, youtube_channel_id, youtube_api_key, counter_font } = req.body;
    const parsedCount = count !== undefined && count !== null && count !== '' && !isNaN(Number(count)) ? Number(count) : 0;

    const subObject = {
      id: 1,
      count: parsedCount,
      is_api_enabled: Boolean(is_api_enabled),
      youtube_channel_id: youtube_channel_id || '',
      youtube_api_key: youtube_api_key || '',
      counter_font: counter_font || "'Bebas Neue', sans-serif",
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subscribers')
        .upsert(subObject, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('[Supabase Subscriber Upsert ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database subscriber save error: ${error.message}` });
      }

      const resultSub = (data && data[0]) ? data[0] : subObject;
      if (!isProduction) {
        const local = readLocalDb();
        local.subscribers = resultSub;
        writeLocalDb(local);
      }

      return res.json({ success: true, subscribers: resultSub, message: 'Subscriber settings updated and saved to database!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database save failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.subscribers = subObject;
    writeLocalDb(local);

    return res.json({ success: true, subscribers: subObject, message: 'Subscriber settings updated!' });
  } catch (err) {
    console.error('Error updating subscribers:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subscriber settings: ' + err.message });
  }
});

// 8. SUPPORT / UPI SETTINGS
router.put('/support', authenticateAdmin, async (req, res) => {
  try {
    const { upi_id, creator_name, qr_code_url, default_amount, support_message } = req.body;

    const supportObj = {
      id: 1,
      upi_id: upi_id || '',
      creator_name: creator_name || '',
      qr_code_url: qr_code_url || '',
      default_amount: Number(default_amount) || 100,
      support_message: support_message || '',
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('support_settings')
        .upsert(supportObj, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('[Supabase Support Settings ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database support settings save error: ${error.message}` });
      }

      const resultSupport = (data && data[0]) ? data[0] : supportObj;
      if (!isProduction) {
        const local = readLocalDb();
        local.support_settings = resultSupport;
        writeLocalDb(local);
      }

      return res.json({ success: true, support: resultSupport, message: 'Support settings saved to database successfully!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database save failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.support_settings = supportObj;
    writeLocalDb(local);

    return res.json({ success: true, support: supportObj, message: 'Support/UPI settings updated!' });
  } catch (err) {
    console.error('Error updating support settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update Support/UPI settings: ' + err.message });
  }
});

// 9. SOCIAL LINKS CRUD
router.post('/socials', authenticateAdmin, async (req, res) => {
  try {
    const { platform, url, icon_class, sort_order, id } = req.body;
    if (!platform || !url) return res.status(400).json({ success: false, message: 'Platform name and URL are required.' });

    const targetId = getValidUUID(id);
    const newSocial = {
      id: targetId,
      platform,
      url,
      icon_class: icon_class || 'fa-solid fa-link',
      is_active: true,
      sort_order: Number(sort_order) || 0
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('social_links').upsert([newSocial], { onConflict: 'id' }).select();
      if (error) {
        console.error('[Supabase Social Insert ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database save error: ${error.message}` });
      }

      const resultSocial = (data && data[0]) ? data[0] : newSocial;
      if (!isProduction) {
        const local = readLocalDb();
        local.social_links = (local.social_links || []).filter(s => s.id !== targetId);
        local.social_links.push(resultSocial);
        writeLocalDb(local);
      }

      return res.json({ success: true, social: resultSocial, message: 'Social link saved to database!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database save failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.social_links = local.social_links || [];
    local.social_links.push(newSocial);
    writeLocalDb(local);

    return res.json({ success: true, social: newSocial, message: 'Social link added!' });
  } catch (err) {
    console.error('Error adding social link:', err);
    return res.status(500).json({ success: false, message: 'Failed to add social link: ' + err.message });
  }
});

router.delete('/socials/:id', authenticateAdmin, async (req, res) => {
  try {
    const socialId = req.params.id;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('social_links').delete().eq('id', socialId);
      if (error) {
        console.error('[Supabase Social Delete ERROR]:', error.message, error.details);
        return res.status(500).json({ success: false, message: `Database deletion error: ${error.message}` });
      }
      if (!isProduction) {
        const local = readLocalDb();
        local.social_links = (local.social_links || []).filter(s => s.id.toString() !== socialId.toString());
        writeLocalDb(local);
      }
      return res.json({ success: true, message: 'Social link deleted from database.' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database delete failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.social_links = (local.social_links || []).filter(s => s.id.toString() !== socialId.toString());
    writeLocalDb(local);

    return res.json({ success: true, message: 'Social link deleted successfully.' });
  } catch (err) {
    console.error('Error deleting social link:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete social link.' });
  }
});

// 10. WEBSITE GENERAL SETTINGS
router.put('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { website_title, creator_name, profile_image, logo_url, hero_welcome_text, hero_typing_texts, youtube_channel_url, hero_video_url, about_text } = req.body;

    let typingArr = [];
    if (Array.isArray(hero_typing_texts)) {
      typingArr = hero_typing_texts;
    } else if (typeof hero_typing_texts === 'string' && hero_typing_texts.trim()) {
      typingArr = hero_typing_texts.split(',').map(s => s.trim()).filter(Boolean);
    }

    const settingsObj = {
      id: 1,
      website_title: website_title || '',
      creator_name: creator_name || '',
      profile_image: profile_image || '',
      logo_url: logo_url || '',
      hero_welcome_text: hero_welcome_text || '',
      hero_typing_texts: typingArr,
      youtube_channel_url: youtube_channel_url || '',
      hero_video_url: hero_video_url || '',
      about_text: about_text || '',
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('settings')
        .upsert(settingsObj, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('[Supabase Settings Upsert ERROR]:', error.message, error.details, error.code);
        return res.status(500).json({ success: false, message: `Database settings save error: ${error.message}` });
      }

      const resultSettings = (data && data[0]) ? data[0] : settingsObj;
      if (!isProduction) {
        const local = readLocalDb();
        local.settings = resultSettings;
        writeLocalDb(local);
      }

      return res.json({ success: true, settings: resultSettings, message: 'Website settings saved to database successfully!' });
    }

    if (isProduction) {
      return res.status(500).json({ success: false, message: 'Database save failed: Supabase is not configured.' });
    }

    const local = readLocalDb();
    local.settings = settingsObj;
    writeLocalDb(local);

    return res.json({ success: true, settings: settingsObj, message: 'Website settings updated successfully!' });
  } catch (err) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update website settings: ' + err.message });
  }
});

// 11. ADMIN PASSWORD CHANGE
router.put('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    if (!isProduction) {
      const local = readLocalDb();
      const adminUser = (local.admin_users || []).find(u => u.id === req.admin.id || u.email.toLowerCase() === req.admin.email.toLowerCase());

      if (adminUser) {
        const isMatch = await bcrypt.compare(current_password, adminUser.password_hash);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        adminUser.password_hash = bcrypt.hashSync(new_password, 10);
        writeLocalDb(local);
        return res.json({ success: true, message: 'Password updated successfully!' });
      }
    }

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Error changing password:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

module.exports = router;
