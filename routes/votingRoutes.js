/**
 * Voting routes - Bình chọn
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

function getWeekStr() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

router.get('/api/voting/current', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const tuanStr = getWeekStr();
    const results = await db.all(`SELECT ma.id, ma.ten, ma.hinh_anh, ma.loai, ma.vung_mien,
      COUNT(bc.id) as so_phieu FROM mon_an ma JOIN binh_chon bc ON bc.mon_an_id = ma.id
      WHERE bc.tuan = ? AND ma.don_vi_id = ? GROUP BY ma.id, ma.ten, ma.hinh_anh, ma.loai, ma.vung_mien ORDER BY so_phieu DESC`, tuanStr, dvid);
    res.json({
      tuan: tuanStr,
      ket_qua: results.map(r => ({
        mon_an_id: r.id, ten: r.ten, hinh_anh: r.hinh_anh,
        loai: r.loai, vung_mien: r.vung_mien, so_phieu: parseInt(r.so_phieu)
      })),
      tong_phieu: results.reduce((s, r) => s + parseInt(r.so_phieu), 0)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/voting/candidates', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const dishes = await db.all("SELECT * FROM mon_an WHERE loai = 'mon_chinh' AND don_vi_id = ?", dvid);
    res.json(dishes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/voting', loginRequired, async (req, res) => {
  try {
    const { chien_si_id, mon_an_id } = req.body;
    const tuanStr = getWeekStr();
    const existing = await db.get('SELECT * FROM binh_chon WHERE chien_si_id = ? AND tuan = ?', chien_si_id, tuanStr);
    if (existing) {
      await db.run('UPDATE binh_chon SET mon_an_id = ? WHERE id = ?', mon_an_id, existing.id);
      const updated = await db.get('SELECT * FROM binh_chon WHERE id = ?', existing.id);
      const cs = await db.get('SELECT ho_ten FROM chien_si WHERE id = ?', updated.chien_si_id);
      const ma = await db.get('SELECT ten FROM mon_an WHERE id = ?', updated.mon_an_id);
      return res.json({
        id: updated.id, chien_si_id: updated.chien_si_id, chien_si_ten: cs?.ho_ten,
        mon_an_id: updated.mon_an_id, mon_an_ten: ma?.ten, tuan: updated.tuan, ngay_tao: updated.ngay_tao
      });
    }
    const r = await db.run('INSERT INTO binh_chon (chien_si_id, mon_an_id, tuan) VALUES (?, ?, ?)', chien_si_id, mon_an_id, tuanStr);
    const bc = await db.get('SELECT * FROM binh_chon WHERE id = ?', r.lastInsertRowid);
    const cs = await db.get('SELECT ho_ten FROM chien_si WHERE id = ?', bc.chien_si_id);
    const ma = await db.get('SELECT ten FROM mon_an WHERE id = ?', bc.mon_an_id);
    res.status(201).json({
      id: bc.id, chien_si_id: bc.chien_si_id, chien_si_ten: cs?.ho_ten,
      mon_an_id: bc.mon_an_id, mon_an_ten: ma?.ten, tuan: bc.tuan, ngay_tao: bc.ngay_tao
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
