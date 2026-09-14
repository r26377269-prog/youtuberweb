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
      const matchInLocal = (local.admin_users || []).find(u => u.email.toLowerCase() === cleanEmail);
      if (matchInLocal) {
        userFound = matchInLocal;
      } else {
        const envEmail = (process.env.ADMIN_EMAIL || 'admin@youtuber.com').toLowerCase();
        const envPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (cleanEmail === envEmail) {
          userFound = {
            id: 'admin-env',
            email: envEmail,
            password_hash: bcrypt.hashSync(envPass, 10)
          };
        }
      }
    }

    if (!userFound) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, userFound.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: userFound.id, email: userFound.email },
      JWT_SECRET,
      { expiresIn: '24h' }
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
    if (!subscribers.count) subscribers = local.subscribers || subscribers;
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

    // Save to local DB as primary/fallback store
    const local = readLocalDb();
    local.streams = local.streams || [];
    local.streams.unshift(newStream);
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        const { id, ...supabaseInsert } = newStream;
        await supabase.from('streams').insert([supabaseInsert]);
      } catch (err) {
        console.warn('Supabase stream insert warning:', err.message);
      }
    }

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

    const local = readLocalDb();
    const index = (local.streams || []).findIndex(s => s.id.toString() === streamId.toString());
    if (index !== -1) {
      local.streams[index] = {
        ...local.streams[index],
        title: title !== undefined ? title : local.streams[index].title,
        description: description !== undefined ? description : local.streams[index].description,
        thumbnail_url: thumbnail_url !== undefined ? thumbnail_url : local.streams[index].thumbnail_url,
        scheduled_date: scheduled_date !== undefined ? scheduled_date : local.streams[index].scheduled_date,
        scheduled_time: scheduled_time !== undefined ? scheduled_time : local.streams[index].scheduled_time,
        youtube_url: youtube_url !== undefined ? youtube_url : local.streams[index].youtube_url,
        status: status !== undefined ? status : local.streams[index].status
      };
      writeLocalDb(local);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('streams')
          .update({ title, description, thumbnail_url, scheduled_date, scheduled_time, youtube_url, status })
          .eq('id', streamId);
      } catch (err) {
        console.warn('Supabase stream update warning:', err.message);
      }
    }

    return res.json({ success: true, message: 'Stream updated successfully!' });
  } catch (err) {
    console.error('Error updating stream:', err);
    return res.status(500).json({ success: false, message: 'Failed to update stream.' });
  }
});

router.delete('/streams/:id', authenticateAdmin, async (req, res) => {
  try {
    const streamId = req.params.id;

    const local = readLocalDb();
    local.streams = (local.streams || []).filter(s => s.id.toString() !== streamId.toString());
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('streams').delete().eq('id', streamId);
      } catch (err) {
        console.warn('Supabase stream delete warning:', err.message);
      }
    }

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

    const local = readLocalDb();
    local.videos = local.videos || [];
    local.videos.unshift(newVid);
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        const { id, ...supabaseInsert } = newVid;
        await supabase.from('videos').insert([supabaseInsert]);
      } catch (err) {
        console.warn('Supabase video insert warning:', err.message);
      }
    }

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

    const local = readLocalDb();
    const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
    if (index !== -1) {
      local.videos[index] = {
        ...local.videos[index],
        title: title !== undefined ? title : local.videos[index].title,
        description: description !== undefined ? description : local.videos[index].description,
        youtube_url: youtube_url !== undefined ? youtube_url : local.videos[index].youtube_url,
        thumbnail_url: thumbnail_url !== undefined ? thumbnail_url : local.videos[index].thumbnail_url,
        category: category !== undefined ? category : local.videos[index].category,
        status: status !== undefined ? status : local.videos[index].status,
        is_trending: is_trending !== undefined ? Boolean(is_trending) : Boolean(local.videos[index].is_trending)
      };
      writeLocalDb(local);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const updateData = { title, description, youtube_url, thumbnail_url, category, status };
        if (is_trending !== undefined) updateData.is_trending = Boolean(is_trending);
        await supabase.from('videos').update(updateData).eq('id', vidId);
      } catch (err) {
        console.warn('Supabase video update warning:', err.message);
      }
    }

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

    const local = readLocalDb();
    const index = (local.videos || []).findIndex(v => v.id.toString() === vidId.toString());
    if (index !== -1) {
      local.videos[index].is_trending = Boolean(is_trending);
      writeLocalDb(local);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('videos').update({ is_trending: Boolean(is_trending) }).eq('id', vidId);
      } catch (err) {
        console.warn('Supabase video trending update warning:', err.message);
      }
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

    const local = readLocalDb();
    local.videos = (local.videos || []).filter(v => v.id.toString() !== vidId.toString());
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('videos').delete().eq('id', vidId);
      } catch (err) {
        console.warn('Supabase video delete warning:', err.message);
      }
    }

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

    const local = readLocalDb();
    local.subscribers = {
      id: 1,
      count: Number(count) !== undefined && !isNaN(Number(count)) ? Number(count) : (local.subscribers?.count || 1245890),
      is_api_enabled: is_api_enabled !== undefined ? Boolean(is_api_enabled) : local.subscribers?.is_api_enabled,
      youtube_channel_id: youtube_channel_id !== undefined ? youtube_channel_id : local.subscribers?.youtube_channel_id,
      youtube_api_key: youtube_api_key !== undefined ? youtube_api_key : local.subscribers?.youtube_api_key,
      counter_font: counter_font !== undefined ? counter_font : (local.subscribers?.counter_font || "'Bebas Neue', sans-serif"),
      updated_at: new Date().toISOString()
    };
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('subscribers')
          .upsert({ id: 1, count: Number(count), is_api_enabled: Boolean(is_api_enabled), youtube_channel_id, youtube_api_key, counter_font, updated_at: new Date().toISOString() });
      } catch (err) {
        console.warn('Supabase subscriber update warning:', err.message);
      }
    }

    return res.json({ success: true, subscribers: local.subscribers, message: 'Subscriber settings updated!' });
  } catch (err) {
    console.error('Error updating subscribers:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subscriber settings.' });
  }
});

// 8. SUPPORT / UPI SETTINGS
router.put('/support', authenticateAdmin, async (req, res) => {
  try {
    const { upi_id, creator_name, qr_code_url, default_amount, support_message } = req.body;

    const local = readLocalDb();
    local.support_settings = {
      id: 1,
      upi_id: upi_id || local.support_settings?.upi_id,
      creator_name: creator_name || local.support_settings?.creator_name,
      qr_code_url: qr_code_url || local.support_settings?.qr_code_url,
      default_amount: Number(default_amount) || local.support_settings?.default_amount || 100,
      support_message: support_message || local.support_settings?.support_message,
      updated_at: new Date().toISOString()
    };
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('support_settings')
          .upsert({ id: 1, upi_id, creator_name, qr_code_url, default_amount: Number(default_amount), support_message, updated_at: new Date().toISOString() });
      } catch (err) {
        console.warn('Supabase support update warning:', err.message);
      }
    }

    return res.json({ success: true, support: local.support_settings, message: 'Support/UPI settings updated!' });
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

    const local = readLocalDb();
    local.social_links = local.social_links || [];
    local.social_links.push(newSocial);
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        const { id, ...supabaseInsert } = newSocial;
        await supabase.from('social_links').insert([supabaseInsert]);
      } catch (err) {
        console.warn('Supabase social insert warning:', err.message);
      }
    }

    return res.json({ success: true, social: newSocial, message: 'Social link added!' });
  } catch (err) {
    console.error('Error adding social link:', err);
    return res.status(500).json({ success: false, message: 'Failed to add social link.' });
  }
});

router.delete('/socials/:id', authenticateAdmin, async (req, res) => {
  try {
    const socialId = req.params.id;

    const local = readLocalDb();
    local.social_links = (local.social_links || []).filter(s => s.id.toString() !== socialId.toString());
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('social_links').delete().eq('id', socialId);
      } catch (err) {
        console.warn('Supabase social delete warning:', err.message);
      }
    }

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

    const local = readLocalDb();
    local.settings = {
      ...local.settings,
      website_title: website_title || local.settings?.website_title,
      creator_name: creator_name || local.settings?.creator_name,
      profile_image: profile_image || local.settings?.profile_image,
      logo_url: logo_url || local.settings?.logo_url,
      hero_welcome_text: hero_welcome_text || local.settings?.hero_welcome_text,
      hero_typing_texts: hero_typing_texts || local.settings?.hero_typing_texts,
      youtube_channel_url: youtube_channel_url || local.settings?.youtube_channel_url,
      about_text: about_text || local.settings?.about_text,
      updated_at: new Date().toISOString()
    };
    writeLocalDb(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settings')
          .upsert({ id: 1, website_title, creator_name, profile_image, logo_url, hero_welcome_text, hero_typing_texts, youtube_channel_url, about_text, updated_at: new Date().toISOString() });
      } catch (err) {
        console.warn('Supabase settings update warning:', err.message);
      }
    }

    return res.json({ success: true, settings: local.settings, message: 'Website settings updated successfully!' });
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
