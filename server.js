/**
 * Hệ Thống Thực Đơn Điện Tử Quân Đội - Node.js/Express
 */
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Render's reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Session config
const isProduction = process.env.NODE_ENV === 'production';
const { IS_PG, pool, db, initDB } = require('./database');

const sessionConfig = {
  secret: process.env.SECRET_KEY || 'quan-doi-thuc-don-2026-v2',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
};

// Dùng PostgreSQL session store nếu có DATABASE_URL
if (IS_PG && pool) {
  const pgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  });
  console.log('[Session] Su dung PostgreSQL session store');
}

app.use(session(sessionConfig));

// Auth middleware
function loginRequired(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
}
function adminRequired(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Cần quyền quản trị viên' });
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
app.use(require('./routes/authRoutes'));
app.use(require('./routes/menuRoutes'));
app.use(require('./routes/ratingRoutes'));
app.use(require('./routes/logisticsRoutes'));
app.use(require('./routes/wasteRoutes'));
app.use(require('./routes/competitionRoutes'));
app.use(require('./routes/votingRoutes'));
app.use(require('./routes/personnelRoutes'));
app.use(require('./routes/adminRoutes'));

// Serve frontend SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'admin.html'));
});

// ============ ASYNC INIT ============
(async () => {
  try {
    // Init database tables
    await initDB();

    // Tìm hoặc tạo đơn vị chính
    let defaultDv = await db.get("SELECT * FROM don_vi WHERE cap_do = 'dai_doi' LIMIT 1");
    if (!defaultDv) defaultDv = await db.get('SELECT * FROM don_vi LIMIT 1');
    if (!defaultDv) {
      const r = await db.run("INSERT INTO don_vi (ten, cap_do) VALUES (?, ?)", 'Don vi 1', 'dai_doi');
      defaultDv = await db.get('SELECT * FROM don_vi WHERE id = ?', r.lastInsertRowid);
      console.log(`[OK] Da tao don vi mac dinh: id=${defaultDv.id}`);
    }

    // Tạo admin mặc định
    const adminUser = await db.get("SELECT * FROM nguoi_dung WHERE ten_dang_nhap = 'admin'");
    if (!adminUser) {
      const hash = bcrypt.hashSync('admin123', 10);
      await db.run(
        `INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, mat_khau_hash, vai_tro, don_vi_id) VALUES (?, ?, ?, ?, ?)`,
        'admin', 'Quan Tri Vien', hash, 'admin', defaultDv.id
      );
      console.log(`[OK] Da tao tai khoan admin mac dinh: admin / admin123 (don_vi_id=${defaultDv.id})`);
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log('HE THONG THUC DON DIEN TU QUAN DOI v2 (Node.js)');
      console.log('='.repeat(60));
      console.log(`Database: ${IS_PG ? 'PostgreSQL' : 'SQLite (local)'}`);
      console.log(`Truy cap: http://localhost:${PORT}`);
      console.log('Admin mac dinh: admin / admin123');
      console.log('='.repeat(60));
    });
  } catch (err) {
    console.error('[FATAL] Khong the khoi dong:', err);
    process.exit(1);
  }
})();

module.exports = { loginRequired, adminRequired };
