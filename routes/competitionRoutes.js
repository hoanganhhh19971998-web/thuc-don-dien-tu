/**
 * Competition routes - Thi đua
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, getDonViChildIds, thiDuaToDict } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/competition/ranking', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const days = parseInt(req.query.days) || 30;
    const d = new Date(); d.setDate(d.getDate() - days);
    const startDate = d.toISOString().split('T')[0];
    const donViIds = await getDonViChildIds(dvid);
    if (!donViIds.length) return res.json([]);
    const placeholders = donViIds.map(() => '?').join(',');
    const rankings = await db.all(`SELECT dv.id, dv.ten,
      AVG(td.diem_dung_gio) as tb_dung_gio, AVG(td.diem_ve_sinh) as tb_ve_sinh,
      AVG(td.diem_tiet_kiem) as tb_tiet_kiem, COUNT(td.id) as so_ngay
      FROM don_vi dv JOIN thi_dua td ON td.don_vi_id = dv.id
      WHERE td.ngay >= ? AND dv.id IN (${placeholders}) GROUP BY dv.id, dv.ten`, startDate, ...donViIds);
    const result = rankings.map(r => ({
      don_vi_id: r.id, ten_don_vi: r.ten,
      diem_dung_gio: Math.round((parseFloat(r.tb_dung_gio) || 0) * 10) / 10,
      diem_ve_sinh: Math.round((parseFloat(r.tb_ve_sinh) || 0) * 10) / 10,
      diem_tiet_kiem: Math.round((parseFloat(r.tb_tiet_kiem) || 0) * 10) / 10,
      tong_diem: Math.round(((parseFloat(r.tb_dung_gio) || 0) + (parseFloat(r.tb_ve_sinh) || 0) + (parseFloat(r.tb_tiet_kiem) || 0)) * 10) / 10,
      so_ngay: parseInt(r.so_ngay)
    }));
    result.sort((a, b) => b.tong_diem - a.tong_diem);
    result.forEach((r, i) => { r.hang = i + 1; });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/competition/daily', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const days = parseInt(req.query.days) || 7;
    const d = new Date(); d.setDate(d.getDate() - days);
    const startDate = d.toISOString().split('T')[0];
    const donViIds = await getDonViChildIds(dvid);
    if (!donViIds.length) return res.json([]);
    const placeholders = donViIds.map(() => '?').join(',');
    const records = await db.all(`SELECT * FROM thi_dua WHERE ngay >= ? AND don_vi_id IN (${placeholders}) ORDER BY ngay`, startDate, ...donViIds);
    res.json(await Promise.all(records.map(thiDuaToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/competition', loginRequired, async (req, res) => {
  try {
    const { don_vi_id, ngay, diem_dung_gio = 0, diem_ve_sinh = 0, diem_tiet_kiem = 0, ghi_chu } = req.body;
    const ngayVal = ngay || new Date().toISOString().split('T')[0];
    const r = await db.run('INSERT INTO thi_dua (don_vi_id, ngay, diem_dung_gio, diem_ve_sinh, diem_tiet_kiem, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)',
      don_vi_id, ngayVal, diem_dung_gio, diem_ve_sinh, diem_tiet_kiem, ghi_chu || null);
    const td = await db.get('SELECT * FROM thi_dua WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await thiDuaToDict(td));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
