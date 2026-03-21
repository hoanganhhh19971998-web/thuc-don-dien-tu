/**
 * Hệ Thống Thực Đơn Điện Tử Quân Đội - Node.js/Express
 * Tương đương app.py
 */
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Session
app.use(session({
  secret: process.env.SECRET_KEY || 'quan-doi-thuc-don-2026-v2',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Auth middleware
function loginRequired(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Chua dang nhap' });
  }
  next();
}
function adminRequired(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  if (req.session.user.vai_tro !== 'admin') {
    return res.status(403).json({ error: 'Cần quyền quản trị viên' });
  }
  next();
}
app.use((req, res, next) => {
  req.loginRequired = loginRequired;
  req.adminRequired = adminRequired;
  next();
});

// Static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Tạo thư mục uploads
const uploadDir = path.join(__dirname, 'static', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');
const wasteRoutes = require('./routes/wasteRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const votingRoutes = require('./routes/votingRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use(authRoutes);
app.use(menuRoutes);
app.use(ratingRoutes);
app.use(logisticsRoutes);
app.use(wasteRoutes);
app.use(competitionRoutes);
app.use(votingRoutes);
app.use(personnelRoutes);
app.use(adminRoutes);

// Serve frontend SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'admin.html'));
});

// Database setup + seed + default admin
const { db } = require('./database');
const bcrypt = require('bcryptjs');

// Tìm đơn vị chính (không seed dữ liệu mẫu)
let defaultDv = db.prepare("SELECT * FROM don_vi WHERE cap_do = 'dai_doi' LIMIT 1").get();
if (!defaultDv) defaultDv = db.prepare('SELECT * FROM don_vi LIMIT 1').get();
if (!defaultDv) {
  db.prepare("INSERT INTO don_vi (ten, cap_do) VALUES (?, ?)").run('Don vi 1', 'dai_doi');
  defaultDv = db.prepare('SELECT * FROM don_vi ORDER BY id DESC LIMIT 1').get();
  console.log(`[OK] Da tao don vi mac dinh: id=${defaultDv.id}`);
}

// Tạo admin mặc định
const adminUser = db.prepare("SELECT * FROM nguoi_dung WHERE ten_dang_nhap = 'admin'").get();
if (!adminUser) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, mat_khau_hash, vai_tro, don_vi_id)
    VALUES (?, ?, ?, ?, ?)`).run('admin', 'Quan Tri Vien', hash, 'admin', defaultDv.id);
  console.log(`[OK] Da tao tai khoan admin mac dinh: admin / admin123 (don_vi_id=${defaultDv.id})`);
}

// Export middleware cho routes
module.exports = { loginRequired, adminRequired };

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('HE THONG THUC DON DIEN TU QUAN DOI v2 (Node.js)');
  console.log('='.repeat(60));
  console.log(`Truy cap: http://localhost:${PORT}`);
  console.log('Admin mac dinh: admin / admin123');
  console.log('='.repeat(60));
});
