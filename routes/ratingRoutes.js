/**
 * Rating + Feedback routes
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
router.get('/api/ratings', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const tdId = req.query.thuc_don_id;
    let ratings;
    if (tdId) {
      ratings = await db.all('SELECT * FROM danh_gia WHERE don_vi_id = ? AND thuc_don_id = ? ORDER BY ngay_tao DESC LIMIT 50', dvid, tdId);
    } else {
      ratings = await db.all('SELECT * FROM danh_gia WHERE don_vi_id = ? ORDER BY ngay_tao DESC LIMIT 50', dvid);
    }
    res.json(await Promise.all(ratings.map(danhGiaToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/ratings', loginRequired, upload.single('hinh_anh'), async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const data = req.body;
    const hinhAnh = req.file ? `/static/uploads/${req.file.filename}` : (data.hinh_anh || null);
    const anDanh = typeof data.an_danh === 'string' ? ['true', '1', 'yes'].includes(data.an_danh.toLowerCase()) : !!data.an_danh;
    const r = await db.run(`INSERT INTO danh_gia (thuc_don_id, don_vi_id, chien_si_id, so_sao, binh_luan, hinh_anh, an_danh)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      parseInt(data.thuc_don_id), dvid, data.chien_si_id ? parseInt(data.chien_si_id) : null,
      parseInt(data.so_sao), data.binh_luan || null, hinhAnh, anDanh ? 1 : 0
    );
    const dg = await db.get('SELECT * FROM danh_gia WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await danhGiaToDict(dg));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/ratings/stats', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const stats = await db.get(`SELECT
      AVG(so_sao) as trung_binh, COUNT(id) as tong,
      SUM(CASE WHEN so_sao >= 4 THEN 1 ELSE 0 END) as hai_long,
      SUM(CASE WHEN so_sao <= 2 THEN 1 ELSE 0 END) as chua_hai_long
      FROM danh_gia WHERE don_vi_id = ?`, dvid);
    res.json({
      trung_binh: Math.round((parseFloat(stats.trung_binh) || 0) * 10) / 10,
      tong_danh_gia: parseInt(stats.tong) || 0,
      hai_long: parseInt(stats.hai_long) || 0,
      chua_hai_long: parseInt(stats.chua_hai_long) || 0,
      ty_le_hai_long: Math.round((parseInt(stats.hai_long) || 0) / Math.max(parseInt(stats.tong) || 1, 1) * 1000) / 10
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === HÒM THƯ GÓP Ý ===
router.get('/api/feedback', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const feedbacks = await db.all('SELECT * FROM gop_y WHERE don_vi_id = ? ORDER BY ngay_tao DESC', dvid);
    res.json(await Promise.all(feedbacks.map(gopYToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/feedback', loginRequired, upload.single('hinh_anh'), async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const data = req.body;
    const hinhAnh = req.file ? `/static/uploads/${req.file.filename}` : (data.hinh_anh || null);
    const anDanh = typeof data.an_danh === 'string' ? ['true', '1', 'yes'].includes(data.an_danh.toLowerCase()) : (data.an_danh !== false);
    const r = await db.run(`INSERT INTO gop_y (chien_si_id, don_vi_id, noi_dung, hinh_anh, an_danh) VALUES (?, ?, ?, ?, ?)`,
      data.chien_si_id ? parseInt(data.chien_si_id) : null, dvid, data.noi_dung, hinhAnh, anDanh ? 1 : 0);
    const gy = await db.get('SELECT * FROM gop_y WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await gopYToDict(gy));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/feedback/:feedbackId/reply', loginRequired, async (req, res) => {
  try {
    const gy = await db.get('SELECT * FROM gop_y WHERE id = ?', req.params.feedbackId);
    if (!gy) return res.status(404).json({ error: 'Not found' });
    await db.run("UPDATE gop_y SET phan_hoi = ?, da_doc = 1, ngay_phan_hoi = NOW() WHERE id = ?", req.body.phan_hoi, gy.id);
    const updated = await db.get('SELECT * FROM gop_y WHERE id = ?', gy.id);
    res.json(await gopYToDict(updated));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
