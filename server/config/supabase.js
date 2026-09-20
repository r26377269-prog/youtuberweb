const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && (supabaseServiceKey || supabaseAnonKey)) {
  try {
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    supabase = createClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    isSupabaseConfigured = true;
    console.log('[Supabase] Client initialized successfully with URL:', supabaseUrl);
  } catch (err) {
    console.error('[Supabase Error] Client initialization failed:', err.message);
  }
} else {
  console.warn('[Supabase Warning] SUPABASE_URL or API keys missing from environment variables.');
}

const isProduction = process.env.NODE_ENV === 'production';

// Local File Store Fallback System (STRICTLY DISABLED IN PRODUCTION)
const localDbPath = path.join(__dirname, '..', 'data', 'store.json');

function ensureLocalDb() {
  if (isProduction) return;
  const dir = path.dirname(localDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(localDbPath)) {
    const defaultData = {
      settings: {
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
      },
      streams: [],
      videos: [],
      subscribers: {
        id: 1,
        count: 1245890,
        is_api_enabled: false,
        youtube_channel_id: '',
        youtube_api_key: '',
        updated_at: new Date().toISOString()
      },
      support_settings: {
        id: 1,
        upi_id: 'creator@upi',
        creator_name: 'ALEX VANCE',
        qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=creator@upi%26pn=ALEX%20VANCE%26cu=INR',
        default_amount: 100,
        support_message: 'Support the channel directly! Every contribution helps improve our stream hardware and production quality.',
        updated_at: new Date().toISOString()
      },
      social_links: [
        { id: '11111111-1111-4111-8111-111111111111', platform: 'YouTube', url: 'https://youtube.com', icon_class: 'fa-brands fa-youtube', is_active: true, sort_order: 1 },
        { id: '22222222-2222-4222-8222-222222222222', platform: 'Instagram', url: 'https://instagram.com', icon_class: 'fa-brands fa-instagram', is_active: true, sort_order: 2 },
        { id: '33333333-3333-4333-8333-333333333333', platform: 'Discord', url: 'https://discord.gg', icon_class: 'fa-brands fa-discord', is_active: true, sort_order: 3 },
        { id: '44444444-4444-4444-8444-444444444444', platform: 'X / Twitter', url: 'https://x.com', icon_class: 'fa-brands fa-x-twitter', is_active: true, sort_order: 4 }
      ],
      admin_users: [
        {
          id: 'admin-1',
          email: (process.env.ADMIN_EMAIL || 'admin@youtuber.com').toLowerCase(),
          password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10),
          created_at: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(localDbPath, JSON.stringify(defaultData, null, 2));
  }
}

let inMemoryCache = null;

function readLocalDb() {
  if (isProduction) {
    console.warn('[Storage Warning] readLocalDb called in PRODUCTION. Local file fallback is completely disabled in production.');
    return {};
  }
  ensureLocalDb();
  try {
    const raw = fs.readFileSync(localDbPath, 'utf8');
    const diskData = JSON.parse(raw);
    if (!inMemoryCache) {
      inMemoryCache = diskData;
    }
    return inMemoryCache;
  } catch (err) {
    console.error('Error reading local DB:', err);
    return inMemoryCache || {};
  }
}

function writeLocalDb(data) {
  if (isProduction) {
    console.warn('[Storage Warning] writeLocalDb ignored in PRODUCTION. Only Supabase DB writes are allowed.');
    return;
  }
  ensureLocalDb();
  inMemoryCache = { ...(inMemoryCache || {}), ...data };
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(inMemoryCache, null, 2));
  } catch (err) {
    console.warn('Could not write to local store.json:', err.message);
  }
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  readLocalDb,
  writeLocalDb,
  isProduction
};


