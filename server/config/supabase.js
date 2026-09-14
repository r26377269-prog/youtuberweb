const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project-id')) {
  try {
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    supabase = createClient(supabaseUrl, keyToUse);
    isSupabaseConfigured = true;
    console.log('[Supabase] Initialized successfully with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Error initializing client, using local store fallback:', err.message);
  }
} else {
  console.log('[Supabase] Credentials not configured in .env. Using high-performance Local Database Store.');
}

// Local File Store Fallback System
const localDbPath = path.join(__dirname, '..', 'data', 'store.json');

function ensureLocalDb() {
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
      streams: [
        {
          id: 'stream-1',
          title: '🔥 UNSTOPPABLE 24-HOUR CYBER GAMING MARATHON & GIVEAWAY!',
          description: 'Join us live as we conquer the latest AAA game on ultra settings with viewer matches, chat challenges, and massive giveaway prizes!',
          thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
          scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          scheduled_time: '19:00',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          status: 'LIVE NOW',
          created_at: new Date().toISOString()
        }
      ],
      videos: [
        {
          id: 'vid-1',
          title: 'I Built the Ultimate $10,000 Custom PC Setup!',
          description: 'Complete room tour & build log of the fastest water-cooled PC on Earth with custom RGB and wall mounts.',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
          category: 'Tech & Builds',
          status: 'published',
          created_at: new Date().toISOString()
        },
        {
          id: 'vid-2',
          title: '10 Secrets Every Gamer Needs To Know in 2026',
          description: 'Unlocking hidden graphics settings, FPS boosters, and pro control techniques that pros do not tell you.',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
          category: 'Gaming Tips',
          status: 'published',
          created_at: new Date().toISOString()
        },
        {
          id: 'vid-3',
          title: '24 Hours Inside an Esports Bootcamp House!',
          description: 'Behind the scenes vlog showing how professional players train, live, and prepare for international tournaments.',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
          category: 'Vlogs',
          status: 'published',
          created_at: new Date().toISOString()
        }
      ],
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
        { id: 's-1', platform: 'YouTube', url: 'https://youtube.com', icon_class: 'fa-brands fa-youtube', is_active: true, sort_order: 1 },
        { id: 's-2', platform: 'Instagram', url: 'https://instagram.com', icon_class: 'fa-brands fa-instagram', is_active: true, sort_order: 2 },
        { id: 's-3', platform: 'Discord', url: 'https://discord.gg', icon_class: 'fa-brands fa-discord', is_active: true, sort_order: 3 },
        { id: 's-4', platform: 'X / Twitter', url: 'https://x.com', icon_class: 'fa-brands fa-x-twitter', is_active: true, sort_order: 4 }
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

function readLocalDb() {
  ensureLocalDb();
  try {
    const raw = fs.readFileSync(localDbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local DB:', err);
    return {};
  }
}

function writeLocalDb(data) {
  ensureLocalDb();
  fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  readLocalDb,
  writeLocalDb
};
