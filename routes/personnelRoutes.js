/**
 * Personnel routes - Tương đương personnel_routes.py
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, getDonViChildIds, chienSiToDict, catComToDict, donViToDict } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/personnel', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const dvIdParam = req.query.don_vi_id ? parseInt(req.query.don_vi_id) : null;
  const donViIds = getDonViChildIds(dvid);
  if (!donViIds.length) return res.json([]);
  if (dvIdParam && donViIds.includes(dvIdParam)) {
    const list = db.prepare('SELECT * FROM chien_si WHERE don_vi_id = ?').all(dvIdParam);
    return res.json(list.map(chienSiToDict));
  }
  const ph = donViIds.map(() => '?').join(',');
  const list = db.prepare(`SELECT * FROM chien_si WHERE don_vi_id IN (${ph})`).all(...donViIds);
  res.json(list.map(chienSiToDict));
});

router.get('/api/personnel/stats', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const today = new Date().toISOString().split('T')[0];
  const donViIds = getDonViChildIds(dvid);
  if (!donViIds.length) return res.json({ tong_quan_so: 0, tai_don_vi: 0, vang_mat: 0, cat_com_hom_nay: 0, an_tai_don_vi: 0 });
  const ph = donViIds.map(() => '?').join(',');
  const total = db.prepare(`SELECT COUNT(*) as c FROM chien_si WHERE don_vi_id IN (${ph})`).get(...donViIds).c;
  const taiVi = db.prepare(`SELECT COUNT(*) as c FROM chien_si WHERE don_vi_id IN (${ph}) AND trang_thai = 'tai_vi'`).get(...donViIds).c;
  const catComToday = db.prepare(`SELECT COUNT(*) as c FROM cat_com cc JOIN chien_si cs ON cc.chien_si_id = cs.id
    WHERE cc.ngay_bat_dau <= ? AND cc.ngay_ket_thuc >= ? AND cs.don_vi_id IN (${ph})`).get(today, today, ...donViIds).c;
  res.json({ tong_quan_so: total, tai_don_vi: taiVi, vang_mat: total - taiVi, cat_com_hom_nay: catComToday, an_tai_don_vi: total - catComToday });
});

router.get('/api/units', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  if (!dvid) return res.json([]);
  const units = db.prepare('SELECT * FROM don_vi WHERE id = ? OR don_vi_cha_id = ?').all(dvid, dvid);
  res.json(units.map(donViToDict));
});

router.get('/api/meal-cuts', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const today = new Date().toISOString().split('T')[0];
  const activeOnly = (req.query.active || 'true').toLowerCase() === 'true';
  const donViIds = getDonViChildIds(dvid);
  if (!donViIds.length) return res.json([]);
  const ph = donViIds.map(() => '?').join(',');
  let records;
  if (activeOnly) {
    records = db.prepare(`SELECT cc.* FROM cat_com cc JOIN chien_si cs ON cc.chien_si_id = cs.id
      WHERE cs.don_vi_id IN (${ph}) AND cc.ngay_bat_dau <= ? AND cc.ngay_ket_thuc >= ? ORDER BY cc.ngay_tao DESC`).all(...donViIds, today, today);
  } else {
    records = db.prepare(`SELECT cc.* FROM cat_com cc JOIN chien_si cs ON cc.chien_si_id = cs.id
      WHERE cs.don_vi_id IN (${ph}) ORDER BY cc.ngay_tao DESC`).all(...donViIds);
  }
  res.json(records.map(catComToDict));
});

router.post('/api/meal-cuts', loginRequired, (req, res) => {
  const { chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do = '', loai = 'cat_com', ghi_chu, nguoi_bao } = req.body;
  const r = db.prepare('INSERT INTO cat_com (chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do, loai, ghi_chu, nguoi_bao) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do, loai, ghi_chu || null, nguoi_bao || null);
  const cs = db.prepare('SELECT * FROM chien_si WHERE id = ?').get(chien_si_id);
  if (cs) {
    const newStatus = ly_do === 'phep' ? 'phep' : (ly_do === 'gac' ? 'gac' : 'cong_tac');
    db.prepare('UPDATE chien_si SET trang_thai = ? WHERE id = ?').run(newStatus, chien_si_id);
  }
  const cc = db.prepare('SELECT * FROM cat_com WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(catComToDict(cc));
});

router.delete('/api/meal-cuts/:cutId', loginRequired, (req, res) => {
  const cc = db.prepare('SELECT * FROM cat_com WHERE id = ?').get(req.params.cutId);
  if (!cc) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE chien_si SET trang_thai = 'tai_vi' WHERE id = ?").run(cc.chien_si_id);
  db.prepare('DELETE FROM cat_com WHERE id = ?').run(cc.id);
  res.json({ message: 'Đã hủy cắt cơm' });
});

router.get('/api/personnel/birthdays', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const donViIds = getDonViChildIds(dvid);
  if (!donViIds.length) return res.json([]);
  const ph = donViIds.map(() => '?').join(',');
  const list = db.prepare(`SELECT * FROM chien_si WHERE CAST(strftime('%m', ngay_sinh) AS INTEGER) = ? AND don_vi_id IN (${ph})`).all(month, ...donViIds);
  res.json(list.map(chienSiToDict));
});

module.exports = router;
