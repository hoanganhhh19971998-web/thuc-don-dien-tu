/* ==========================================
   ADMIN APP - Ứng dụng quản trị riêng biệt
   Chạy tại /admin
   ========================================== */

let adminUser = null;

// === ADMIN AUTH ===
async function checkAdminAuth() {
    try {
        const data = await API.get('/api/auth/me');
        if (data && data.vai_tro === 'admin') {
            adminUser = data;
            showAdminPanel();
            return;
        }
    } catch(e) {}
    showLoginGate();
}

function showLoginGate() {
    document.getElementById('adminLoginGate').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    setTimeout(() => {
        const u = document.getElementById('loginUser');
        if (u) u.focus();
    }, 100);
}

function showAdminPanel() {
    document.getElementById('adminLoginGate').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminAvatarEl').textContent = adminUser.ho_ten.charAt(0).toUpperCase();
    document.getElementById('adminNameEl').textContent = adminUser.ho_ten;
    loadAdminPage('menu');
}

async function adminLogin() {
    const un = document.getElementById('adminUser').value.trim();
    const pw = document.getElementById('adminPass').value;
    const errEl = document.getElementById('adminAuthError');
    if (!un || !pw) { errEl.textContent = 'Vui long dien day du'; errEl.style.display = 'block'; return; }
    try {
        const user = await API.post('/api/auth/login', { ten_dang_nhap: un, mat_khau: pw });
        if (user.vai_tro !== 'admin') {
            errEl.textContent = 'Tai khoan khong co quyen quan tri'; errEl.style.display = 'block'; return;
        }
        adminUser = user;
        showAdminPanel();
        showToast('Chao mung quan tri vien!', 'success');
    } catch(e) {
        errEl.textContent = 'Sai ten dang nhap hoac mat khau'; errEl.style.display = 'block';
    }
}

async function adminLogout() {
    try { await API.post('/api/auth/logout', {}); } catch(e) {}
    adminUser = null;
    showLoginGate();
    showToast('Da dang xuat', 'info');
}

// === ADMIN PAGES ===
function switchAdminPage(tab, el) {
    document.querySelectorAll('.admin-nav-item').forEach(a => a.classList.remove('active'));
    if (el) el.classList.add('active');
    loadAdminPage(tab);
}

async function loadAdminPage(tab) {
    const c = document.getElementById('adminContent');
    c.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    try {
        switch(tab) {
            case 'menu': await renderAdminMenuPage(c); break;
            case 'dishes': await renderAdminDishesPage(c); break;
            case 'users': await renderAdminUsersPage(c); break;
            case 'announce': await renderAdminAnnouncePage(c); break;
            case 'competition': await renderAdminCompPage(c); break;
            case 'waste': await renderAdminWastePage(c); break;
            case 'license': await renderAdminLicensePage(c); break;
        }
    } catch(e) {
        c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

// === THỰC ĐƠN THEO NGÀY ===
async function renderAdminMenuPage(c) {
    const [dishes, menus] = await Promise.all([
        API.get('/api/admin/dishes'),
        API.get('/api/admin/menus')
    ]);
    c.innerHTML = `
    <div class="page-header animate-in"><h2>📅 Quản Lý Thực Đơn Theo Ngày</h2><p>Lập thực đơn cho từng bữa, từng ngày</p></div>
    <div class="grid-2 mb-lg">
        <div class="card animate-in">
            <div class="card-title mb-md">➕ Lập Thực Đơn Mới</div>
            <form id="menuForm">
                <div class="form-group"><label class="form-label">Ngày *</label><input class="form-input" type="date" name="ngay" value="${todayStr()}" required></div>
                <div class="form-group"><label class="form-label">Bữa ăn *</label>
                    <select class="form-select" name="bua" required>
                        <option value="sang">🌅 Bữa Sáng</option><option value="trua">☀️ Bữa Trưa</option><option value="toi">🌙 Bữa Tối</option>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Chọn món ăn (giữ Ctrl chọn nhiều)</label>
                    <select class="form-select" name="mon_an_ids" multiple style="height:200px">
                        ${dishes.map(d => `<option value="${d.id}">${dishEmoji(d.loai)} ${d.ten} (${d.calo} kcal)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Ghi chú</label><input class="form-input" type="text" name="ghi_chu" placeholder="Ghi chú..."></div>
                <button type="submit" class="btn btn-primary" style="width:100%">💾 Lưu Thực Đơn</button>
            </form>
        </div>
        <div class="card animate-in">
            <div class="card-title mb-md">📋 Thực Đơn Đã Lập</div>
            <div style="max-height:500px;overflow-y:auto">
                ${menus.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Chưa có thực đơn</div></div>' :
                menus.map(m => `
                <div style="padding:10px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;gap:8px">
                    <div style="flex:1"><div style="font-weight:700;font-size:0.85rem">${m.bua==='sang'?'🌅':m.bua==='trua'?'☀️':'🌙'} ${m.ngay} - ${m.bua==='sang'?'Sáng':m.bua==='trua'?'Trưa':'Tối'}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted)">${(m.mon_an||[]).map(d=>d.ten).join(', ').substring(0,80)||'Không có món'}</div></div>
                    <button class="btn btn-danger btn-sm" onclick="adminDeleteMenu(${m.id})">🗑️</button>
                </div>`).join('')}
            </div>
        </div>
    </div>`;
    document.getElementById('menuForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const ids = [...this.querySelector('[name=mon_an_ids]').selectedOptions].map(o => parseInt(o.value));
        try {
            await API.post('/api/admin/menus', { ngay: fd.get('ngay'), bua: fd.get('bua'), ghi_chu: fd.get('ghi_chu'), mon_an_ids: ids });
            showToast('Da luu thuc don!', 'success'); loadAdminPage('menu');
        } catch(err) { showToast('Loi!', 'error'); }
    });
}

async function adminDeleteMenu(id) {
    if (!confirm('Xoa thuc don nay?')) return;
    try { await API.delete(`/api/admin/menus/${id}`); showToast('Da xoa!', 'success'); loadAdminPage('menu'); }
    catch(e) { showToast('Loi!', 'error'); }
}

// === QUẢN LÝ MÓN ĂN ===
async function renderAdminDishesPage(c) {
    const dishes = await API.get('/api/admin/dishes');
    c.innerHTML = `
    <div class="page-header animate-in"><h2>🍽️ Quản Lý Món Ăn</h2><p>${dishes.length} món trong hệ thống</p></div>
    <div class="card animate-in">
        <div class="card-header mb-md">
            <div class="card-title">Danh sách món ăn</div>
            <button class="btn btn-primary btn-sm" onclick="openAddDishForm()">➕ Thêm món mới</button>
        </div>
        <div class="table-container">
            <table><thead><tr><th>Tên món</th><th>Loại</th><th>Vùng miền</th><th>Calo</th><th>Protein</th><th>Ảnh</th><th>Thao tác</th></tr></thead>
            <tbody>${dishes.map(d => `<tr>
                <td><strong>${d.ten}</strong>${d.mo_ta ? `<div style="font-size:0.7rem;color:var(--text-muted)">${d.mo_ta}</div>` : ''}</td>
                <td><span class="badge badge-primary">${LOAI_MAP[d.loai]||d.loai}</span></td>
                <td>${VUNG_MAP[d.vung_mien]||d.vung_mien}</td>
                <td>${d.calo}</td><td>${d.protein}g</td>
                <td>${d.hinh_anh?`<img src="${d.hinh_anh}" style="width:40px;height:40px;object-fit:cover;border-radius:4px">`:'—'}</td>
                <td style="white-space:nowrap">
                    <button class="btn btn-outline btn-sm" onclick='openEditDishForm(${JSON.stringify(d).replace(/'/g,"&#39;")})'>✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="adminDeleteDish(${d.id})">🗑️</button>
                </td></tr>`).join('')}</tbody></table>
        </div>
    </div>`;
}

function dishFormContent(d = {}) {
    const loais = ['mon_chinh','mon_phu','canh','trang_mieng','do_uong'];
    const vungs = ['bac','trung','nam','chung'];
    return `
    <form id="dishForm" enctype="multipart/form-data">
        <div class="grid-2">
            <div class="form-group"><label class="form-label">Tên món *</label><input class="form-input" name="ten" value="${d.ten||''}" required></div>
            <div class="form-group"><label class="form-label">Loại món</label><select class="form-select" name="loai">${loais.map(l=>`<option value="${l}" ${d.loai===l?'selected':''}>${LOAI_MAP[l]||l}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Vùng miền</label><select class="form-select" name="vung_mien">${vungs.map(v=>`<option value="${v}" ${d.vung_mien===v?'selected':''}>${VUNG_MAP[v]||v}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Calo</label><input class="form-input" type="number" name="calo" value="${d.calo||0}" min="0"></div>
            <div class="form-group"><label class="form-label">Protein (g)</label><input class="form-input" type="number" name="protein" value="${d.protein||0}" min="0" step="0.1"></div>
            <div class="form-group"><label class="form-label">Chất béo (g)</label><input class="form-input" type="number" name="fat" value="${d.fat||0}" min="0" step="0.1"></div>
            <div class="form-group"><label class="form-label">Tinh bột (g)</label><input class="form-input" type="number" name="carbs" value="${d.carbs||0}" min="0" step="0.1"></div>
            <div class="form-group"><label class="form-label">Vitamin C (mg)</label><input class="form-input" type="number" name="vitamin_c" value="${d.vitamin_c||0}" min="0" step="0.1"></div>
        </div>
        <div class="form-group"><label class="form-label">Mô tả</label><textarea class="form-textarea" name="mo_ta">${d.mo_ta||''}</textarea></div>
        <div class="form-group"><label class="form-label">Ảnh minh họa</label>
            ${d.hinh_anh?`<div style="margin-bottom:8px"><img src="${d.hinh_anh}" style="width:80px;height:60px;object-fit:cover;border-radius:6px"></div>`:''}
            <div class="file-upload"><div class="upload-icon">📸</div><div class="upload-text">Chọn ảnh</div><input type="file" id="dishImgInput" name="hinh_anh" accept="image/*"></div>
            <div class="file-preview" id="dishImgPv"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%">💾 Lưu</button>
    </form>`;
}

function openAddDishForm() {
    openModal('➕ Thêm Món Ăn Mới', dishFormContent());
    setupImagePreview('dishImgInput', 'dishImgPv');
    document.getElementById('dishForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try { await API.postForm('/api/admin/dishes', new FormData(this)); showToast('Da them!', 'success'); closeModal(); loadAdminPage('dishes'); }
        catch(err) { showToast('Loi!', 'error'); }
    });
}

function openEditDishForm(d) {
    openModal('✏️ Sửa: ' + d.ten, dishFormContent(d));
    setupImagePreview('dishImgInput', 'dishImgPv');
    document.getElementById('dishForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try { await API.postForm(`/api/admin/dishes/${d.id}`, new FormData(this)); showToast('Da cap nhat!', 'success'); closeModal(); loadAdminPage('dishes'); }
        catch(err) { showToast('Loi!', 'error'); }
    });
}

async function adminDeleteDish(id) {
    if (!confirm('Xoa mon nay?')) return;
    try { await API.delete(`/api/admin/dishes/${id}`); showToast('Da xoa!', 'success'); loadAdminPage('dishes'); }
    catch(e) { showToast('Loi!', 'error'); }
}

// === QUẢN LÝ NGƯỜI DÙNG ===
async function renderAdminUsersPage(c) {
    const users = await API.get('/api/admin/users');
    c.innerHTML = `
    <div class="page-header animate-in"><h2>👥 Quản Lý Người Dùng</h2><p>${users.length} tài khoản</p></div>
    <div class="card animate-in">
        <div class="table-container"><table><thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
        <tbody>${users.map(u=>`<tr>
            <td><strong>${u.ho_ten}</strong></td>
            <td><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;font-size:0.8rem">${u.ten_dang_nhap}</code></td>
            <td><span class="badge ${u.vai_tro==='admin'?'badge-danger':'badge-info'}">${u.vai_tro==='admin'?'🎖️ Admin':'🪖 Chiến sĩ'}</span></td>
            <td><span class="badge ${u.kich_hoat!==false?'badge-success':'badge-warning'}">${u.kich_hoat!==false?'Hoạt động':'Bị khóa'}</span></td>
            <td style="font-size:0.75rem">${formatDateTime(u.ngay_tao)}</td>
            <td style="white-space:nowrap">${u.ten_dang_nhap!=='admin'?`
                <select onchange="adminSetRole(${u.id},this.value)" style="font-size:0.75rem;padding:2px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text-primary)">
                    <option value="chien_si" ${u.vai_tro==='chien_si'?'selected':''}>Chiến sĩ</option><option value="admin" ${u.vai_tro==='admin'?'selected':''}>Admin</option>
                </select>
                <button class="btn ${u.kich_hoat!==false?'btn-danger':'btn-primary'} btn-sm" onclick="adminToggleUser(${u.id})">${u.kich_hoat!==false?'🔒':'🔓'}</button>`:'<span style="color:var(--text-muted);font-size:0.75rem">Mặc định</span>'}
            </td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

async function adminSetRole(uid, role) {
    try { await API.put(`/api/admin/users/${uid}/role`, { vai_tro: role }); showToast('Da cap nhat!', 'success'); }
    catch(e) { showToast('Loi!', 'error'); }
}

async function adminToggleUser(uid) {
    try { await API.post(`/api/admin/users/${uid}/toggle`, {}); showToast('Da cap nhat!', 'success'); loadAdminPage('users'); }
    catch(e) { showToast('Loi!', 'error'); }
}

// === THÔNG BÁO HẬU CẦN ===
async function renderAdminAnnouncePage(c) {
    const announcements = await API.get('/api/logistics/announcements');
    c.innerHTML = `
    <div class="page-header animate-in"><h2>📢 Quản Lý Thông Báo</h2></div>
    <div class="grid-2 mb-lg">
        <div class="card animate-in">
            <div class="card-title mb-md">➕ Đăng Thông Báo Mới</div>
            <form id="annForm">
                <div class="form-group"><label class="form-label">Tiêu đề *</label><input class="form-input" name="tieu_de" required placeholder="Tiêu đề"></div>
                <div class="form-group"><label class="form-label">Nội dung *</label><textarea class="form-textarea" name="noi_dung" required placeholder="Nội dung thông báo..." style="min-height:100px"></textarea></div>
                <div class="form-group"><label class="form-label">Loại</label>
                    <select class="form-select" name="loai"><option value="thong_bao">📢 Thông báo</option><option value="phan_hoi">💬 Phản hồi</option><option value="canh_bao">⚠️ Cảnh báo</option></select>
                </div>
                <label style="display:flex;align-items:center;gap:6px;margin-bottom:16px;font-size:0.85rem;color:var(--text-secondary)"><input type="checkbox" name="ghim"> 📌 Ghim thông báo</label>
                <button type="submit" class="btn btn-primary" style="width:100%">📢 Đăng</button>
            </form>
        </div>
        <div class="card animate-in">
            <div class="card-title mb-md">📋 Thông báo đã đăng (${announcements.length})</div>
            <div style="max-height:400px;overflow-y:auto">
                ${announcements.map(a => `<div class="announcement ${a.ghim?'pinned':''}">
                    <div class="announcement-title">${a.loai==='canh_bao'?'⚠️':a.loai==='phan_hoi'?'💬':'📢'} ${a.tieu_de}</div>
                    <div class="announcement-body">${a.noi_dung}</div>
                    <div class="announcement-date">${formatDateTime(a.ngay_tao)}</div>
                </div>`).join('')}
            </div>
        </div>
    </div>`;
    document.getElementById('annForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        try {
            await API.post('/api/logistics/announcements', { tieu_de: fd.get('tieu_de'), noi_dung: fd.get('noi_dung'), loai: fd.get('loai'), ghim: fd.get('ghim')==='on' });
            showToast('Da dang!', 'success'); loadAdminPage('announce');
        } catch(err) { showToast('Loi!', 'error'); }
    });
}

// === NHẬP ĐIỂM THI ĐUA ===
async function renderAdminCompPage(c) {
    const ranking = await API.get('/api/competition/ranking');
    c.innerHTML = `
    <div class="page-header animate-in"><h2>🏆 Nhập Điểm Thi Đua</h2></div>
    <div class="grid-2">
        <div class="card animate-in">
            <div class="card-title mb-md">➕ Nhập Điểm Mới</div>
            <form id="compForm">
                <div class="grid-2">
                    <div class="form-group"><label class="form-label">Đơn vị ID</label><input class="form-input" type="number" name="don_vi_id" min="1" required></div>
                    <div class="form-group"><label class="form-label">Ngày</label><input class="form-input" type="date" name="ngay" value="${todayStr()}" required></div>
                    <div class="form-group"><label class="form-label">Đúng giờ (0-10)</label><input class="form-input" type="number" name="diem_dung_gio" min="0" max="10" step="0.5" value="8"></div>
                    <div class="form-group"><label class="form-label">Vệ sinh (0-10)</label><input class="form-input" type="number" name="diem_ve_sinh" min="0" max="10" step="0.5" value="8"></div>
                    <div class="form-group"><label class="form-label">Tiết kiệm (0-10)</label><input class="form-input" type="number" name="diem_tiet_kiem" min="0" max="10" step="0.5" value="8"></div>
                    <div class="form-group"><label class="form-label">Ghi chú</label><input class="form-input" type="text" name="ghi_chu"></div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">➕ Nhập điểm</button>
            </form>
        </div>
        <div class="card animate-in">
            <div class="card-title mb-md">📊 Bảng Xếp Hạng Hiện Tại</div>
            ${ranking.map((r,i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light)">
                <div style="font-size:1.2rem;width:28px;text-align:center">${['🥇','🥈','🥉'][i]||i+1}</div>
                <div style="flex:1"><div style="font-weight:700;font-size:0.85rem">${r.ten_don_vi}</div><div style="font-size:0.7rem;color:var(--text-muted)">⏰${r.diem_dung_gio} 🧹${r.diem_ve_sinh} 🌾${r.diem_tiet_kiem}</div></div>
                <div style="font-weight:800;color:var(--accent)">${r.tong_diem}</div>
            </div>`).join('')}
        </div>
    </div>`;
    document.getElementById('compForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const data = {};
        fd.forEach((v,k) => data[k] = k.includes('diem') || k==='don_vi_id' ? parseFloat(v) : v);
        try { await API.post('/api/competition', data); showToast('Da nhap diem!', 'success'); loadAdminPage('competition'); }
        catch(err) { showToast('Loi!', 'error'); }
    });
}

// === NHẬP THỰC PHẨM THỪA ===
async function renderAdminWastePage(c) {
    const [stats, dishes] = await Promise.all([
        API.get('/api/waste/stats'),
        API.get('/api/dishes')
    ]);
    c.innerHTML = `
    <div class="page-header animate-in"><h2>♻️ Nhập Thực Phẩm Thừa</h2></div>
    <div class="grid-2">
        <div class="card animate-in">
            <div class="card-title mb-md">➕ Nhập Dữ Liệu</div>
            <form id="wasteForm">
                <div class="form-group"><label class="form-label">Món ăn *</label>
                    <select class="form-select" name="mon_an_id" required><option value="">-- Chọn --</option>${dishes.map(d=>`<option value="${d.id}">${d.ten}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label class="form-label">Ngày</label><input class="form-input" type="date" name="ngay" value="${todayStr()}"></div>
                <div class="form-group"><label class="form-label">Lượng thừa (kg) *</label><input class="form-input" type="number" name="luong_thua_kg" min="0.1" step="0.1" required></div>
                <div class="form-group"><label class="form-label">Ghi chú</label><textarea class="form-textarea" name="ghi_chu"></textarea></div>
                <button type="submit" class="btn btn-primary" style="width:100%">➕ Nhập</button>
            </form>
        </div>
        <div class="card animate-in">
            <div class="card-title mb-md">⚠️ Cảnh Báo (Tổng: ${stats.tong_luong_thua_kg}kg)</div>
            ${stats.chi_tiet.slice(0,10).map(s => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light)">
                <div style="width:10px;height:10px;border-radius:50%;background:${s.muc_canh_bao==='cao'?'#dc3545':s.muc_canh_bao==='trung_binh'?'#ffc107':'#28a745'};flex-shrink:0"></div>
                <div style="flex:1"><div style="font-weight:600;font-size:0.85rem">${s.ten_mon}</div><div style="font-size:0.7rem;color:var(--text-muted)">${s.so_lan_du} lần • TB ${s.trung_binh_kg}kg</div></div>
                <div style="font-weight:800;color:var(--danger)">${s.tong_kg}kg</div>
            </div>`).join('')}
        </div>
    </div>`;
    document.getElementById('wasteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        try {
            await API.post('/api/waste', { mon_an_id: parseInt(fd.get('mon_an_id')), ngay: fd.get('ngay'), luong_thua_kg: parseFloat(fd.get('luong_thua_kg')), ghi_chu: fd.get('ghi_chu') });
            showToast('Da nhap!', 'success'); loadAdminPage('waste');
        } catch(err) { showToast('Loi!', 'error'); }
    });
}

// === QUẢN LÝ LICENSE ===
const GOI_LABELS = {
  trial: { label: 'Dùng thử', gia: 'Miễn phí', badge: 'badge-info' },
  '1thang': { label: '1 tháng', gia: '99.000đ', badge: 'badge-primary' },
  '3thang': { label: '3 tháng', gia: '199.000đ', badge: 'badge-success' },
  '6thang': { label: '6 tháng', gia: '299.000đ', badge: 'badge-warning' },
  '1nam': { label: '1 năm', gia: '399.000đ', badge: 'badge-danger' },
};
const TRANG_THAI_LABELS = {
  chua_dung: { label: 'Chưa dùng', badge: 'badge-info' },
  dang_dung: { label: 'Đang dùng', badge: 'badge-success' },
  het_han: { label: 'Hết hạn', badge: 'badge-warning' },
};

async function renderAdminLicensePage(c) {
  const keys = await API.get('/api/admin/licenses');
  const chuaDung = keys.filter(k => k.trang_thai === 'chua_dung').length;
  const dangDung = keys.filter(k => k.trang_thai === 'dang_dung').length;
  const hetHan = keys.filter(k => k.trang_thai === 'het_han').length;

  c.innerHTML = `
  <div class="page-header animate-in"><h2>🔑 Quản Lý License Key</h2><p>${keys.length} key (${chuaDung} chưa dùng, ${dangDung} đang dùng, ${hetHan} hết hạn)</p></div>
  <div class="grid-2 mb-lg">
    <div class="card animate-in">
      <div class="card-title mb-md">➕ Tạo Key Mới</div>
      <form id="licenseForm">
        <div class="form-group"><label class="form-label">Gói dịch vụ *</label>
          <select class="form-select" name="goi" required>
            <option value="1thang">💳 1 tháng — 99.000đ</option>
            <option value="3thang">💎 3 tháng — 199.000đ</option>
            <option value="6thang">🏆 6 tháng — 299.000đ</option>
            <option value="1nam">👑 1 năm — 399.000đ</option>
            <option value="trial">🎁 Dùng thử — Miễn phí</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Số lượng key</label>
          <input class="form-input" type="number" name="so_luong" value="1" min="1" max="50">
        </div>
        <div class="form-group"><label class="form-label">Ghi chú</label>
          <input class="form-input" type="text" name="ghi_chu" placeholder="Tên khách hàng, đơn hàng...">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">🔑 Tạo Key</button>
      </form>
    </div>
    <div class="card animate-in">
      <div class="card-title mb-md">📊 Bảng Giá</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${Object.entries(GOI_LABELS).map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-secondary);border-radius:8px">
          <span><span class="badge ${v.badge}">${v.label}</span></span>
          <span style="font-weight:700;color:var(--accent)">${v.gia}</span>
        </div>`).join('')}
      </div>
      <div style="margin-top:16px;padding:12px;background:rgba(59,130,246,0.1);border-radius:8px;font-size:0.8rem;color:var(--text-secondary)">
        📌 Khách mua tại <a href="https://app-store-pearl.vercel.app" target="_blank" style="color:var(--accent)">app-store-pearl.vercel.app</a> → Admin tạo key → Gửi key cho khách qua Zalo/SMS
      </div>
    </div>
  </div>
  <div class="card animate-in">
    <div class="card-title mb-md">📋 Danh Sách Key (${keys.length})</div>
    <div class="table-container"><table><thead><tr>
      <th>Mã Key</th><th>Gói</th><th>Trạng thái</th><th>Người dùng</th><th>Ngày tạo</th><th>Hết hạn</th><th>Thao tác</th>
    </tr></thead><tbody>
    ${keys.map(k => {
      const goiInfo = GOI_LABELS[k.goi] || { label: k.goi, badge: 'badge-info' };
      const ttInfo = TRANG_THAI_LABELS[k.trang_thai] || { label: k.trang_thai, badge: 'badge-info' };
      return `<tr>
        <td><code style="background:var(--bg-secondary);padding:3px 8px;border-radius:6px;font-size:0.8rem;letter-spacing:1px">${k.key_code}</code></td>
        <td><span class="badge ${goiInfo.badge}">${goiInfo.label}</span></td>
        <td><span class="badge ${ttInfo.badge}">${ttInfo.label}</span></td>
        <td>${k.ho_ten ? `<strong>${k.ho_ten}</strong><div style="font-size:0.7rem;color:var(--text-muted)">${k.ten_dang_nhap}</div>` : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td style="font-size:0.75rem">${formatDateTime(k.ngay_tao)}</td>
        <td style="font-size:0.75rem">${k.ngay_het_han ? formatDateTime(k.ngay_het_han) : '—'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="copyKey('${k.key_code}')" title="Copy">📋</button>
          ${k.trang_thai === 'chua_dung' ? `<button class="btn btn-danger btn-sm" onclick="deleteLicenseKey(${k.id})">🗑️</button>` : ''}
        </td>
      </tr>`;
    }).join('')}
    </tbody></table></div>
  </div>`;

  document.getElementById('licenseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const fd = new FormData(this);
    try {
      const keys = await API.post('/api/admin/licenses', {
        goi: fd.get('goi'), so_luong: parseInt(fd.get('so_luong')), ghi_chu: fd.get('ghi_chu')
      });
      const keyStr = keys.map(k => k.key_code).join('\n');
      showToast(`Đã tạo ${keys.length} key!`, 'success');
      // Show keys in modal for easy copy
      openModal('🔑 Key Đã Tạo', `
        <div style="background:var(--bg-secondary);padding:16px;border-radius:12px;margin-bottom:16px">
          ${keys.map(k => `<div style="font-family:monospace;font-size:1rem;padding:8px 0;letter-spacing:2px;color:var(--accent)">${k.key_code}</div>`).join('')}
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="navigator.clipboard.writeText('${keyStr}');showToast('Đã copy!','success')">📋 Copy Tất Cả</button>
      `);
      loadAdminPage('license');
    } catch(err) { showToast('Lỗi: ' + err.message, 'error'); }
  });
}

function copyKey(code) {
  navigator.clipboard.writeText(code).then(() => showToast('Đã copy: ' + code, 'success'));
}

async function deleteLicenseKey(id) {
  if (!confirm('Xóa key này?')) return;
  try { await API.delete(`/api/admin/licenses/${id}`); showToast('Đã xóa!', 'success'); loadAdminPage('license'); }
  catch(e) { showToast('Lỗi!', 'error'); }
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => checkAdminAuth());
