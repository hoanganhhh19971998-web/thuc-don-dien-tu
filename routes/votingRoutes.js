/**
 * Voting routes - Tương đương voting_routes.py
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

router.get('/api/voting/current', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const tuanStr = getWeekStr();
  const results = db.prepare(`SELECT ma.id, ma.ten, ma.hinh_anh, ma.loai, ma.vung_mien,
    COUNT(bc.id) as so_phieu FROM mon_an ma JOIN binh_chon bc ON bc.mon_an_id = ma.id
    WHERE bc.tuan = ? AND ma.don_vi_id = ? GROUP BY ma.id ORDER BY so_phieu DESC`).all(tuanStr, dvid);
  res.json({
    tuan: tuanStr,
    ket_qua: results.map(r => ({
      mon_an_id: r.id, ten: r.ten, hinh_anh: r.hinh_anh,
      loai: r.loai, vung_mien: r.vung_mien, so_phieu: r.so_phieu
    })),
    tong_phieu: results.reduce((s, r) => s + r.so_phieu, 0)
  });
});

router.get('/api/voting/candidates', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const dishes = db.prepare("SELECT * FROM mon_an WHERE loai = 'mon_chinh' AND don_vi_id = ?").all(dvid);
  res.json(dishes);
});

router.post('/api/voting', loginRequired, (req, res) => {
  const { chien_si_id, mon_an_id } = req.body;
  const tuanStr = getWeekStr();
  const existing = db.prepare('SELECT * FROM binh_chon WHERE chien_si_id = ? AND tuan = ?').get(chien_si_id, tuanStr);
  if (existing) {
    db.prepare('UPDATE binh_chon SET mon_an_id = ? WHERE id = ?').run(mon_an_id, existing.id);
    const updated = db.prepare('SELECT * FROM binh_chon WHERE id = ?').get(existing.id);
    const cs = db.prepare('SELECT ho_ten FROM chien_si WHERE id = ?').get(updated.chien_si_id);
    const ma = db.prepare('SELECT ten FROM mon_an WHERE id = ?').get(updated.mon_an_id);
    return res.json({
      id: updated.id, chien_si_id: updated.chien_si_id, chien_si_ten: cs?.ho_ten,
      mon_an_id: updated.mon_an_id, mon_an_ten: ma?.ten, tuan: updated.tuan, ngay_tao: updated.ngay_tao
    });
  }
  const r = db.prepare('INSERT INTO binh_chon (chien_si_id, mon_an_id, tuan) VALUES (?, ?, ?)').run(chien_si_id, mon_an_id, tuanStr);
  const bc = db.prepare('SELECT * FROM binh_chon WHERE id = ?').get(r.lastInsertRowid);
  const cs = db.prepare('SELECT ho_ten FROM chien_si WHERE id = ?').get(bc.chien_si_id);
  const ma = db.prepare('SELECT ten FROM mon_an WHERE id = ?').get(bc.mon_an_id);
  res.status(201).json({
    id: bc.id, chien_si_id: bc.chien_si_id, chien_si_ten: cs?.ho_ten,
    mon_an_id: bc.mon_an_id, mon_an_ten: ma?.ten, tuan: bc.tuan, ngay_tao: bc.ngay_tao
  });
});

module.exports = router;
