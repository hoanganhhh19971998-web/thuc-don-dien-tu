/**
 * Personnel routes - Quân số & Cắt cơm
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, getDonViChildIds, chienSiToDict, catComToDict, donViToDict } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/personnel', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const dvIdParam = req.query.don_vi_id ? parseInt(req.query.don_vi_id) : null;
    const donViIds = await getDonViChildIds(dvid);
    if (!donViIds.length) return res.json([]);
    if (dvIdParam && donViIds.includes(dvIdParam)) {
      const list = await db.all('SELECT * FROM chien_si WHERE don_vi_id = ?', dvIdParam);
      return res.json(await Promise.all(list.map(chienSiToDict)));
    }
    const ph = donViIds.map(() => '?').join(',');
    const list = await db.all(`SELECT * FROM chien_si WHERE don_vi_id IN (${ph})`, ...donViIds);
    res.json(await Promise.all(list.map(chienSiToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/personnel/stats', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const today = new Date().toISOString().split('T')[0];
    const donViIds = await getDonViChildIds(dvid);
    if (!donViIds.length) return res.json({ tong_quan_so: 0, tai_don_vi: 0, vang_mat: 0, cat_com_hom_nay: 0, an_tai_don_vi: 0 });
    const ph = donViIds.map(() => '?').join(',');
    const total = (await db.get(`SELECT COUNT(*) as c FROM chien_si WHERE don_vi_id IN (${ph})`, ...donViIds)).c;
    const taiVi = (await db.get(`SELECT COUNT(*) as c FROM chien_si WHERE don_vi_id IN (${ph}) AND trang_thai = 'tai_vi'`, ...donViIds)).c;
    const catComToday = (await db.get(`SELECT COUNT(*) as c FROM cat_com cc JOIN chien_si cs ON cc.chien_si_id = cs.id
      WHERE cc.ngay_bat_dau <= ? AND cc.ngay_ket_thuc >= ? AND cs.don_vi_id IN (${ph})`, today, today, ...donViIds)).c;
    const t = parseInt(total) || 0;
    const tv = parseInt(taiVi) || 0;
    const cc = parseInt(catComToday) || 0;
    res.json({ tong_quan_so: t, tai_don_vi: tv, vang_mat: t - tv, cat_com_hom_nay: cc, an_tai_don_vi: t - cc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/units', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    if (!dvid) return res.json([]);
    const units = await db.all('SELECT * FROM don_vi WHERE id = ? OR don_vi_cha_id = ?', dvid, dvid);
    res.json(await Promise.all(units.map(donViToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/meal-cuts', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const today = new Date().toISOString().split('T')[0];
    const activeOnly = (req.query.active || 'true').toLowerCase() === 'true';
    const donViIds = await getDonViChildIds(dvid);
    if (!donViIds.length) return res.json([]);
    const ph = donViIds.map(() => '?').join(',');
    let records;
    if (activeOnly) {
      records = await db.all(`SELECT cc.* FROM cat_com cc JOIN chien_si cs ON cc.chien_si_id = cs.id
        WHERE cs.don_vi_id IN (${ph}) AND cc.ngay_bat_dau <= ? AND cc.ngay_ket_thuc >= ? ORDER BY cc.ngay_tao DESC`, ...donViIds, today, today);
    } else {
      records = await db.all(`SELECT cc.* FROM cat_com cc JOIN chien_si cs ON cc.chien_si_id = cs.id
        WHERE cs.don_vi_id IN (${ph}) ORDER BY cc.ngay_tao DESC`, ...donViIds);
    }
    res.json(await Promise.all(records.map(catComToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/meal-cuts', loginRequired, async (req, res) => {
  try {
    const { chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do = '', loai = 'cat_com', ghi_chu, nguoi_bao } = req.body;
    const r = await db.run('INSERT INTO cat_com (chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do, loai, ghi_chu, nguoi_bao) VALUES (?, ?, ?, ?, ?, ?, ?)',
      chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do, loai, ghi_chu || null, nguoi_bao || null);
    const cs = await db.get('SELECT * FROM chien_si WHERE id = ?', chien_si_id);
    if (cs) {
      const newStatus = ly_do === 'phep' ? 'phep' : (ly_do === 'gac' ? 'gac' : 'cong_tac');
      await db.run('UPDATE chien_si SET trang_thai = ? WHERE id = ?', newStatus, chien_si_id);
    }
    const cc = await db.get('SELECT * FROM cat_com WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await catComToDict(cc));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/meal-cuts/:cutId', loginRequired, async (req, res) => {
  try {
    const cc = await db.get('SELECT * FROM cat_com WHERE id = ?', req.params.cutId);
    if (!cc) return res.status(404).json({ error: 'Not found' });
    await db.run("UPDATE chien_si SET trang_thai = 'tai_vi' WHERE id = ?", cc.chien_si_id);
    await db.run('DELETE FROM cat_com WHERE id = ?', cc.id);
    res.json({ message: 'Đã hủy cắt cơm' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/personnel/birthdays', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const donViIds = await getDonViChildIds(dvid);
    if (!donViIds.length) return res.json([]);
    const ph = donViIds.map(() => '?').join(',');
    const IS_PG = !!process.env.DATABASE_URL;
    let list;
    if (IS_PG) {
      list = await db.all(`SELECT * FROM chien_si WHERE EXTRACT(MONTH FROM ngay_sinh::date)::integer = ? AND don_vi_id IN (${ph})`, month, ...donViIds);
    } else {
      list = await db.all(`SELECT * FROM chien_si WHERE CAST(strftime('%m', ngay_sinh) AS INTEGER) = ? AND don_vi_id IN (${ph})`, month, ...donViIds);
    }
    res.json(await Promise.all(list.map(chienSiToDict)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
