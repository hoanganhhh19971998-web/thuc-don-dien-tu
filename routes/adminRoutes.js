/**
 * Admin routes - Quản trị
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db, getUserDonViId, thucDonToDict, nguoiDungToDict } = require('../database');

const adminRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Cần quyền quản trị viên' });
  next();
};
const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

const uploadDir = path.join(__dirname, '..', 'static', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); cb(null, uploadDir); },
  filename: (req, file, cb) => { const ext = path.extname(file.originalname).toLowerCase() || '.jpg'; cb(null, uuidv4().replace(/-/g, '') + ext); }
});
const upload = multer({ storage });

// ========= QUẢN LÝ MÓN ĂN =========
router.get('/api/admin/dishes', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const dishes = await db.all('SELECT * FROM mon_an WHERE don_vi_id = ? ORDER BY loai, ten', dvid);
    res.json(dishes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/admin/dishes', adminRequired, upload.single('hinh_anh'), async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const data = req.body;
    const hinhAnh = req.file ? `/static/uploads/${req.file.filename}` : (data.hinh_anh || null);
    const r = await db.run(`INSERT INTO mon_an (ten, don_vi_id, mo_ta, loai, vung_mien, hinh_anh, calo, protein, fat, carbs, vitamin_a, vitamin_c, canxi, sat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.ten, dvid, data.mo_ta || '', data.loai || 'mon_chinh', data.vung_mien || 'chung', hinhAnh,
      parseFloat(data.calo || 0), parseFloat(data.protein || 0), parseFloat(data.fat || 0), parseFloat(data.carbs || 0),
      parseFloat(data.vitamin_a || 0), parseFloat(data.vitamin_c || 0), parseFloat(data.canxi || 0), parseFloat(data.sat || 0)
    );
    res.status(201).json(await db.get('SELECT * FROM mon_an WHERE id = ?', r.lastInsertRowid));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/admin/dishes/:dishId', adminRequired, upload.single('hinh_anh'), async (req, res) => {
  try {
    const mon = await db.get('SELECT * FROM mon_an WHERE id = ?', req.params.dishId);
    if (!mon) return res.status(404).json({ error: 'Not found' });
    const data = req.body;
    if (req.file) data.hinh_anh_path = `/static/uploads/${req.file.filename}`;
    const fields = ['ten', 'mo_ta', 'loai', 'vung_mien', 'calo', 'protein', 'fat', 'carbs', 'vitamin_a', 'vitamin_c', 'canxi', 'sat'];
    const updates = []; const values = [];
    fields.forEach(f => {
      if (data[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(['calo','protein','fat','carbs','vitamin_a','vitamin_c','canxi','sat'].includes(f) ? parseFloat(data[f]) : data[f]);
      }
    });
    if (data.hinh_anh_path) { updates.push('hinh_anh = ?'); values.push(data.hinh_anh_path); }
    if (updates.length) {
      values.push(mon.id);
      await db.run(`UPDATE mon_an SET ${updates.join(', ')} WHERE id = ?`, ...values);
    }
    res.json(await db.get('SELECT * FROM mon_an WHERE id = ?', mon.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/dishes/:dishId', adminRequired, async (req, res) => {
  try {
    const mon = await db.get('SELECT * FROM mon_an WHERE id = ?', req.params.dishId);
    if (!mon) return res.status(404).json({ error: 'Not found' });
    await db.run('DELETE FROM mon_an WHERE id = ?', mon.id);
    res.json({ message: 'Da xoa mon an' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========= QUẢN LÝ THỰC ĐƠN =========
router.get('/api/admin/menus', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - 7);
    const end = new Date(today); end.setDate(today.getDate() + 14);
    const menus = await db.all('SELECT * FROM thuc_don WHERE ngay >= ? AND ngay <= ? AND don_vi_id = ? ORDER BY ngay DESC, bua',
      start.toISOString().split('T')[0], end.toISOString().split('T')[0], dvid);
    const result = [];
    for (const m of menus) { result.push(await thucDonToDict(m)); }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/admin/menus', adminRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const { ngay, bua, ghi_chu, mon_an_ids } = req.body;
    const existing = await db.get('SELECT id FROM thuc_don WHERE ngay = ? AND bua = ? AND don_vi_id = ?', ngay, bua, dvid);
    if (existing) {
      await db.run('DELETE FROM thuc_don_mon_an WHERE thuc_don_id = ?', existing.id);
      await db.run('DELETE FROM thuc_don WHERE id = ?', existing.id);
    }
    const r = await db.run('INSERT INTO thuc_don (ngay, bua, don_vi_id, ghi_chu) VALUES (?, ?, ?, ?)', ngay, bua, dvid, ghi_chu || '');
    if (mon_an_ids && mon_an_ids.length) {
      const ph = mon_an_ids.map(() => '?').join(',');
      const valid = await db.all(`SELECT id FROM mon_an WHERE id IN (${ph}) AND don_vi_id = ?`, ...mon_an_ids, dvid);
      for (const m of valid) { await db.run('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)', r.lastInsertRowid, m.id); }
    }
    const td = await db.get('SELECT * FROM thuc_don WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await thucDonToDict(td));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/admin/menus/:menuId', adminRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const td = await db.get('SELECT * FROM thuc_don WHERE id = ?', req.params.menuId);
    if (!td) return res.status(404).json({ error: 'Not found' });
    const { mon_an_ids, ghi_chu } = req.body;
    if (mon_an_ids) {
      await db.run('DELETE FROM thuc_don_mon_an WHERE thuc_don_id = ?', td.id);
      const ph = mon_an_ids.map(() => '?').join(',');
      const valid = await db.all(`SELECT id FROM mon_an WHERE id IN (${ph}) AND don_vi_id = ?`, ...mon_an_ids, dvid);
      for (const m of valid) { await db.run('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)', td.id, m.id); }
    }
    if (ghi_chu !== undefined) await db.run('UPDATE thuc_don SET ghi_chu = ? WHERE id = ?', ghi_chu, td.id);
    res.json(await thucDonToDict(await db.get('SELECT * FROM thuc_don WHERE id = ?', td.id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/menus/:menuId', adminRequired, async (req, res) => {
  try {
    const td = await db.get('SELECT * FROM thuc_don WHERE id = ?', req.params.menuId);
    if (!td) return res.status(404).json({ error: 'Not found' });
    await db.run('DELETE FROM thuc_don_mon_an WHERE thuc_don_id = ?', td.id);
    await db.run('DELETE FROM thuc_don WHERE id = ?', td.id);
    res.json({ message: 'Da xoa thuc don' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========= QUẢN LÝ NGƯỜI DÙNG =========
router.get('/api/admin/users', adminRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const users = await db.all('SELECT * FROM nguoi_dung WHERE don_vi_id = ? ORDER BY ngay_tao DESC', dvid);
    res.json(users.map(nguoiDungToDict));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/admin/users/:uid/toggle', adminRequired, async (req, res) => {
  try {
    const u = await db.get('SELECT * FROM nguoi_dung WHERE id = ?', req.params.uid);
    if (!u) return res.status(404).json({ error: 'Not found' });
    await db.run('UPDATE nguoi_dung SET kich_hoat = ? WHERE id = ?', u.kich_hoat ? 0 : 1, u.id);
    res.json(nguoiDungToDict(await db.get('SELECT * FROM nguoi_dung WHERE id = ?', u.id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/admin/users/:uid/role', adminRequired, async (req, res) => {
  try {
    const u = await db.get('SELECT * FROM nguoi_dung WHERE id = ?', req.params.uid);
    if (!u) return res.status(404).json({ error: 'Not found' });
    await db.run('UPDATE nguoi_dung SET vai_tro = ? WHERE id = ?', req.body.vai_tro || u.vai_tro, u.id);
    res.json(nguoiDungToDict(await db.get('SELECT * FROM nguoi_dung WHERE id = ?', u.id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
