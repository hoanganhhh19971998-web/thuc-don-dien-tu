/**
 * Menu routes - Tương đương menu_routes.py
 */
const express = require('express');
const router = express.Router();
const { db, getUserDonViId, thucDonToDict, getMonAnForThucDon } = require('../database');

const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chua dang nhap' });
  next();
};

// Thực đơn hôm nay
router.get('/api/menu/today', loginRequired, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const dvid = getUserDonViId(req);
  const menus = db.prepare('SELECT * FROM thuc_don WHERE ngay = ? AND don_vi_id = ?').all(today, dvid);
  const result = {};
  menus.forEach(m => { result[m.bua] = thucDonToDict(m); });
  res.json(result);
});

// Thực đơn tuần
router.get('/api/menu/week', loginRequired, (req, res) => {
  const today = new Date();
  const dvid = getUserDonViId(req);
  const day = today.getDay();
  const start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  const menus = db.prepare('SELECT * FROM thuc_don WHERE ngay >= ? AND ngay <= ? AND don_vi_id = ? ORDER BY ngay')
    .all(startStr, endStr, dvid);
  const result = {};
  menus.forEach(m => {
    if (!result[m.ngay]) result[m.ngay] = {};
    result[m.ngay][m.bua] = thucDonToDict(m);
  });
  res.json(result);
});

// Thực đơn theo ngày
router.get('/api/menu/date/:dateStr', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const menus = db.prepare('SELECT * FROM thuc_don WHERE ngay = ? AND don_vi_id = ?').all(req.params.dateStr, dvid);
  const result = {};
  menus.forEach(m => { result[m.bua] = thucDonToDict(m); });
  res.json(result);
});

// Tạo thực đơn
router.post('/api/menu', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const { ngay, bua, ghi_chu, mon_an_ids } = req.body;
  const r = db.prepare('INSERT INTO thuc_don (ngay, bua, don_vi_id, ghi_chu) VALUES (?, ?, ?, ?)').run(ngay, bua, dvid, ghi_chu || null);
  if (mon_an_ids && mon_an_ids.length) {
    const insert = db.prepare('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)');
    const monList = db.prepare(`SELECT id FROM mon_an WHERE id IN (${mon_an_ids.map(() => '?').join(',')}) AND don_vi_id = ?`).all(...mon_an_ids, dvid);
    monList.forEach(m => insert.run(r.lastInsertRowid, m.id));
  }
  const td = db.prepare('SELECT * FROM thuc_don WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(thucDonToDict(td));
});

// Danh sách món ăn
router.get('/api/dishes', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const loai = req.query.loai;
  let dishes;
  if (loai) {
    dishes = db.prepare('SELECT * FROM mon_an WHERE don_vi_id = ? AND loai = ?').all(dvid, loai);
  } else {
    dishes = db.prepare('SELECT * FROM mon_an WHERE don_vi_id = ?').all(dvid);
  }
  res.json(dishes);
});

// Chi tiết món ăn
router.get('/api/dishes/:dishId', loginRequired, (req, res) => {
  const dish = db.prepare('SELECT * FROM mon_an WHERE id = ?').get(req.params.dishId);
  if (!dish) return res.status(404).json({ error: 'Not found' });
  res.json(dish);
});

// Dinh dưỡng theo ngày
router.get('/api/nutrition/daily/:dateStr', loginRequired, (req, res) => {
  const dvid = getUserDonViId(req);
  const menus = db.prepare('SELECT * FROM thuc_don WHERE ngay = ? AND don_vi_id = ?').all(req.params.dateStr, dvid);
  const total = { calo: 0, protein: 0, fat: 0, carbs: 0, vitamin_a: 0, vitamin_c: 0, canxi: 0, sat: 0 };
  const byMeal = {};
  menus.forEach(m => {
    const mealTotal = { calo: 0, protein: 0, fat: 0, carbs: 0 };
    const monList = getMonAnForThucDon(m.id);
    monList.forEach(mon => {
      Object.keys(total).forEach(k => { total[k] += mon[k] || 0; });
      Object.keys(mealTotal).forEach(k => { mealTotal[k] += mon[k] || 0; });
    });
    byMeal[m.bua] = mealTotal;
  });
  res.json({
    ngay: req.params.dateStr,
    tong: Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    theo_bua: byMeal
  });
});

module.exports = router;
