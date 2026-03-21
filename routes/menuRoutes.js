/**
 * Menu routes - Thực đơn
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, thucDonToDict, getMonAnForThucDon } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

router.get('/api/menu/today', loginRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dvid = getUserDonViId(req);
    const menus = await db.all('SELECT * FROM thuc_don WHERE ngay = ? AND don_vi_id = ?', today, dvid);
    const result = {};
    for (const m of menus) { result[m.bua] = await thucDonToDict(m); }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/menu/week', loginRequired, async (req, res) => {
  try {
    const today = new Date();
    const dvid = getUserDonViId(req);
    const day = today.getDay();
    const start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const menus = await db.all('SELECT * FROM thuc_don WHERE ngay >= ? AND ngay <= ? AND don_vi_id = ? ORDER BY ngay', startStr, endStr, dvid);
    const result = {};
    for (const m of menus) {
      if (!result[m.ngay]) result[m.ngay] = {};
      result[m.ngay][m.bua] = await thucDonToDict(m);
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/menu/date/:dateStr', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const menus = await db.all('SELECT * FROM thuc_don WHERE ngay = ? AND don_vi_id = ?', req.params.dateStr, dvid);
    const result = {};
    for (const m of menus) { result[m.bua] = await thucDonToDict(m); }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/menu', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const { ngay, bua, ghi_chu, mon_an_ids } = req.body;
    const r = await db.run('INSERT INTO thuc_don (ngay, bua, don_vi_id, ghi_chu) VALUES (?, ?, ?, ?)', ngay, bua, dvid, ghi_chu || null);
    if (mon_an_ids && mon_an_ids.length) {
      const ph = mon_an_ids.map(() => '?').join(',');
      const monList = await db.all(`SELECT id FROM mon_an WHERE id IN (${ph}) AND don_vi_id = ?`, ...mon_an_ids, dvid);
      for (const m of monList) { await db.run('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)', r.lastInsertRowid, m.id); }
    }
    const td = await db.get('SELECT * FROM thuc_don WHERE id = ?', r.lastInsertRowid);
    res.status(201).json(await thucDonToDict(td));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/dishes', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const loai = req.query.loai;
    let dishes;
    if (loai) {
      dishes = await db.all('SELECT * FROM mon_an WHERE don_vi_id = ? AND loai = ?', dvid, loai);
    } else {
      dishes = await db.all('SELECT * FROM mon_an WHERE don_vi_id = ?', dvid);
    }
    res.json(dishes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/dishes/:dishId', loginRequired, async (req, res) => {
  try {
    const dish = await db.get('SELECT * FROM mon_an WHERE id = ?', req.params.dishId);
    if (!dish) return res.status(404).json({ error: 'Not found' });
    res.json(dish);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/nutrition/daily/:dateStr', loginRequired, async (req, res) => {
  try {
    const dvid = getUserDonViId(req);
    const menus = await db.all('SELECT * FROM thuc_don WHERE ngay = ? AND don_vi_id = ?', req.params.dateStr, dvid);
    const total = { calo: 0, protein: 0, fat: 0, carbs: 0, vitamin_a: 0, vitamin_c: 0, canxi: 0, sat: 0 };
    const byMeal = {};
    for (const m of menus) {
      const mealTotal = { calo: 0, protein: 0, fat: 0, carbs: 0 };
      const monList = await getMonAnForThucDon(m.id);
      monList.forEach(mon => {
        Object.keys(total).forEach(k => { total[k] += mon[k] || 0; });
        Object.keys(mealTotal).forEach(k => { mealTotal[k] += mon[k] || 0; });
      });
      byMeal[m.bua] = mealTotal;
    }
    res.json({
      ngay: req.params.dateStr,
      tong: Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.round(v * 10) / 10])),
      theo_bua: byMeal
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
