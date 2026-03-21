/**
 * Auth routes - Đăng nhập/Đăng ký
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, nguoiDungToDict, getUserDonViId } = require('../database');

// Đăng ký
router.post('/api/auth/register', async (req, res) => {
  try {
    const { ten_dang_nhap, ho_ten, mat_khau, vai_tro = 'chien_si', ten_don_vi, don_vi_id: dvId, email, chien_si_id } = req.body;
    const tenDn = (ten_dang_nhap || '').trim();
    const hoTen = (ho_ten || '').trim();
    if (!tenDn || !hoTen || !mat_khau) return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    if (tenDn.length < 4) return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 4 ký tự' });
    if (mat_khau.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    const existing = await db.get('SELECT id FROM nguoi_dung WHERE ten_dang_nhap = ?', tenDn);
    if (existing) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

    let donViId = dvId || null;
    if (vai_tro === 'admin' && (ten_don_vi || '').trim()) {
      const r = await db.run("INSERT INTO don_vi (ten, cap_do) VALUES (?, 'dai_doi')", ten_don_vi.trim());
      donViId = r.lastInsertRowid;
    }

    const hash = bcrypt.hashSync(mat_khau, 10);
    const result = await db.run(`INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, email, mat_khau_hash, vai_tro, don_vi_id, chien_si_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, tenDn, hoTen, email || '', hash, vai_tro, donViId, chien_si_id || null);
    const user = await db.get('SELECT * FROM nguoi_dung WHERE id = ?', result.lastInsertRowid);
    req.session.user = nguoiDungToDict(user);
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.status(201).json(req.session.user);
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Đăng nhập
router.post('/api/auth/login', async (req, res) => {
  try {
    const tenDn = (req.body.ten_dang_nhap || '').trim();
    const matKhau = req.body.mat_khau || '';
    const user = await db.get('SELECT * FROM nguoi_dung WHERE ten_dang_nhap = ?', tenDn);
    if (!user || !bcrypt.compareSync(matKhau, user.mat_khau_hash)) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    if (!user.kich_hoat) return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    req.session.user = nguoiDungToDict(user);
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json(req.session.user);
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Đăng xuất
router.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Đã đăng xuất' });
});

// Thông tin user hiện tại
router.get('/api/auth/me', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      const result = { ...req.session.user };
      if (result.don_vi_id) {
        const dv = await db.get('SELECT ten FROM don_vi WHERE id = ?', result.don_vi_id);
        result.ten_don_vi = dv ? dv.ten : null;
      }
      return res.json(result);
    }
    res.json(null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Danh sách users
router.get('/api/auth/users', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
    const users = await db.all('SELECT * FROM nguoi_dung WHERE don_vi_id = ?', req.session.user.don_vi_id);
    res.json(users.map(nguoiDungToDict));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cập nhật vai trò
router.put('/api/auth/users/:userId/role', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
    const user = await db.get('SELECT * FROM nguoi_dung WHERE id = ?', req.params.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { vai_tro, kich_hoat } = req.body;
    await db.run('UPDATE nguoi_dung SET vai_tro = ?, kich_hoat = ? WHERE id = ?',
      vai_tro || user.vai_tro, kich_hoat !== undefined ? (kich_hoat ? 1 : 0) : user.kich_hoat, user.id);
    const updated = await db.get('SELECT * FROM nguoi_dung WHERE id = ?', user.id);
    res.json(nguoiDungToDict(updated));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
