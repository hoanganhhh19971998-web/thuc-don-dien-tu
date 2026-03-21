/**
 * Auth routes - Tương đương auth_routes.py
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, nguoiDungToDict, getUserDonViId } = require('../database');

// Đăng ký
router.post('/api/auth/register', (req, res) => {
  const { ten_dang_nhap, ho_ten, mat_khau, vai_tro = 'chien_si', ten_don_vi, don_vi_id: dvId, email, chien_si_id } = req.body;
  const tenDn = (ten_dang_nhap || '').trim();
  const hoTen = (ho_ten || '').trim();
  if (!tenDn || !hoTen || !mat_khau) return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  if (tenDn.length < 4) return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 4 ký tự' });
  if (mat_khau.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  const existing = db.prepare('SELECT id FROM nguoi_dung WHERE ten_dang_nhap = ?').get(tenDn);
  if (existing) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

  let donViId = dvId || null;
  if (vai_tro === 'admin' && (ten_don_vi || '').trim()) {
    const r = db.prepare("INSERT INTO don_vi (ten, cap_do) VALUES (?, 'dai_doi')").run(ten_don_vi.trim());
    donViId = r.lastInsertRowid;
  }

  const hash = bcrypt.hashSync(mat_khau, 10);
  const result = db.prepare(`INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, email, mat_khau_hash, vai_tro, don_vi_id, chien_si_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(tenDn, hoTen, email || '', hash, vai_tro, donViId, chien_si_id || null);
  const user = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(result.lastInsertRowid);
  req.session.user = nguoiDungToDict(user);
  res.status(201).json(req.session.user);
});

// Đăng nhập
router.post('/api/auth/login', (req, res) => {
  const tenDn = (req.body.ten_dang_nhap || '').trim();
  const matKhau = req.body.mat_khau || '';
  const user = db.prepare('SELECT * FROM nguoi_dung WHERE ten_dang_nhap = ?').get(tenDn);
  if (!user || !bcrypt.compareSync(matKhau, user.mat_khau_hash)) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  if (!user.kich_hoat) return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
  req.session.user = nguoiDungToDict(user);
  res.json(req.session.user);
});

// Đăng xuất
router.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Đã đăng xuất' });
});

// Thông tin user hiện tại
router.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    const result = { ...req.session.user };
    if (result.don_vi_id) {
      const dv = db.prepare('SELECT ten FROM don_vi WHERE id = ?').get(result.don_vi_id);
      result.ten_don_vi = dv ? dv.ten : null;
    }
    return res.json(result);
  }
  res.json(null);
});

// Danh sách users (admin, cùng đơn vị)
router.get('/api/auth/users', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
  const users = db.prepare('SELECT * FROM nguoi_dung WHERE don_vi_id = ?').all(req.session.user.don_vi_id);
  res.json(users.map(nguoiDungToDict));
});

// Cập nhật vai trò
router.put('/api/auth/users/:userId/role', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
  const user = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { vai_tro, kich_hoat } = req.body;
  db.prepare('UPDATE nguoi_dung SET vai_tro = ?, kich_hoat = ? WHERE id = ?')
    .run(vai_tro || user.vai_tro, kich_hoat !== undefined ? (kich_hoat ? 1 : 0) : user.kich_hoat, user.id);
  const updated = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(user.id);
  res.json(nguoiDungToDict(updated));
});

module.exports = router;
