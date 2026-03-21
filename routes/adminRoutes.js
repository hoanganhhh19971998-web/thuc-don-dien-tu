/**
 * Admin routes - Tương đương admin_routes.py
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
router.get('/api/admin/dishes', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const dishes = db.prepare('SELECT * FROM mon_an WHERE don_vi_id = ? ORDER BY loai, ten').all(dvid);
  res.json(dishes);
});

router.post('/api/admin/dishes', adminRequired, upload.single('hinh_anh'), (req, res) => {
  const dvid = getUserDonViId(req);
  const data = req.body;
  const hinhAnh = req.file ? `/static/uploads/${req.file.filename}` : (data.hinh_anh || null);
  const r = db.prepare(`INSERT INTO mon_an (ten, don_vi_id, mo_ta, loai, vung_mien, hinh_anh, calo, protein, fat, carbs, vitamin_a, vitamin_c, canxi, sat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    data.ten, dvid, data.mo_ta || '', data.loai || 'mon_chinh', data.vung_mien || 'chung', hinhAnh,
    parseFloat(data.calo || 0), parseFloat(data.protein || 0), parseFloat(data.fat || 0), parseFloat(data.carbs || 0),
    parseFloat(data.vitamin_a || 0), parseFloat(data.vitamin_c || 0), parseFloat(data.canxi || 0), parseFloat(data.sat || 0)
  );
  res.status(201).json(db.prepare('SELECT * FROM mon_an WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/api/admin/dishes/:dishId', adminRequired, upload.single('hinh_anh'), (req, res) => {
  const mon = db.prepare('SELECT * FROM mon_an WHERE id = ?').get(req.params.dishId);
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
    db.prepare(`UPDATE mon_an SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json(db.prepare('SELECT * FROM mon_an WHERE id = ?').get(mon.id));
});

router.delete('/api/admin/dishes/:dishId', adminRequired, (req, res) => {
  const mon = db.prepare('SELECT * FROM mon_an WHERE id = ?').get(req.params.dishId);
  if (!mon) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM mon_an WHERE id = ?').run(mon.id);
  res.json({ message: 'Da xoa mon an' });
});

// ========= QUẢN LÝ THỰC ĐƠN =========
router.get('/api/admin/menus', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - 7);
  const end = new Date(today); end.setDate(today.getDate() + 14);
  const menus = db.prepare('SELECT * FROM thuc_don WHERE ngay >= ? AND ngay <= ? AND don_vi_id = ? ORDER BY ngay DESC, bua')
    .all(start.toISOString().split('T')[0], end.toISOString().split('T')[0], dvid);
  res.json(menus.map(thucDonToDict));
});

router.post('/api/admin/menus', adminRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const { ngay, bua, ghi_chu, mon_an_ids } = req.body;
  // Xóa thực đơn cũ cùng ngày + bữa
  const existing = db.prepare('SELECT id FROM thuc_don WHERE ngay = ? AND bua = ? AND don_vi_id = ?').get(ngay, bua, dvid);
  if (existing) {
    db.prepare('DELETE FROM thuc_don_mon_an WHERE thuc_don_id = ?').run(existing.id);
    db.prepare('DELETE FROM thuc_don WHERE id = ?').run(existing.id);
  }
  const r = db.prepare('INSERT INTO thuc_don (ngay, bua, don_vi_id, ghi_chu) VALUES (?, ?, ?, ?)').run(ngay, bua, dvid, ghi_chu || '');
  if (mon_an_ids && mon_an_ids.length) {
    const insert = db.prepare('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)');
    const ph = mon_an_ids.map(() => '?').join(',');
    const valid = db.prepare(`SELECT id FROM mon_an WHERE id IN (${ph}) AND don_vi_id = ?`).all(...mon_an_ids, dvid);
    valid.forEach(m => insert.run(r.lastInsertRowid, m.id));
  }
  res.status(201).json(thucDonToDict(db.prepare('SELECT * FROM thuc_don WHERE id = ?').get(r.lastInsertRowid)));
});

router.put('/api/admin/menus/:menuId', adminRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const td = db.prepare('SELECT * FROM thuc_don WHERE id = ?').get(req.params.menuId);
  if (!td) return res.status(404).json({ error: 'Not found' });
  const { mon_an_ids, ghi_chu } = req.body;
  if (mon_an_ids) {
    db.prepare('DELETE FROM thuc_don_mon_an WHERE thuc_don_id = ?').run(td.id);
    const insert = db.prepare('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)');
    const ph = mon_an_ids.map(() => '?').join(',');
    const valid = db.prepare(`SELECT id FROM mon_an WHERE id IN (${ph}) AND don_vi_id = ?`).all(...mon_an_ids, dvid);
    valid.forEach(m => insert.run(td.id, m.id));
  }
  if (ghi_chu !== undefined) db.prepare('UPDATE thuc_don SET ghi_chu = ? WHERE id = ?').run(ghi_chu, td.id);
  res.json(thucDonToDict(db.prepare('SELECT * FROM thuc_don WHERE id = ?').get(td.id)));
});

router.delete('/api/admin/menus/:menuId', adminRequired, (req, res) => {
  const td = db.prepare('SELECT * FROM thuc_don WHERE id = ?').get(req.params.menuId);
  if (!td) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM thuc_don_mon_an WHERE thuc_don_id = ?').run(td.id);
  db.prepare('DELETE FROM thuc_don WHERE id = ?').run(td.id);
  res.json({ message: 'Da xoa thuc don' });
});

// ========= QUẢN LÝ NGƯỜI DÙNG =========
router.get('/api/admin/users', adminRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const users = db.prepare('SELECT * FROM nguoi_dung WHERE don_vi_id = ? ORDER BY ngay_tao DESC').all(dvid);
  res.json(users.map(nguoiDungToDict));
});

router.post('/api/admin/users/:uid/toggle', adminRequired, (req, res) => {
  const u = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(req.params.uid);
  if (!u) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE nguoi_dung SET kich_hoat = ? WHERE id = ?').run(u.kich_hoat ? 0 : 1, u.id);
  res.json(nguoiDungToDict(db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(u.id)));
});

router.put('/api/admin/users/:uid/role', adminRequired, (req, res) => {
  const u = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(req.params.uid);
  if (!u) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE nguoi_dung SET vai_tro = ? WHERE id = ?').run(req.body.vai_tro || u.vai_tro, u.id);
  res.json(nguoiDungToDict(db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(u.id)));
});

module.exports = router;
