/**
 * Waste routes - Tương đương waste_routes.py
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, thucPhamThuaToDict } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/waste', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const days = parseInt(req.query.days) || 7;
  const d = new Date(); d.setDate(d.getDate() - days);
  const startDate = d.toISOString().split('T')[0];
  const records = db.prepare('SELECT * FROM thuc_pham_thua WHERE ngay >= ? AND don_vi_id = ? ORDER BY ngay DESC').all(startDate, dvid);
  res.json(records.map(thucPhamThuaToDict));
});

router.post('/api/waste', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const { mon_an_id, ngay, luong_thua_kg, ghi_chu } = req.body;
  const ngayVal = ngay || new Date().toISOString().split('T')[0];
  const r = db.prepare('INSERT INTO thuc_pham_thua (mon_an_id, don_vi_id, ngay, luong_thua_kg, ghi_chu) VALUES (?, ?, ?, ?, ?)')
    .run(mon_an_id, dvid, ngayVal, luong_thua_kg, ghi_chu || null);
  const tpt = db.prepare('SELECT * FROM thuc_pham_thua WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(thucPhamThuaToDict(tpt));
});

router.get('/api/waste/stats', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const days = parseInt(req.query.days) || 30;
  const d = new Date(); d.setDate(d.getDate() - days);
  const startDate = d.toISOString().split('T')[0];
  const stats = db.prepare(`SELECT ma.id, ma.ten, COUNT(tpt.id) as so_lan,
    SUM(tpt.luong_thua_kg) as tong_kg, AVG(tpt.luong_thua_kg) as tb_kg
    FROM mon_an ma JOIN thuc_pham_thua tpt ON tpt.mon_an_id = ma.id
    WHERE tpt.ngay >= ? AND tpt.don_vi_id = ? GROUP BY ma.id ORDER BY tong_kg DESC`).all(startDate, dvid);
  const result = stats.map(s => ({
    mon_an_id: s.id, ten_mon: s.ten, so_lan_du: s.so_lan,
    tong_kg: Math.round(s.tong_kg * 10) / 10, trung_binh_kg: Math.round(s.tb_kg * 10) / 10,
    muc_canh_bao: s.tong_kg > 10 ? 'cao' : (s.tong_kg > 5 ? 'trung_binh' : 'thap')
  }));
  const tongThua = stats.reduce((s, x) => s + x.tong_kg, 0);
  res.json({ thoi_gian: `${days} ngày gần nhất`, tong_luong_thua_kg: Math.round(tongThua * 10) / 10, chi_tiet: result });
});

router.get('/api/waste/daily', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const days = parseInt(req.query.days) || 14;
  const d = new Date(); d.setDate(d.getDate() - days);
  const startDate = d.toISOString().split('T')[0];
  const records = db.prepare(`SELECT ngay, SUM(luong_thua_kg) as tong_kg FROM thuc_pham_thua
    WHERE ngay >= ? AND don_vi_id = ? GROUP BY ngay ORDER BY ngay`).all(startDate, dvid);
  res.json(records.map(r => ({ ngay: r.ngay, tong_kg: Math.round(r.tong_kg * 10) / 10 })));
});

module.exports = router;
