const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_youtuber_jwt_key_2026';

// Middleware to authenticate JWT tokens from Authorization Header or Cookie
function authenticateAdmin(req, res, next) {
  let token = null;

  // Check header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (ex) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication session. Please log in again.' });
  }
}

// Rate Limiting for sensitive routes like Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 failed login attempts per window
  message: { success: false, message: 'Too many login attempts from this IP. Please try again after 15 minutes.' }
});

module.exports = {
  authenticateAdmin,
  loginLimiter,
  JWT_SECRET
};
