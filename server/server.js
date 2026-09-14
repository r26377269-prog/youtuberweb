const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Security & Body Parsing
app.use(helmet({
  contentSecurityPolicy: false, // Allow external YouTube embeds and GSAP CDNs
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets
const distPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, '..', 'public');
const fs = require('fs');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(publicPath));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/public', apiRoutes);
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Fallback to Index for SPA routing
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else if (req.path.startsWith('/admin/dashboard')) {
    res.sendFile(path.join(publicPath, 'admin', 'dashboard.html'));
  } else if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(publicPath, 'admin', 'index.html'));
  } else {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 YouTuber Portfolio & Admin Portal Server Running`);
  console.log(`📍 Public Website: http://localhost:${PORT}`);
  console.log(`🔐 Admin Portal:   http://localhost:${PORT}/admin`);
  console.log(`==================================================`);
});
