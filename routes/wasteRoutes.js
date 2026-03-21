/**
 * Waste routes - Thực phẩm thừa
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, thucPhamThuaToDict } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/waste', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const days = parseInt(req.query.days) || 7;
    const d = new Date(); d.setDate(d.getDate() - days);
    const startDate = d.toISOString().split('T')[0];
    const records = await db.all('SELECT * FROM thuc_pham_thua WHERE ngay >= ? AND don_vi_id = ? ORDER BY ngay DESC', startDate, dvid);
    res.json(await Promise.all(records.map(thucPhamThuaToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/waste', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const { mon_an_id, ngay, luong_thua_kg, ghi_chu } = req.body;
    const ngayVal = ngay || new Date().toISOString().split('T')[0];
    const r = await db.run('INSERT INTO thuc_pham_thua (mon_an_id, don_vi_id, ngay, luong_thua_kg, ghi_chu) VALUES (?, ?, ?, ?, ?)',
      mon_an_id, dvid, ngayVal, luong_thua_kg, ghi_chu || null);
    const tpt = await db.get('SELECT * FROM thuc_pham_thua WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await thucPhamThuaToDict(tpt));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/waste/stats', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const days = parseInt(req.query.days) || 30;
    const d = new Date(); d.setDate(d.getDate() - days);
    const startDate = d.toISOString().split('T')[0];
    const stats = await db.all(`SELECT ma.id, ma.ten, COUNT(tpt.id) as so_lan,
      SUM(tpt.luong_thua_kg) as tong_kg, AVG(tpt.luong_thua_kg) as tb_kg
      FROM mon_an ma JOIN thuc_pham_thua tpt ON tpt.mon_an_id = ma.id
      WHERE tpt.ngay >= ? AND tpt.don_vi_id = ? GROUP BY ma.id ORDER BY tong_kg DESC`, startDate, dvid);
    const result = stats.map(s => ({
      mon_an_id: s.id, ten_mon: s.ten, so_lan_du: parseInt(s.so_lan),
      tong_kg: Math.round(parseFloat(s.tong_kg) * 10) / 10, trung_binh_kg: Math.round(parseFloat(s.tb_kg) * 10) / 10,
      muc_canh_bao: parseFloat(s.tong_kg) > 10 ? 'cao' : (parseFloat(s.tong_kg) > 5 ? 'trung_binh' : 'thap')
    }));
    const tongThua = stats.reduce((s, x) => s + parseFloat(x.tong_kg || 0), 0);
    res.json({ thoi_gian: `${days} ngày gần nhất`, tong_luong_thua_kg: Math.round(tongThua * 10) / 10, chi_tiet: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/waste/daily', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const days = parseInt(req.query.days) || 14;
    const d = new Date(); d.setDate(d.getDate() - days);
    const startDate = d.toISOString().split('T')[0];
    const records = await db.all(`SELECT ngay, SUM(luong_thua_kg) as tong_kg FROM thuc_pham_thua
      WHERE ngay >= ? AND don_vi_id = ? GROUP BY ngay ORDER BY ngay`, startDate, dvid);
    res.json(records.map(r => ({ ngay: r.ngay, tong_kg: Math.round(parseFloat(r.tong_kg) * 10) / 10 })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
