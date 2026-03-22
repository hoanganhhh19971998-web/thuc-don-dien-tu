/**
 * Async Seed data - Tương thích PostgreSQL + SQLite
 */
const { db, initDB } = require('./database');

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const sample = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, Math.min(n, arr.length));

async function seedAll() {
  console.log('[SEED] Bat dau seed du lieu...');

  // Check if already seeded
  const existing = await db.get('SELECT COUNT(*) as c FROM mon_an');
  if (existing && existing.c > 0) {
    console.log(`[SEED] Da co ${existing.c} mon an, bo qua seed.`);
    return false;
  }

  // === ĐƠN VỊ ===
  let defaultDv = await db.get("SELECT * FROM don_vi LIMIT 1");
  const daiDoiId = defaultDv ? defaultDv.id : 1;

  const td1 = await db.run("INSERT INTO don_vi (ten, cap_do, don_vi_cha_id) VALUES (?, ?, ?)", 'Trung đội 1', 'trung_doi', daiDoiId);
  const td2 = await db.run("INSERT INTO don_vi (ten, cap_do, don_vi_cha_id) VALUES (?, ?, ?)", 'Trung đội 2', 'trung_doi', daiDoiId);
  const td3 = await db.run("INSERT INTO don_vi (ten, cap_do, don_vi_cha_id) VALUES (?, ?, ?)", 'Trung đội 3', 'trung_doi', daiDoiId);
  const trungDoiIds = [td1.lastInsertRowid, td2.lastInsertRowid, td3.lastInsertRowid];

  const tieuDoiIds = [];
  const trungDoiTens = ['Trung đội 1', 'Trung đội 2', 'Trung đội 3'];
  for (let idx = 0; idx < trungDoiIds.length; idx++) {
    for (let i = 1; i <= 3; i++) {
      const r = await db.run("INSERT INTO don_vi (ten, cap_do, don_vi_cha_id) VALUES (?, ?, ?)",
        `Tiểu đội ${i} - ${trungDoiTens[idx]}`, 'tieu_doi', trungDoiIds[idx]);
      tieuDoiIds.push(r.lastInsertRowid);
    }
  }

  // === CHIẾN SĨ ===
  const capBacList = ['Binh nhì', 'Binh nhất', 'Hạ sĩ', 'Trung sĩ', 'Thượng sĩ'];
  const queQuanData = [
    ['Hà Nội','bac'],['Hải Phòng','bac'],['Nam Định','bac'],['Nghệ An','trung'],['Huế','trung'],
    ['Đà Nẵng','trung'],['Quảng Nam','trung'],['Bình Định','trung'],['TP.HCM','nam'],['Cần Thơ','nam'],
    ['Đồng Nai','nam'],['Bình Dương','nam'],['An Giang','nam'],['Lâm Đồng','nam'],['Thanh Hóa','bac'],
    ['Hà Tĩnh','trung'],['Quảng Bình','trung'],['Sơn La','bac'],['Lào Cai','bac'],['Bắc Giang','bac']
  ];
  const hoList = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi','Đỗ','Hồ'];
  const tenDem = ['Văn','Đức','Minh','Quang','Hữu','Thanh','Công','Đình','Xuân','Trung'];
  const tenList = ['Hùng','Mạnh','Dũng','Tuấn','Anh','Hoàng','Long','Đức','Phong','Khải',
    'Nam','Thắng','Trung','Hải','Sơn','Bình','Quốc','Tâm','Kiên','Hiếu'];

  const allChienSiIds = [];
  for (const tdoiId of tieuDoiIds) {
    const soQuan = randInt(8, 12);
    for (let i = 0; i < soQuan; i++) {
      const [que, vung] = pick(queQuanData);
      const chucVu = i === 0 ? 'Tiểu đội trưởng' : (i === 1 ? 'Phó tiểu đội trưởng' : 'Chiến sĩ');
      const y = randInt(2000, 2005), m = randInt(1, 12), d = randInt(1, 28);
      const ngaySinh = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const r = await db.run(
        'INSERT INTO chien_si (ho_ten, cap_bac, chuc_vu, que_quan, vung_mien, ngay_sinh, don_vi_id, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        `${pick(hoList)} ${pick(tenDem)} ${pick(tenList)}`, pick(capBacList), chucVu, que, vung, ngaySinh, tdoiId, 'tai_vi'
      );
      allChienSiIds.push(r.lastInsertRowid);
    }
  }

  // === MÓN ĂN ===
  const monAnData = [
    ['Thịt lợn kho tàu','Thịt ba chỉ kho với nước dừa và trứng cút','mon_chinh','nam',350,25,22,10,0,0,15,2.5],
    ['Cá kho tộ','Cá basa kho trong tộ đất với tiêu và nước mắm','mon_chinh','nam',280,30,14,5,50,0,40,1.8],
    ['Gà rang muối','Gà ta rang với muối ớt, lá chanh','mon_chinh','chung',320,28,18,8,30,5,12,1.5],
    ['Thịt bò xào sả ớt','Bò xào với sả, ớt, hành tây','mon_chinh','trung',300,26,16,12,20,15,10,3.0],
    ['Cá rô phi chiên giòn','Cá rô phi tẩm bột chiên vàng','mon_chinh','bac',310,24,20,8,40,0,35,1.2],
    ['Đậu phụ sốt cà chua','Đậu phụ rán sốt với cà chua tươi','mon_chinh','bac',200,14,10,18,60,20,150,2.0],
    ['Thịt lợn luộc','Thịt lợn ba chỉ luộc chấm mắm tôm','mon_chinh','bac',280,22,18,2,0,0,8,1.0],
    ['Trứng đúc thịt','Trứng gà đúc với thịt lợn xay và mộc nhĩ','mon_chinh','bac',250,18,16,6,200,0,50,2.0],
    ['Sườn xào chua ngọt','Sườn lợn xào với dứa, cà chua, ớt chuông','mon_chinh','bac',380,24,20,22,40,30,20,1.5],
    ['Cá thu kho','Cá thu kho mặn đậm đà','mon_chinh','trung',290,28,16,4,80,0,30,2.2],
    ['Canh rau muống nấu tôm','Canh rau muống với tôm tươi','canh','bac',80,6,2,8,300,30,60,1.5],
    ['Canh chua cá lóc','Canh chua nấu với cá lóc, bạc hà, giá','canh','nam',120,15,3,10,100,25,30,1.0],
    ['Canh bí đao nấu xương','Canh bí đao nấu với xương lợn','canh','chung',90,8,3,8,20,10,25,0.5],
    ['Canh mồng tơi thịt bằm','Canh mồng tơi nấu với thịt lợn bằm','canh','bac',100,10,4,6,250,15,80,1.2],
    ['Canh khổ qua nhồi thịt','Mướp đắng nhồi thịt lợn nấu canh','canh','nam',110,12,4,8,150,40,20,1.0],
    ['Rau muống xào tỏi','Rau muống xào với tỏi phi vàng','mon_phu','chung',60,3,3,5,350,35,70,2.0],
    ['Dưa chuột muối','Dưa chuột ngâm muối chua ngọt','mon_phu','bac',20,1,0,4,10,5,15,0.3],
    ['Rau cải xào','Cải ngọt xào với tỏi','mon_phu','chung',50,2,2,5,200,40,100,1.5],
    ['Kim chi','Kim chi cải thảo lên men','mon_phu','chung',35,2,0,6,100,20,30,0.8],
    ['Nộm đu đủ','Gỏi đu đủ xanh trộn rau thơm','mon_phu','chung',70,2,3,8,80,50,25,0.5],
    ['Chè đỗ xanh','Chè đỗ xanh nấu nhừ với đường','trang_mieng','bac',150,6,1,28,5,2,30,1.5],
    ['Chuối','Chuối tiêu chín','trang_mieng','chung',90,1,0,23,10,9,5,0.3],
    ['Dưa hấu','Dưa hấu tươi mát','trang_mieng','chung',60,1,0,15,30,12,8,0.2],
    ['Bún chả Hà Nội','Bún chả nướng kiểu Hà Nội','mon_chinh','bac',450,30,18,40,20,10,15,2.0],
    ['Bún bò Huế','Bún bò cay nồng đặc trưng xứ Huế','mon_chinh','trung',420,28,16,38,30,8,20,2.5],
    ['Phở bò','Phở bò truyền thống Hà Nội','mon_chinh','bac',400,25,12,45,10,5,30,1.8],
    ['Cơm tấm sườn','Cơm tấm sườn nướng Sài Gòn','mon_chinh','nam',550,30,22,50,15,8,20,2.0],
    ['Bánh cuốn','Bánh cuốn nhân thịt chấm nước mắm','mon_chinh','bac',300,15,8,40,25,3,10,1.0],
    ['Mì Quảng','Mì Quảng truyền thống Đà Nẵng','mon_chinh','trung',420,25,15,45,40,15,25,2.0],
    ['Hủ tiếu Nam Vang','Hủ tiếu nước trong veo kiểu miền Nam','mon_chinh','nam',380,22,12,42,15,5,18,1.5],
  ];

  const allMonAnIds = [];
  const monAnByLoai = { mon_chinh: [], canh: [], mon_phu: [], trang_mieng: [] };
  for (const d of monAnData) {
    const r = await db.run(
      'INSERT INTO mon_an (ten, mo_ta, loai, vung_mien, calo, protein, fat, carbs, vitamin_a, vitamin_c, canxi, sat, don_vi_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9], d[10], d[11], daiDoiId
    );
    allMonAnIds.push(r.lastInsertRowid);
    if (monAnByLoai[d[2]]) monAnByLoai[d[2]].push(r.lastInsertRowid);
  }

  // === THỰC ĐƠN 7 NGÀY ===
  const today = new Date();
  const mon10Ids = allMonAnIds.slice(0, 10);
  const allThucDonIds = [];

  for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
    const d = new Date(today); d.setDate(d.getDate() + dayOffset);
    const ngay = d.toISOString().split('T')[0];
    for (const bua of ['sang', 'trua', 'toi']) {
      const r = await db.run('INSERT INTO thuc_don (ngay, bua, don_vi_id) VALUES (?, ?, ?)', ngay, bua, daiDoiId);
      allThucDonIds.push(r.lastInsertRowid);
      let monIds;
      if (bua === 'sang') monIds = [...sample(mon10Ids, 2), ...sample(monAnByLoai.mon_phu, 1)];
      else if (bua === 'trua') monIds = [...sample(mon10Ids, 2), ...sample(monAnByLoai.canh, 1), ...sample(monAnByLoai.mon_phu, 1), ...sample(monAnByLoai.trang_mieng, 1)];
      else monIds = [...sample(mon10Ids, 2), ...sample(monAnByLoai.canh, 1), ...sample(monAnByLoai.mon_phu, 1)];
      for (const mId of monIds) {
        try { await db.run('INSERT INTO thuc_don_mon_an (thuc_don_id, mon_an_id) VALUES (?, ?)', r.lastInsertRowid, mId); } catch(e) {}
      }
    }
  }

  // === ĐÁNH GIÁ MẪU ===
  const binhLuanMau = [
    'Rất ngon, đậm đà vừa miệng!', 'Hôm nay bếp nấu tốt lắm!', 'Cơm hơi khô một chút',
    'Canh hơi mặn', 'Thịt mềm, vừa ăn', 'Lượng cơm vừa đủ', 'Rau hơi già, cần chọn kỹ hơn',
    'Món này rất phù hợp khẩu vị', 'Nên thêm gia vị một chút', 'Tuyệt vời! Đề nghị nấu lại tuần sau'
  ];
  for (const tdId of allThucDonIds.slice(0, 15)) {
    const tdRow = await db.get('SELECT ngay FROM thuc_don WHERE id = ?', tdId);
    const numReviews = randInt(5, 15);
    for (let j = 0; j < numReviews; j++) {
      const csId = pick(allChienSiIds);
      const h = randInt(6, 20);
      await db.run(
        'INSERT INTO danh_gia (thuc_don_id, don_vi_id, chien_si_id, so_sao, binh_luan, an_danh, ngay_tao) VALUES (?, ?, ?, ?, ?, ?, ?)',
        tdId, daiDoiId, Math.random() > 0.3 ? csId : null, randInt(2, 5),
        Math.random() > 0.4 ? pick(binhLuanMau) : null, Math.random() > 0.6 ? 1 : 0,
        `${tdRow.ngay} ${String(h).padStart(2,'0')}:00:00`
      );
    }
  }

  // === GÓP Ý MẪU ===
  const gopYData = [
    ['Canh hôm qua hơi mặn, mong bếp điều chỉnh lại ạ', true],
    ['Cơm bữa trưa hôm nay bị khô quá', true],
    ['Đề xuất thêm món rau xào vào bữa tối', false],
    ['Thịt kho hôm nay rất ngon, cảm ơn bếp ạ!', false],
    ['Nên có thêm trái cây tráng miệng vào bữa trưa', true],
    ['Mong bếp nấu phở vào cuối tuần', true],
  ];
  const gopYIds = [];
  for (const [noiDung, anDanh] of gopYData) {
    const csId = pick(allChienSiIds);
    const daysAgo = randInt(0, 7);
    const d2 = new Date(today); d2.setDate(d2.getDate() - daysAgo);
    const r = await db.run(
      'INSERT INTO gop_y (chien_si_id, don_vi_id, noi_dung, an_danh, da_doc, ngay_tao) VALUES (?, ?, ?, ?, ?, ?)',
      anDanh ? null : csId, daiDoiId, noiDung, anDanh ? 1 : 0, Math.random() > 0.5 ? 1 : 0,
      d2.toISOString().replace('T', ' ').split('.')[0]
    );
    gopYIds.push(r.lastInsertRowid);
  }
  if (gopYIds.length) {
    const d2 = new Date(today); d2.setDate(d2.getDate() - 1);
    await db.run("UPDATE gop_y SET phan_hoi = ?, da_doc = 1, ngay_phan_hoi = ? WHERE id = ?",
      'Ghi nhận ý kiến, bếp sẽ điều chỉnh lượng muối. Cảm ơn đồng chí!',
      d2.toISOString().replace('T', ' ').split('.')[0], gopYIds[0]);
  }

  // === BÌNH CHỌN ===
  const monDacSanIds = [];
  monAnData.forEach((d, i) => { if (d[3] !== 'chung' && d[2] === 'mon_chinh') monDacSanIds.push(allMonAnIds[i]); });
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayNum = Math.floor((now - jan1) / 86400000);
  const week = Math.ceil((dayNum + jan1.getDay() + 1) / 7);
  const tuanStr = `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  for (const csId of sample(allChienSiIds, 30)) {
    await db.run('INSERT INTO binh_chon (chien_si_id, mon_an_id, tuan) VALUES (?, ?, ?)', csId, pick(monDacSanIds), tuanStr);
  }

  // === CẮT CƠM ===
  const lyDoList = ['cong_tac', 'gac', 'phep', 'nhiem_vu'];
  const todayStr = today.toISOString().split('T')[0];
  for (const csId of sample(allChienSiIds, 8)) {
    const lyDo = pick(lyDoList);
    const dEnd = new Date(today); dEnd.setDate(dEnd.getDate() + randInt(1, 5));
    const dvTen = await db.get('SELECT dv.ten FROM chien_si cs JOIN don_vi dv ON cs.don_vi_id = dv.id WHERE cs.id = ?', csId);
    await db.run('INSERT INTO cat_com (chien_si_id, ngay_bat_dau, ngay_ket_thuc, ly_do, loai, nguoi_bao) VALUES (?, ?, ?, ?, ?, ?)',
      csId, todayStr, dEnd.toISOString().split('T')[0], lyDo, pick(['cat_com', 'com_hop']),
      `TĐT ${(dvTen?.ten || 'N/A').substring(0, 15)}`);
    const newStatus = lyDo === 'phep' ? 'phep' : (lyDo === 'gac' ? 'gac' : 'cong_tac');
    await db.run('UPDATE chien_si SET trang_thai = ? WHERE id = ?', newStatus, csId);
  }

  // === THỰC PHẨM THỪA ===
  for (let dayOffset = -7; dayOffset < 0; dayOffset++) {
    const d3 = new Date(today); d3.setDate(d3.getDate() + dayOffset);
    const ngay = d3.toISOString().split('T')[0];
    for (let j = 0; j < randInt(1, 3); j++) {
      await db.run('INSERT INTO thuc_pham_thua (mon_an_id, don_vi_id, ngay, luong_thua_kg, ghi_chu) VALUES (?, ?, ?, ?, ?)',
        pick(allMonAnIds), daiDoiId, ngay, Math.round((0.5 + Math.random() * 4.5) * 10) / 10,
        Math.random() > 0.5 ? 'Dư nhiều' : null);
    }
  }

  // === THI ĐUA ===
  for (const tdId of trungDoiIds) {
    for (let dayOffset = -7; dayOffset <= 0; dayOffset++) {
      const d4 = new Date(today); d4.setDate(d4.getDate() + dayOffset);
      await db.run('INSERT INTO thi_dua (don_vi_id, ngay, diem_dung_gio, diem_ve_sinh, diem_tiet_kiem) VALUES (?, ?, ?, ?, ?)',
        tdId, d4.toISOString().split('T')[0],
        Math.round((7 + Math.random() * 3) * 10) / 10,
        Math.round((6 + Math.random() * 4) * 10) / 10,
        Math.round((5 + Math.random() * 5) * 10) / 10);
    }
  }

  // === THÔNG BÁO HẬU CẦN ===
  await db.run('INSERT INTO thong_bao_hau_can (tieu_de, noi_dung, loai, don_vi_id, gop_y_id, ghim) VALUES (?, ?, ?, ?, ?, ?)',
    'Điều chỉnh thực đơn tuần tới', 'Do nguồn cung thịt lợn từ trạm tăng gia bị gián đoạn, bếp ăn sẽ thay thế bằng thịt gà và cá trong 3 ngày đầu tuần.', 'thong_bao', daiDoiId, null, 1);
  await db.run('INSERT INTO thong_bao_hau_can (tieu_de, noi_dung, loai, don_vi_id, gop_y_id, ghim) VALUES (?, ?, ?, ?, ?, ?)',
    'Phản hồi ý kiến về canh mặn', 'Ghi nhận ý kiến. Bếp ăn đã nhắc nhở nhân viên và sẽ kiểm tra lại quy trình nêm nếm.', 'phan_hoi', daiDoiId, gopYIds[0] || null, 0);
  await db.run('INSERT INTO thong_bao_hau_can (tieu_de, noi_dung, loai, don_vi_id, gop_y_id, ghim) VALUES (?, ?, ?, ?, ?, ?)',
    'Kết quả bình chọn món cuối tuần', 'Món được bình chọn nhiều nhất tuần này là Bún chả Hà Nội. Bếp sẽ phục vụ vào trưa Chủ nhật.', 'thong_bao', daiDoiId, null, 0);

  // === HƯƠNG VỊ QUÊ NHÀ ===
  const bunBoHueId = allMonAnIds[24]; // Bún bò Huế
  await db.run('INSERT INTO huong_vi_que_nha (mon_an_id, don_vi_id, thang, nam, mo_ta) VALUES (?, ?, ?, ?, ?)',
    bunBoHueId, daiDoiId, today.getMonth() + 1, today.getFullYear(),
    'Nhân dịp sinh nhật các chiến sĩ quê miền Trung trong tháng, nhà ăn phục vụ món Bún bò Huế - hương vị đặc trưng xứ Cố đô.');

  console.log(`[SEED] Xong: ${allChienSiIds.length} chien si, ${allMonAnIds.length} mon an, ${allThucDonIds.length} thuc don`);
  return true;
}

module.exports = { seedAll };
