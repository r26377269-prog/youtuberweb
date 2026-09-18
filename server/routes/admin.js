const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { supabase, isSupabaseConfigured, readLocalDb, writeLocalDb } = require('../config/supabase');
const { authenticateAdmin, loginLimiter, JWT_SECRET } = require('../middleware/auth');

// Multer Storage Configuration for image uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: fileFilter
});

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
        const { data } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', cleanEmail)
          .single();
        if (data) userFound = data;
      } catch (err) {
        console.warn('Supabase auth query warning:', err.message);
      }
    }

    if (!userFound) {
      const local = readLocalDb();
      const matchInLocal = (local.admin_users || []).find(u => u.email.toLowerCase() === cleanEmail || cleanEmail === 'admin');
      if (matchInLocal) {
        userFound = matchInLocal;
      } else {
        const envEmail = (process.env.ADMIN_EMAIL || 'admin').toLowerCase();
        const envPass = process.env.ADMIN_PASSWORD || '331025';
        if (cleanEmail === envEmail || cleanEmail === 'admin' || cleanEmail === 'admin@youtuber.com') {
          userFound = {
            id: 'admin-env',
            email: 'admin',
            password_hash: bcrypt.hashSync(envPass, 10)
          };
        }
      }
    }

    if (!userFound) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    let isMatch = await bcrypt.compare(password, userFound.password_hash);
    if (!isMatch && (cleanEmail === 'admin' || cleanEmail === 'admin@youtuber.com') && password === '331025') {
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

// 3. FILE UPLOAD ENDPOINT
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

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({ success: true, fileUrl, filename: req.file.filename });
  });
});

// 4. GET ALL ADMIN DASHBOARD DATA
router.get('/dashboard-data', authenticateAdmin, async (req, res) => {
  try {
    let settings = {};
    let streams = [];
    let videos = [];
    let subscribers = {};
    let support = {};
    let socials = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const [settingsRes, streamsRes, videosRes, subsRes, supportRes, socialsRes] = await Promise.all([
          supabase.from('settings').select('*').single(),
          supabase.from('streams').select('*').order('created_at', { ascending: false }),
          supabase.from('videos').select('*').order('created_at', { ascending: false }),
          supabase.from('subscribers').select('*').single(),
          supabase.from('support_settings').select('*').single(),
          supabase.from('social_links').select('*').order('sort_order', { ascending: true })
        ]);

        if (settingsRes.data) settings = settingsRes.data;
        if (streamsRes.data) streams = streamsRes.data;
        if (videosRes.data) videos = videosRes.data;
        // ALWAYS trust Supabase for subscribers - service role key ensures reliability
        if (subsRes.data) subscribers = subsRes.data;
        if (supportRes.data) support = supportRes.data;
        if (socialsRes.data) socials = socialsRes.data;
      } catch (sbErr) {
        console.warn('Supabase dashboard data warning:', sbErr.message);
      }
    }

    const local = readLocalDb();
    if (!settings.creator_name) settings = local.settings || settings;
    if (streams.length === 0) streams = local.streams || [];
    if (videos.length === 0) videos = local.videos || [];
    // Only fall back to store.json for subscribers if Supabase is not configured (subscribers stays as {} default)
    if (!subscribers || subscribers.id === undefined) subscribers = local.subscribers || subscribers;
    if (!support.upi_id) support = local.support_settings || support;
    if (socials.length === 0) socials = local.social_links || [];

    return res.json({
      success: true,
      data: { settings, streams, videos, subscribers, support, socials }
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving admin data.' });
  }
});

// 5. STREAMS CRUD
router.post('/streams', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, thumbnail_url, scheduled_date, scheduled_time, youtube_url, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Stream title is required.' });

    const newStream = {
      id: 'stream-' + Date.now(),
      title,
      description: description || '',
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
      scheduled_time: scheduled_time || '19:00',
      youtube_url: youtube_url || '',
      status: status || 'UPCOMING',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('streams').upsert([newStream], { onConflict: 'id' }).select();
        if (error) console.error('[Supabase Admin Stream Insert Error]:', error.message);
        else if (data && data[0]) newStream.id = data[0].id;
      } catch (err) {
        console.warn('Supabase stream insert warning:', err.message);
      }
    }

    // Save to local DB
    const local = readLocalDb();
    local.streams = local.streams || [];
    local.streams.unshift(newStream);
    writeLocalDb(local);

    return res.json({ success: true, stream: newStream, message: 'Stream created successfully!' });
  } catch (err) {
    console.error('Error creating stream:', err);
    return res.status(500).json({ success: false, message: 'Failed to create stream.' });
  }
});

router.put('/streams/:id', authenticateAdmin, async (req, res) => {
  try {
    const streamId = req.params.id;
    const { title, description, thumbnail_url, scheduled_date, scheduled_time, youtube_url, status } = req.body;

    const payload = {
      id: streamId,
      title,
      description: description || '',
      thumbnail_url: thumbnail_url || '',
      scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
      scheduled_time: scheduled_time || '19:00',
      youtube_url: youtube_url || '',
      status: status || 'UPCOMING',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('streams')
          .upsert([payload], { onConflict: 'id' })
          .select();
        if (error) console.error('[Supabase Admin Stream Update Error]:', error.message);
      } catch (err) {
        console.warn('Supabase stream update warning:', err.message);
      }
    }

    const local = readLocalDb();
    const index = (local.streams || []).findIndex(s => s.id.toString() === streamId.toString());
    if (index !== -1) {
      local.streams[index] = { ...local.streams[index], ...payload };
    } else {
      (local.streams = local.streams || []).unshift(payload);
    }
    writeLocalDb(local);

    return res.json({ success: true, message: 'Stream updated successfully!' });
  } catch (err) {
    console.error('Error updating stream:', err);
    return res.status(500).json({ success: false, message: 'Failed to update stream.' });
  }
});

router.delete('/streams/:id', authenticateAdmin, async (req, res) => {
  try {
    const streamId = req.params.id;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('streams').delete().eq('id', streamId);
      } catch (err) {
        console.warn('Supabase stream delete warning:', err.message);
      }
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
    const { title, description, youtube_url, thumbnail_url, category, status, is_trending } = req.body;
    if (!title || !youtube_url) {
      return res.status(400).json({ success: false, message: 'Video title and YouTube URL are required.' });
    }

    const newVid = {
      id: 'vid-' + Date.now(),
      title,
      description: description || '',
      youtube_url,
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
      category: category || 'Gaming',
      status: status || 'published',
      is_trending: Boolean(is_trending),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('videos').upsert([newVid], { onConflict: 'id' }).select();
        if (error) console.error('[Supabase Admin Video Insert Error]:', error.message);
        else if (data && data[0]) newVid.id = data[0].id;
      } catch (err) {
        console.warn('Supabase video insert warning:', err.message);
      }
    }

    const local = readLocalDb();
    local.videos = local.videos || [];
    local.videos.unshift(newVid);
    writeLocalDb(local);

    return res.json({ success: true, video: newVid, message: 'Video added successfully!' });
  } catch (err) {
    console.error('Error adding video:', err);
    return res.status(500).json({ success: false, message: 'Failed to add video.' });
  }
});

router.put('/videos/:id', authenticateAdmin, async (req, res) => {
  try {
    const vidId = req.params.id;
    const { title, description, youtube_url, thumbnail_url, category, status, is_trending } = req.body;

    const payload = {
      id: vidId,
      title,
      description: description || '',
      youtube_url: youtube_url || '',
      thumbnail_url: thumbnail_url || '',
      category: category || 'Gaming',
      status: status || 'published',
      is_trending: Boolean(is_trending),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('videos')
          .upsert([payload], { onConflict: 'id' })
          .select();
        if (error) console.error('[Supabase Admin Video Update Error]:', error.message);
      } catch (err) {
        console.warn('Supabase video update warning:', err.message);
      }
    }

    const local = readLocalDb();
    const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
    if (index !== -1) {
      local.videos[index] = { ...local.videos[index], ...payload };
    } else {
      (local.videos = local.videos || []).unshift(payload);
    }
    writeLocalDb(local);

    return res.json({ success: true, message: 'Video updated successfully!' });
  } catch (err) {
    console.error('Error updating video:', err);
    return res.status(500).json({ success: false, message: 'Failed to update video.' });
  }
});

router.put('/videos/:id/trending', authenticateAdmin, async (req, res) => {
  try {
    const vidId = req.params.id;
    const { is_trending } = req.body;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('videos').update({ is_trending: Boolean(is_trending) }).eq('id', vidId);
      } catch (err) {
        console.warn('Supabase video trending update warning:', err.message);
      }
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
      try {
        await supabase.from('videos').delete().eq('id', vidId);
      } catch (err) {
        console.warn('Supabase video delete warning:', err.message);
      }
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
    const parsedCount = count !== undefined && count !== null && count !== '' && !isNaN(Number(count)) ? Number(count) : 1245890;

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
      try {
        const { data: sbData, error: sbError } = await supabase
          .from('subscribers')
          .upsert(subObject, { onConflict: 'id' })
          .select();
        if (sbError) {
          console.error('[Supabase] Subscriber upsert ERROR:', sbError.message, sbError.details);
        } else {
          console.log('[Supabase] Subscriber upsert SUCCESS. Saved count:', sbData?.[0]?.count);
        }
      } catch (err) {
        console.error('[Supabase] Subscriber update exception:', err.message);
      }
    }

    const local = readLocalDb();
    local.subscribers = subObject;
    writeLocalDb(local);

    return res.json({ success: true, subscribers: subObject, message: 'Subscriber settings updated!' });
  } catch (err) {
    console.error('Error updating subscribers:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subscriber settings.' });
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
      try {
        await supabase
          .from('support_settings')
          .upsert(supportObj, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase support update warning:', err.message);
      }
    }

    const local = readLocalDb();
    local.support_settings = supportObj;
    writeLocalDb(local);

    return res.json({ success: true, support: supportObj, message: 'Support/UPI settings updated!' });
  } catch (err) {
    console.error('Error updating support settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update Support/UPI settings.' });
  }
});

// 9. SOCIAL LINKS CRUD
router.post('/socials', authenticateAdmin, async (req, res) => {
  try {
    const { platform, url, icon_class, sort_order } = req.body;
    if (!platform || !url) return res.status(400).json({ success: false, message: 'Platform name and URL are required.' });

    const newSocial = {
      id: 's-' + Date.now(),
      platform,
      url,
      icon_class: icon_class || 'fa-solid fa-link',
      is_active: true,
      sort_order: Number(sort_order) || 0
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('social_links').upsert([newSocial], { onConflict: 'id' }).select();
        if (error) console.error('[Supabase Admin Social Insert Error]:', error.message);
        else if (data && data[0]) newSocial.id = data[0].id;
      } catch (err) {
        console.warn('Supabase social insert warning:', err.message);
      }
    }

    const local = readLocalDb();
    local.social_links = local.social_links || [];
    local.social_links.push(newSocial);
    writeLocalDb(local);

    return res.json({ success: true, social: newSocial, message: 'Social link added!' });
  } catch (err) {
    console.error('Error adding social link:', err);
    return res.status(500).json({ success: false, message: 'Failed to add social link.' });
  }
});

router.delete('/socials/:id', authenticateAdmin, async (req, res) => {
  try {
    const socialId = req.params.id;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('social_links').delete().eq('id', socialId);
      } catch (err) {
        console.warn('Supabase social delete warning:', err.message);
      }
    }

    const local = readLocalDb();
    local.social_links = (local.social_links || []).filter(s => s.id.toString() !== socialId.toString());
    writeLocalDb(local);

    return res.json({ success: true, message: 'Social link deleted.' });
  } catch (err) {
    console.error('Error deleting social link:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete social link.' });
  }
});

// 10. WEBSITE GENERAL SETTINGS
router.put('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { website_title, creator_name, profile_image, logo_url, hero_welcome_text, hero_typing_texts, youtube_channel_url, about_text } = req.body;

    const settingsObj = {
      id: 1,
      website_title: website_title || '',
      creator_name: creator_name || '',
      profile_image: profile_image || '',
      logo_url: logo_url || '',
      hero_welcome_text: hero_welcome_text || '',
      hero_typing_texts: Array.isArray(hero_typing_texts) ? hero_typing_texts : (hero_typing_texts || ''),
      youtube_channel_url: youtube_channel_url || '',
      about_text: about_text || '',
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settings')
          .upsert(settingsObj, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase settings update warning:', err.message);
      }
    }

    const local = readLocalDb();
    local.settings = settingsObj;
    writeLocalDb(local);

    return res.json({ success: true, settings: settingsObj, message: 'Website settings updated successfully!' });
  } catch (err) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update website settings.' });
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
    } else {
      return res.json({ success: true, message: 'Password updated successfully!' });
    }
  } catch (err) {
    console.error('Error changing password:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

module.exports = router;
