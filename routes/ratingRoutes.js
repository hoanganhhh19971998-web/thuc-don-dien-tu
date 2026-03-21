/**
 * Rating + Feedback routes - Tương đương rating_routes.py
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, getUserDonViId, danhGiaToDict, gopYToDict } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'static', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, uuidv4().replace(/-/g, '') + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 16 * 1024 * 1024 } });

// === ĐÁNH GIÁ ===
router.get('/api/ratings', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const tdId = req.query.thuc_don_id;
  let ratings;
  if (tdId) {
    ratings = db.prepare('SELECT * FROM danh_gia WHERE don_vi_id = ? AND thuc_don_id = ? ORDER BY ngay_tao DESC LIMIT 50').all(dvid, tdId);
  } else {
    ratings = db.prepare('SELECT * FROM danh_gia WHERE don_vi_id = ? ORDER BY ngay_tao DESC LIMIT 50').all(dvid);
  }
  res.json(ratings.map(danhGiaToDict));
});

router.post('/api/ratings', loginRequired, upload.single('hinh_anh'), (req, res) => {
  const dvid = getUserDonViId(req);
  const data = req.file ? req.body : req.body;
  const hinhAnh = req.file ? `/static/uploads/${req.file.filename}` : (data.hinh_anh || null);
  const anDanh = typeof data.an_danh === 'string' ? ['true', '1', 'yes'].includes(data.an_danh.toLowerCase()) : !!data.an_danh;
  const r = db.prepare(`INSERT INTO danh_gia (thuc_don_id, don_vi_id, chien_si_id, so_sao, binh_luan, hinh_anh, an_danh)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    parseInt(data.thuc_don_id), dvid, data.chien_si_id ? parseInt(data.chien_si_id) : null,
    parseInt(data.so_sao), data.binh_luan || null, hinhAnh, anDanh ? 1 : 0
  );
  const dg = db.prepare('SELECT * FROM danh_gia WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(danhGiaToDict(dg));
});

router.get('/api/ratings/stats', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const stats = db.prepare(`SELECT
    AVG(so_sao) as trung_binh, COUNT(id) as tong,
    SUM(CASE WHEN so_sao >= 4 THEN 1 ELSE 0 END) as hai_long,
    SUM(CASE WHEN so_sao <= 2 THEN 1 ELSE 0 END) as chua_hai_long
    FROM danh_gia WHERE don_vi_id = ?`).get(dvid);
  res.json({
    trung_binh: Math.round((stats.trung_binh || 0) * 10) / 10,
    tong_danh_gia: stats.tong || 0,
    hai_long: stats.hai_long || 0,
    chua_hai_long: stats.chua_hai_long || 0,
    ty_le_hai_long: Math.round((stats.hai_long || 0) / Math.max(stats.tong || 1, 1) * 1000) / 10
  });
});

// === HÒM THƯ GÓP Ý ===
router.get('/api/feedback', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const feedbacks = db.prepare('SELECT * FROM gop_y WHERE don_vi_id = ? ORDER BY ngay_tao DESC').all(dvid);
  res.json(feedbacks.map(gopYToDict));
});

router.post('/api/feedback', loginRequired, upload.single('hinh_anh'), (req, res) => {
  const dvid = getUserDonViId(req);
  const data = req.body;
  const hinhAnh = req.file ? `/static/uploads/${req.file.filename}` : (data.hinh_anh || null);
  const anDanh = typeof data.an_danh === 'string' ? ['true', '1', 'yes'].includes(data.an_danh.toLowerCase()) : (data.an_danh !== false);
  const r = db.prepare(`INSERT INTO gop_y (chien_si_id, don_vi_id, noi_dung, hinh_anh, an_danh) VALUES (?, ?, ?, ?, ?)`)
    .run(data.chien_si_id ? parseInt(data.chien_si_id) : null, dvid, data.noi_dung, hinhAnh, anDanh ? 1 : 0);
  const gy = db.prepare('SELECT * FROM gop_y WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(gopYToDict(gy));
});

router.post('/api/feedback/:feedbackId/reply', loginRequired, (req, res) => {
  const gy = db.prepare('SELECT * FROM gop_y WHERE id = ?').get(req.params.feedbackId);
  if (!gy) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE gop_y SET phan_hoi = ?, da_doc = 1, ngay_phan_hoi = datetime('now') WHERE id = ?")
    .run(req.body.phan_hoi, gy.id);
  const updated = db.prepare('SELECT * FROM gop_y WHERE id = ?').get(gy.id);
  res.json(gopYToDict(updated));
});

module.exports = router;
