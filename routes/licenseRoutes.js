/**
 * License Key Routes - Quản lý bản quyền
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../database');

const GOI_CONFIG = {
  trial:   { label: 'Dùng thử',   ngay: 30,  gia: 'Miễn phí' },
  '1thang': { label: '1 tháng',   ngay: 30,  gia: '99.000đ' },
  '3thang': { label: '3 tháng',   ngay: 90,  gia: '199.000đ' },
  '6thang': { label: '6 tháng',   ngay: 180, gia: '299.000đ' },
  '1nam':   { label: '1 năm',     ngay: 365, gia: '399.000đ' },
};

function generateKeyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `HA-${part()}-${part()}-${part()}`;
}

const adminRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (req.session.user.vai_tro !== 'admin') return res.status(403).json({ error: 'Cần quyền admin' });
  next();
};
const loginRequired = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  next();
};

// === ADMIN: Tạo key mới ===
router.post('/api/admin/licenses', adminRequired, async (req, res) => {
  try {
    const { goi = '1thang', so_luong = 1, ghi_chu = '' } = req.body;
    if (!GOI_CONFIG[goi]) return res.status(400).json({ error: 'Gói không hợp lệ' });
    const config = GOI_CONFIG[goi];
    const keys = [];
    for (let i = 0; i < Math.min(so_luong, 50); i++) {
      let keyCode;
      for (let retry = 0; retry < 10; retry++) {
        keyCode = generateKeyCode();
        const exists = await db.get('SELECT id FROM license_keys WHERE key_code = ?', keyCode);
        if (!exists) break;
      }
      const r = await db.run(
        'INSERT INTO license_keys (key_code, goi, thoi_han_ngay, ghi_chu) VALUES (?, ?, ?, ?)',
        keyCode, goi, config.ngay, ghi_chu
      );
      keys.push({ id: r.lastInsertRowid, key_code: keyCode, goi, thoi_han_ngay: config.ngay, trang_thai: 'chua_dung' });
    }
    res.status(201).json(keys);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === ADMIN: Xem tất cả keys ===
router.get('/api/admin/licenses', adminRequired, async (req, res) => {
  try {
    const keys = await db.all(`
      SELECT lk.*, nd.ten_dang_nhap, nd.ho_ten
      FROM license_keys lk
      LEFT JOIN nguoi_dung nd ON lk.nguoi_dung_id = nd.id
      ORDER BY lk.ngay_tao DESC
    `);
    res.json(keys);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === ADMIN: Xóa key chưa dùng ===
router.delete('/api/admin/licenses/:id', adminRequired, async (req, res) => {
  try {
    const key = await db.get('SELECT * FROM license_keys WHERE id = ?', req.params.id);
    if (!key) return res.status(404).json({ error: 'Không tìm thấy' });
    if (key.trang_thai === 'dang_dung') return res.status(400).json({ error: 'Không thể xóa key đang sử dụng' });
    await db.run('DELETE FROM license_keys WHERE id = ?', key.id);
    res.json({ message: 'Đã xóa' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === USER: Kích hoạt key ===
router.post('/api/license/activate', loginRequired, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const keyCode = (req.body.key_code || '').trim().toUpperCase();
    if (!keyCode) return res.status(400).json({ error: 'Vui lòng nhập mã key' });

    const key = await db.get('SELECT * FROM license_keys WHERE key_code = ?', keyCode);
    if (!key) return res.status(404).json({ error: 'Mã key không hợp lệ' });
    if (key.trang_thai !== 'chua_dung') return res.status(400).json({ error: 'Key đã được sử dụng' });

    // Hủy key cũ nếu có
    await db.run("UPDATE license_keys SET trang_thai = 'het_han' WHERE nguoi_dung_id = ? AND trang_thai = 'dang_dung'", userId);

    // Kích hoạt key mới
    const now = new Date();
    const hetHan = new Date(now);
    hetHan.setDate(hetHan.getDate() + key.thoi_han_ngay);

    await db.run(
      "UPDATE license_keys SET nguoi_dung_id = ?, trang_thai = 'dang_dung', ngay_kich_hoat = ?, ngay_het_han = ? WHERE id = ?",
      userId, now.toISOString(), hetHan.toISOString(), key.id
    );

    res.json({
      message: 'Kích hoạt thành công!',
      goi: key.goi,
      goi_label: GOI_CONFIG[key.goi]?.label || key.goi,
      ngay_het_han: hetHan.toISOString(),
      con_lai_ngay: key.thoi_han_ngay
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === USER: Kiểm tra trạng thái license ===
router.get('/api/license/status', loginRequired, async (req, res) => {
  try {
    const userId = req.session.user.id;
    // Admin bypass
    if (req.session.user.vai_tro === 'admin') {
      return res.json({ active: true, goi: 'admin', goi_label: 'Quản trị viên', con_lai_ngay: 9999 });
    }

    const key = await db.get(
      "SELECT * FROM license_keys WHERE nguoi_dung_id = ? AND trang_thai = 'dang_dung' ORDER BY ngay_het_han DESC LIMIT 1",
      userId
    );

    if (!key) {
      return res.json({ active: false, goi: null, message: 'Chưa có license. Vui lòng nhập key kích hoạt.' });
    }

    const now = new Date();
    const hetHan = new Date(key.ngay_het_han);
    const conLai = Math.ceil((hetHan - now) / (1000 * 60 * 60 * 24));

    if (conLai <= 0) {
      await db.run("UPDATE license_keys SET trang_thai = 'het_han' WHERE id = ?", key.id);
      return res.json({ active: false, goi: key.goi, message: 'License đã hết hạn. Vui lòng mua key mới.' });
    }

    res.json({
      active: true,
      goi: key.goi,
      goi_label: GOI_CONFIG[key.goi]?.label || key.goi,
      ngay_het_han: key.ngay_het_han,
      con_lai_ngay: conLai,
      canh_bao: conLai <= 7
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === Config endpoint (public) ===
router.get('/api/license/plans', (req, res) => {
  res.json(GOI_CONFIG);
});

module.exports = router;
