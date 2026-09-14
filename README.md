# 🚀 YouTuber Portfolio Website with Secure Admin Portal & Supabase Integration

A complete, modern, fully-animated personal website built for YouTubers and Content Creators. It combines a high-energy **Public Website** (preserving smooth Lenis scrolling, GSAP ScrollTrigger timelines, sticky text reveals, rotating accent wheels, and marquee marquee animations) with a **Secure Admin/Owner Portal** powered by **Supabase PostgreSQL** & **Node.js/Express**.

---

## 🌟 Key Features

### 1. Public YouTuber Website
- **Hero Section**: Dynamic typing animation, YouTube watch links, fixed-center video container with smooth GSAP scroll zoom effect (`.videospace`).
- **Sticky Reveal Section**: Interactive `.simple_text` and expanding `.complex_text` opacity reveal on scroll.
- **Live / Upcoming Stream Showcase**: Dynamic stream status badge (`LIVE NOW`, `UPCOMING`, `ENDED`), live countdown timer, description, thumbnail, and YouTube live URL.
- **Live Subscriber Counter**: Smooth count-up numeric animation with YouTube API verification badge.
- **Text Scroll & Video Showcase**: Sticky `.leftText` with rotating accent icon (`.rotate`) and `.rightText` video cards populated dynamically.
- **About Creator Section**: Bio, YouTube journey statistics (Subscribers, Videos, Total Views), and profile photo.
- **Support / Donation Section (Legitimate UPI Intent)**:
  - Configurable UPI ID & Creator Name.
  - QR Code viewer.
  - Quick amount preset buttons (₹50, ₹100, ₹500, ₹1000) & custom input.
  - Instant `upi://pay?pa=...` payment intent generator for GPay, PhonePe, Paytm, BHIM.
  - Copy UPI ID button with feedback toast.
  - Explicit security disclaimers (no PINs, banking passwords, or OTPs collected).
- **Social Media Grid**: Animated community links (YouTube, Instagram, Discord, X).
- **Marquee Footer**: Large scrolling text marquee.

### 2. Secure Admin Portal (`/admin` & `/admin/dashboard`)
- **Protected Login**: JWT token-based authentication with bcrypt password hashing and rate limiting protection.
- **Dashboard Sidebar Navigation**:
  - **Overview**: Real-time stats (Total Videos, Active Streams, Subscriber Count, UPI ID status).
  - **Live Streams**: Full CRUD (Create, Edit, Delete, Upload Thumbnail, Schedule Date/Time, Status selector).
  - **Videos**: Full CRUD (Add, Edit, Delete, Upload Thumbnail, Category Tags, YouTube links).
  - **Subscriber Count**: Manual count updates & optional YouTube Data API configuration.
  - **Support / UPI Settings**: Live update UPI ID, Creator Name, Default Amount, Custom QR Code upload, and Support Message.
  - **Social Media Links**: Manage YouTube, Instagram, Discord, X URLs.
  - **Website Settings**: Custom Website Title, Creator Brand Name, Hero Welcome Text, Hero Typing Phrases, Profile Image.
  - **Security & Password**: Change admin account password.

---

## ⚙️ Step-by-Step Supabase Integration Guide

To connect your project to Supabase:

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **"New Project"**, select your organization, enter a project name (e.g., `youtuber-website`), set a secure database password, and choose your region.
3. Click **"Create new project"** and wait for provision.

### Step 2: Create Database Tables & Seed Data
1. In your Supabase Dashboard left menu, click **SQL Editor**.
2. Click **"New query"**.
3. Open the file `scripts/supabase_schema.sql` (generated automatically in this repository) or run `npm run init-db` to output the SQL script.
4. Copy the entire SQL content into the Supabase SQL Editor and click **"Run"**.
5. This creates the 7 required tables (`settings`, `streams`, `videos`, `subscribers`, `support_settings`, `social_links`, `admin_users`) and inserts default starter records.

### Step 3: Configure Row Level Security (RLS) & Database Policies
The SQL script executed in Step 2 automatically enables RLS and configures Public Read Policies for your website data (`settings`, `streams`, `videos`, `subscribers`, `support_settings`, `social_links`).

### Step 4: Obtain Your Supabase Credentials
1. In your Supabase Dashboard, go to **Project Settings** -> **API**.
2. Copy your **Project URL** (e.g., `https://xyz.supabase.co`).
3. Copy your **anon / public** API key.
4. (Optional) Copy your **service_role** key for privileged server ops.

### Step 5: Configure Environment Variables
Create or open your `.env` file in the root directory and add your credentials:

```env
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Secret for Admin Auth
JWT_SECRET=super_secret_youtuber_jwt_key_2026

# Admin Initial Credentials
ADMIN_EMAIL=admin@youtuber.com
ADMIN_PASSWORD=admin123
```

---

## 🚀 Running the Project Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run dev
# or
npm start
```

### 3. Access the Application
- **Public Homepage**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)

### Default Admin Login
- **Email**: `admin@youtuber.com`
- **Password**: `admin123`

---

## 🔒 Security Best Practices
- **No Client Secrets**: Supabase service keys and database secrets remain strictly on the server (`.env`).
- **No Hardcoded Passwords**: All admin passwords are saved using `bcryptjs` salted password hashes.
- **Strict File Uploads**: Image uploads are validated against explicit image MIME types with size caps.
- **No Banking Data Collected**: The support section triggers native `upi://pay` deep links directly to bank apps.
