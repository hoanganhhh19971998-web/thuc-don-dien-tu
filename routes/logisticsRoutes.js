/**
 * Logistics routes - Tương đương logistics_routes.py
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

// Dashboard
router.get('/api/logistics/dashboard', loginRequired, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const dvid = getUserDonViId(req);
  const ratingStats = db.prepare('SELECT AVG(so_sao) as tb, COUNT(id) as tong FROM danh_gia WHERE don_vi_id = ?').get(dvid);
  const gopYChuaDoc = db.prepare('SELECT COUNT(*) as c FROM gop_y WHERE da_doc = 0 AND don_vi_id = ?').get(dvid).c;
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  const startWeek = d.toISOString().split('T')[0];
  const thuaTuan = db.prepare('SELECT COALESCE(SUM(luong_thua_kg), 0) as s FROM thuc_pham_thua WHERE ngay >= ? AND don_vi_id = ?').get(startWeek, dvid).s;
  const soBuaHomNay = db.prepare('SELECT COUNT(*) as c FROM thuc_don WHERE ngay = ? AND don_vi_id = ?').get(today, dvid).c;
  res.json({
    danh_gia_trung_binh: Math.round((ratingStats.tb || 0) * 10) / 10,
    tong_danh_gia: ratingStats.tong || 0,
    gop_y_chua_doc: gopYChuaDoc,
    so_bua_hom_nay: soBuaHomNay,
    thuc_pham_thua_tuan_kg: Math.round(thuaTuan * 10) / 10
  });
});

// Thông báo hậu cần
router.get('/api/logistics/announcements', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const list = db.prepare('SELECT * FROM thong_bao_hau_can WHERE don_vi_id = ? ORDER BY ghim DESC, ngay_tao DESC').all(dvid);
  res.json(list.map(a => ({
    id: a.id, tieu_de: a.tieu_de, noi_dung: a.noi_dung, loai: a.loai,
    gop_y_id: a.gop_y_id, ghim: !!a.ghim, ngay_tao: a.ngay_tao
  })));
});

router.post('/api/logistics/announcements', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const { tieu_de, noi_dung, loai = 'thong_bao', gop_y_id, ghim = false } = req.body;
  const r = db.prepare('INSERT INTO thong_bao_hau_can (tieu_de, noi_dung, don_vi_id, loai, gop_y_id, ghim) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tieu_de, noi_dung, dvid, loai, gop_y_id || null, ghim ? 1 : 0);
  const tb = db.prepare('SELECT * FROM thong_bao_hau_can WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ id: tb.id, tieu_de: tb.tieu_de, noi_dung: tb.noi_dung, loai: tb.loai, gop_y_id: tb.gop_y_id, ghim: !!tb.ghim, ngay_tao: tb.ngay_tao });
});

// Báo cáo hài lòng
router.get('/api/logistics/satisfaction-report', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const months = parseInt(req.query.months) || 3;
  const result = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
    const year = d.getFullYear(); const month = d.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextM = new Date(year, month, 1);
    const monthEnd = new Date(nextM - 86400000).toISOString().split('T')[0];
    const stats = db.prepare(`SELECT AVG(so_sao) as tb, COUNT(id) as tong,
      SUM(CASE WHEN so_sao >= 4 THEN 1 ELSE 0 END) as tot,
      SUM(CASE WHEN so_sao <= 2 THEN 1 ELSE 0 END) as kem
      FROM danh_gia WHERE don_vi_id = ? AND ngay_tao >= ? AND ngay_tao <= ?`).get(dvid, monthStart, monthEnd + ' 23:59:59');
    result.push({
      thang: `${year}-${String(month).padStart(2, '0')}`,
      trung_binh: Math.round((stats.tb || 0) * 10) / 10,
      tong_danh_gia: stats.tong || 0,
      danh_gia_tot: stats.tot || 0,
      danh_gia_kem: stats.kem || 0
    });
  }
  res.json(result);
});

// Hương vị quê nhà
router.get('/api/hometown-flavor', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const hvqn = db.prepare('SELECT * FROM huong_vi_que_nha WHERE thang = ? AND nam = ? AND don_vi_id = ?').get(month, year, dvid);
  let hvqnDict = null;
  if (hvqn) {
    const ma = db.prepare('SELECT * FROM mon_an WHERE id = ?').get(hvqn.mon_an_id);
    hvqnDict = { id: hvqn.id, mon_an_id: hvqn.mon_an_id, mon_an: ma || null, thang: hvqn.thang, nam: hvqn.nam, mo_ta: hvqn.mo_ta };
  }
  const birthdaySoldiers = dvid ? db.prepare(
    `SELECT * FROM chien_si WHERE CAST(strftime('%m', ngay_sinh) AS INTEGER) = ? AND don_vi_id = ?`
  ).all(month, dvid) : [];
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
});

module.exports = router;
