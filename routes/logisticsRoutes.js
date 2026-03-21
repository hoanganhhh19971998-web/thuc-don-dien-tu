/**
 * Logistics routes - Dashboard hậu cần
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, getMonAnForThucDon } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/logistics/dashboard', loginRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dvid = getUserDonViId(req);
    const ratingStats = await db.get('SELECT AVG(so_sao) as tb, COUNT(id) as tong FROM danh_gia WHERE don_vi_id = ?', dvid);
    const gopYChuaDoc = (await db.get('SELECT COUNT(*) as c FROM gop_y WHERE da_doc = 0 AND don_vi_id = ?', dvid)).c;
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    const startWeek = d.toISOString().split('T')[0];
    const thuaTuan = (await db.get('SELECT COALESCE(SUM(luong_thua_kg), 0) as s FROM thuc_pham_thua WHERE ngay >= ? AND don_vi_id = ?', startWeek, dvid)).s;
    const soBuaHomNay = (await db.get('SELECT COUNT(*) as c FROM thuc_don WHERE ngay = ? AND don_vi_id = ?', today, dvid)).c;
    res.json({
      danh_gia_trung_binh: Math.round((parseFloat(ratingStats.tb) || 0) * 10) / 10,
      tong_danh_gia: parseInt(ratingStats.tong) || 0,
      gop_y_chua_doc: parseInt(gopYChuaDoc) || 0,
      so_bua_hom_nay: parseInt(soBuaHomNay) || 0,
      thuc_pham_thua_tuan_kg: Math.round((parseFloat(thuaTuan) || 0) * 10) / 10
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/logistics/announcements', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const list = await db.all('SELECT * FROM thong_bao_hau_can WHERE don_vi_id = ? ORDER BY ghim DESC, ngay_tao DESC', dvid);
    res.json(list.map(a => ({
      id: a.id, tieu_de: a.tieu_de, noi_dung: a.noi_dung, loai: a.loai,
      gop_y_id: a.gop_y_id, ghim: !!a.ghim, ngay_tao: a.ngay_tao
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/logistics/announcements', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const { tieu_de, noi_dung, loai = 'thong_bao', gop_y_id, ghim = false } = req.body;
    const r = await db.run('INSERT INTO thong_bao_hau_can (tieu_de, noi_dung, don_vi_id, loai, gop_y_id, ghim) VALUES (?, ?, ?, ?, ?, ?)',
      tieu_de, noi_dung, dvid, loai, gop_y_id || null, ghim ? 1 : 0);
    const tb = await db.get('SELECT * FROM thong_bao_hau_can WHERE id = ?', r.lastInsertRowid);
    res.status(201).json({ id: tb.id, tieu_de: tb.tieu_de, noi_dung: tb.noi_dung, loai: tb.loai, gop_y_id: tb.gop_y_id, ghim: !!tb.ghim, ngay_tao: tb.ngay_tao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/logistics/satisfaction-report', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const months = parseInt(req.query.months) || 3;
    const result = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      const year = d.getFullYear(); const month = d.getMonth() + 1;
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextM = new Date(year, month, 1);
      const monthEnd = new Date(nextM - 86400000).toISOString().split('T')[0];
      const stats = await db.get(`SELECT AVG(so_sao) as tb, COUNT(id) as tong,
        SUM(CASE WHEN so_sao >= 4 THEN 1 ELSE 0 END) as tot,
        SUM(CASE WHEN so_sao <= 2 THEN 1 ELSE 0 END) as kem
        FROM danh_gia WHERE don_vi_id = ? AND ngay_tao >= ? AND ngay_tao <= ?`, dvid, monthStart, monthEnd + ' 23:59:59');
      result.push({
        thang: `${year}-${String(month).padStart(2, '0')}`,
        trung_binh: Math.round((parseFloat(stats.tb) || 0) * 10) / 10,
        tong_danh_gia: parseInt(stats.tong) || 0,
        danh_gia_tot: parseInt(stats.tot) || 0,
        danh_gia_kem: parseInt(stats.kem) || 0
      });
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/hometown-flavor', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const hvqn = await db.get('SELECT * FROM huong_vi_que_nha WHERE thang = ? AND nam = ? AND don_vi_id = ?', month, year, dvid);
    let hvqnDict = null;
    if (hvqn) {
      const ma = await db.get('SELECT * FROM mon_an WHERE id = ?', hvqn.mon_an_id);
      hvqnDict = { id: hvqn.id, mon_an_id: hvqn.mon_an_id, mon_an: ma || null, thang: hvqn.thang, nam: hvqn.nam, mo_ta: hvqn.mo_ta };
    }
    const IS_PG = !!process.env.DATABASE_URL;
    let birthdaySoldiers = [];
    if (dvid) {
      if (IS_PG) {
        birthdaySoldiers = await db.all(
          `SELECT * FROM chien_si WHERE EXTRACT(MONTH FROM ngay_sinh::date)::integer = ? AND don_vi_id = ?`, month, dvid);
      } else {
        birthdaySoldiers = await db.all(
          `SELECT * FROM chien_si WHERE CAST(strftime('%m', ngay_sinh) AS INTEGER) = ? AND don_vi_id = ?`, month, dvid);
      }
    }
    const vungMienCount = {};
    birthdaySoldiers.forEach(cs => {
      const vm = cs.vung_mien || 'chung';
      vungMienCount[vm] = (vungMienCount[vm] || 0) + 1;
    });
    res.json({
      huong_vi: hvqnDict,
      chien_si_sinh_nhat: birthdaySoldiers.map(cs => ({
        id: cs.id, ho_ten: cs.ho_ten, cap_bac: cs.cap_bac, chuc_vu: cs.chuc_vu,
        que_quan: cs.que_quan, vung_mien: cs.vung_mien, ngay_sinh: cs.ngay_sinh,
        don_vi_id: cs.don_vi_id, trang_thai: cs.trang_thai
      })),
      so_sinh_nhat: birthdaySoldiers.length,
      phan_bo_vung_mien: vungMienCount
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
