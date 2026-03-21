/* ==========================================
   PAGES - Quân số, Dashboard, Thực phẩm thừa
   ========================================== */

// === QUÂN SỐ & CẮT CƠM ===
async function renderPersonnel() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>👥 Quân Số & Cắt Cơm</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [soldiers, stats, units, cuts] = await Promise.all([
            API.get('/api/personnel'),
            API.get('/api/personnel/stats'),
            API.get('/api/units'),
            API.get('/api/meal-cuts')
        ]);

        const unitFilter = units.filter(u => u.cap_do === 'tieu_doi').slice(0, 20);
        const trangThaiColors = {
            tai_vi: '#28a745', cong_tac: '#17a2b8', phep: '#ffc107', gac: '#dc3545'
        };

        const statsHTML = `
        <div class="stats-grid stagger-in mb-lg">
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${stats.tong_quan_so}</div><div class="stat-label">Tổng quân số</div></div>
            <div class="stat-card"><div class="stat-icon">🍽️</div><div class="stat-value">${stats.an_tai_don_vi}</div><div class="stat-label">Ăn tại đơn vị</div></div>
            <div class="stat-card"><div class="stat-icon">✂️</div><div class="stat-value">${stats.cat_com_hom_nay}</div><div class="stat-label">Cắt cơm hôm nay</div></div>
            <div class="stat-card"><div class="stat-icon">🚶</div><div class="stat-value">${stats.cong_tac + stats.nghi_phep + stats.lam_nhiem_vu}</div><div class="stat-label">Vắng mặt</div></div>
        </div>`;

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>👥 Quản Lý Quân Số & Cắt Cơm</h2>
                <p>Thống kê và báo cắt cơm chính xác</p>
            </div>
            ${statsHTML}

            <div class="tabs" id="personnelTabs">
                <div class="tab active" onclick="switchPersonnelTab('list', this)">👥 Danh sách quân nhân</div>
                <div class="tab" onclick="switchPersonnelTab('catcom', this)">✂️ Cắt cơm hôm nay (${cuts.length})</div>
                <div class="tab" onclick="switchPersonnelTab('form', this)">➕ Báo cắt cơm</div>
            </div>

            <div id="personnelTabList">
                <div class="card animate-in">
                    <div class="card-header mb-md">
                        <div class="card-title">📋 Danh Sách Chiến Sĩ</div>
                        <select class="form-select" id="unitFilterSelect" style="width:auto" onchange="filterPersonnel(this.value)">
                            <option value="">-- Tất cả đơn vị --</option>
                            ${unitFilter.map(u => `<option value="${u.id}">${u.ten}</option>`).join('')}
                        </select>
                    </div>
                    <div class="table-container">
                        <table id="personnelTable">
                            <thead><tr>
                                <th>Họ tên</th><th>Cấp bậc</th><th>Chức vụ</th>
                                <th>Quê quán</th><th>Đơn vị</th><th>Trạng thái</th>
                            </tr></thead>
                            <tbody>
                                ${soldiers.slice(0, 50).map(cs => `
                                <tr>
                                    <td><strong>${cs.ho_ten}</strong></td>
                                    <td>${cs.cap_bac || '-'}</td>
                                    <td>${cs.chuc_vu || '-'}</td>
                                    <td>${cs.que_quan || '-'}</td>
                                    <td style="font-size:0.75rem">${cs.don_vi_ten || '-'}</td>
                                    <td><span class="badge ${TRANG_THAI_MAP[cs.trang_thai]?.class || 'badge-info'}">${TRANG_THAI_MAP[cs.trang_thai]?.label || cs.trang_thai}</span></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px">Hiển thị 50/${soldiers.length} chiến sĩ</div>
                </div>
            </div>

            <div id="personnelTabCatcom" style="display:none">
                <div class="card animate-in">
                    <div class="card-title mb-md">✂️ Danh Sách Cắt Cơm Hôm Nay</div>
                    ${cuts.length === 0 ? '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Không có ai cắt cơm hôm nay</div></div>' : `
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Chiến sĩ</th><th>Đơn vị</th><th>Lý do</th><th>Loại</th><th>Đến ngày</th><th>Thao tác</th></tr></thead>
                            <tbody>
                                ${cuts.map(c => `
                                <tr>
                                    <td><strong>${c.chien_si_ten}</strong></td>
                                    <td style="font-size:0.75rem">${c.don_vi_ten || '-'}</td>
                                    <td>${c.ly_do || '-'}</td>
                                    <td><span class="badge ${c.loai === 'com_hop' ? 'badge-info' : 'badge-warning'}">${c.loai === 'com_hop' ? '📦 Cơm hộp' : '✂️ Cắt cơm'}</span></td>
                                    <td>${c.ngay_ket_thuc}</td>
                                    <td><button class="btn btn-danger btn-sm" onclick="deleteCut(${c.id})">🗑️</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>`}
                </div>
            </div>

            <div id="personnelTabForm" style="display:none">
                <div class="card animate-in" style="max-width:600px">
                    <div class="card-title mb-md">➕ Báo Cắt Cơm / Nhận Cơm Hộp</div>
                    <form id="mealCutForm">
                        <div class="form-group">
                            <label class="form-label">ID Chiến sĩ *</label>
                            <input class="form-input" type="number" name="chien_si_id" placeholder="Nhập ID chiến sĩ" min="1" required>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">Từ ngày *</label>
                                <input class="form-input" type="date" name="ngay_bat_dau" value="${todayStr()}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Đến ngày *</label>
                                <input class="form-input" type="date" name="ngay_ket_thuc" value="${todayStr()}" required>
                            </div>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">Lý do</label>
                                <select class="form-select" name="ly_do">
                                    <option value="cong_tac">Công tác</option>
                                    <option value="gac">Gác - Làm nhiệm vụ</option>
                                    <option value="phep">Nghỉ phép</option>
                                    <option value="nhiem_vu">Nhiệm vụ khác</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Loại</label>
                                <select class="form-select" name="loai">
                                    <option value="cat_com">✂️ Cắt cơm</option>
                                    <option value="com_hop">📦 Nhận cơm hộp</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Người báo</label>
                            <input class="form-input" type="text" name="nguoi_bao" placeholder="Tên tiểu đội trưởng">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ghi chú</label>
                            <textarea class="form-textarea" name="ghi_chu" placeholder="Thông tin thêm..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" style="width:100%">✂️ Xác Nhận Cắt Cơm</button>
                    </form>
                </div>
            </div>`;

        document.getElementById('mealCutForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            const data = Object.fromEntries(fd.entries());
            data.chien_si_id = parseInt(data.chien_si_id);
            try {
                await API.post('/api/meal-cuts', data);
                showToast('Đã báo cắt cơm thành công! ✂️', 'success');
                renderPersonnel();
            } catch(err) {
                showToast('Báo cắt cơm thất bại!', 'error');
            }
        });
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

function switchPersonnelTab(tab, el) {
    document.querySelectorAll('#personnelTabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['list','catcom','form'].forEach(t => {
        const d = document.getElementById(`personnelTab${t.charAt(0).toUpperCase()+t.slice(1)}`);
        if (d) d.style.display = t === tab ? 'block' : 'none';
    });
}

async function deleteCut(id) {
    if (!confirm('Hủy cắt cơm này?')) return;
    try {
        await API.delete(`/api/meal-cuts/${id}`);
        showToast('Đã hủy cắt cơm!', 'success');
        renderPersonnel();
    } catch(e) { showToast('Thất bại!', 'error'); }
}

// === THỰC PHẨM THỪA ===
async function renderWaste() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>♻️ Thực Phẩm Thừa</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [stats, daily, dishes] = await Promise.all([
            API.get('/api/waste/stats'),
            API.get('/api/waste/daily'),
            API.get('/api/dishes')
        ]);

        const canh_bao_map = { cao: '#dc3545', trung_binh: '#ffc107', thap: '#28a745' };
        const maxKg = Math.max(...daily.map(d => d.tong_kg), 1);

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>♻️ Theo Dõi Thực Phẩm Thừa</h2>
                <p>Giảm lãng phí - nâng cao chất lượng</p>
            </div>

            <div class="card animate-in mb-lg">
                <div class="card-header mb-md">
                    <div class="card-title">📈 Lượng Thừa Theo Ngày (14 ngày)</div>
                    <div style="font-size:0.85rem; color:var(--accent); font-weight:700">Tổng: ${stats.tong_luong_thua_kg} kg</div>
                </div>
                <div class="bar-chart" style="padding-bottom:30px; margin-bottom:10px">
                    ${daily.map(d => {
                        const pct = Math.round((d.tong_kg / maxKg) * 100);
                        const dateLabel = new Date(d.ngay).getDate() + '/'+ (new Date(d.ngay).getMonth()+1);
                        return `<div class="bar" style="height:${Math.max(pct,5)}%" title="${d.tong_kg}kg ngày ${d.ngay}">
                            <div class="bar-value">${d.tong_kg}kg</div>
                            <div class="bar-label">${dateLabel}</div>
                        </div>`;
                    }).join('')}
                    ${daily.length === 0 ? '<div style="color:var(--text-muted); font-size:0.85rem">Không có dữ liệu</div>' : ''}
                </div>
            </div>

            <div class="grid-2">
                <div class="card animate-in">
                    <div class="card-title mb-md">⚠️ Cảnh Báo Món Dư Nhiều</div>
                    ${stats.chi_tiet.length === 0 ? '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Không có cảnh báo</div></div>' :
                    stats.chi_tiet.slice(0, 10).map(s => `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-light)">
                        <div style="width:10px; height:10px; border-radius:50%; background:${canh_bao_map[s.muc_canh_bao]}; flex-shrink:0"></div>
                        <div style="flex:1">
                            <div style="font-weight:600; font-size:0.85rem">${s.ten_mon}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted)">${s.so_lan_du} lần dư • TB ${s.trung_binh_kg}kg/lần</div>
                        </div>
                        <div style="font-weight:800; color:${canh_bao_map[s.muc_canh_bao]}; font-size:0.9rem">${s.tong_kg}kg</div>
                    </div>`).join('')}
                </div>

                <div class="card animate-in">
                    <div class="card-title mb-md">➕ Nhập Thực Phẩm Thừa</div>
                    <form id="wasteForm">
                        <div class="form-group">
                            <label class="form-label">Món ăn *</label>
                            <select class="form-select" name="mon_an_id" required>
                                <option value="">-- Chọn món --</option>
                                ${dishes.map(d => `<option value="${d.id}">${d.ten}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ngày</label>
                            <input class="form-input" type="date" name="ngay" value="${todayStr()}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Lượng thừa (kg) *</label>
                            <input class="form-input" type="number" name="luong_thua_kg" min="0.1" step="0.1" placeholder="VD: 2.5" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ghi chú</label>
                            <textarea class="form-textarea" name="ghi_chu" placeholder="Lý do dư thừa..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%">➕ Nhập Dữ Liệu</button>
                    </form>
                </div>
            </div>`;

        document.getElementById('wasteForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            const data = Object.fromEntries(fd.entries());
            data.mon_an_id = parseInt(data.mon_an_id);
            data.luong_thua_kg = parseFloat(data.luong_thua_kg);
            try {
                await API.post('/api/waste', data);
                showToast('Đã nhập dữ liệu thực phẩm thừa! ♻️', 'success');
                renderWaste();
            } catch(err) { showToast('Nhập dữ liệu thất bại!', 'error'); }
        });
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

// === DASHBOARD HẬU CẦN ===
async function renderLogistics() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>📋 Dashboard Hậu Cần</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [dash, feedback, announcements, report] = await Promise.all([
            API.get('/api/logistics/dashboard'),
            API.get('/api/feedback'),
            API.get('/api/logistics/announcements'),
            API.get('/api/logistics/satisfaction-report')
        ]);

        const unread = feedback.filter(f => !f.da_doc);

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>📋 Dashboard Trợ Lý Hậu Cần</h2>
                <p>Tổng quan toàn bộ hoạt động nhà ăn</p>
            </div>

            <div class="stats-grid stagger-in mb-lg">
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-value">${dash.danh_gia_trung_binh}/5</div>
                    <div class="stat-label">Điểm hài lòng TB</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🍽️</div>
                    <div class="stat-value">${dash.quan_so_an}</div>
                    <div class="stat-label">Xuất ăn hôm nay</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📮</div>
                    <div class="stat-value">${dash.gop_y_chua_doc}</div>
                    <div class="stat-label">Góp ý chưa đọc</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">♻️</div>
                    <div class="stat-value">${dash.thuc_pham_thua_tuan_kg}kg</div>
                    <div class="stat-label">Thực phẩm thừa tuần</div>
                </div>
            </div>

            <div class="grid-2 mb-lg">
                <!-- Báo cáo hài lòng 3 tháng -->
                <div class="card animate-in">
                    <div class="card-title mb-md">📊 Báo Cáo Hài Lòng 3 Tháng</div>
                    ${report.map(r => `
                    <div style="margin-bottom:14px">
                        <div class="flex-between" style="margin-bottom:4px">
                            <span style="font-size:0.85rem; font-weight:600">Tháng ${r.thang}</span>
                            <span style="font-weight:800; color:var(--accent)">${r.trung_binh}⭐ (${r.tong_danh_gia} đánh giá)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar-fill ${r.trung_binh >= 4 ? 'progress-green' : r.trung_binh >= 3 ? 'progress-yellow' : 'progress-red'}"
                                 style="width:${Math.round(r.trung_binh/5*100)}%"></div>
                        </div>
                        <div style="display:flex;gap:12px;margin-top:4px">
                            <span style="font-size:0.7rem;color:var(--success)">😊 Tốt: ${r.danh_gia_tot}</span>
                            <span style="font-size:0.7rem;color:var(--danger)">😞 Kém: ${r.danh_gia_kem}</span>
                        </div>
                    </div>`).join('')}
                </div>

                <!-- Góp ý chưa đọc -->
                <div class="card animate-in">
                    <div class="card-title mb-md">📮 Góp Ý Cần Phản Hồi ${unread.length > 0 ? `<span class="badge badge-danger">${unread.length}</span>` : ''}</div>
                    <div style="max-height:300px; overflow-y:auto">
                        ${unread.length === 0 ? '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Tất cả đã được đọc</div></div>' :
                        unread.slice(0, 5).map(f => `
                        <div class="feedback-item" style="margin-bottom:12px">
                            <div class="feedback-body">${f.noi_dung}</div>
                            ${f.hinh_anh ? `<img src="${f.hinh_anh}" style="max-width:150px;border-radius:6px;margin-top:6px">` : ''}
                            <div style="margin-top:8px">
                                <button class="btn btn-outline btn-sm" onclick="openReplyModal(${f.id})">💬 Phản hồi</button>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>
            </div>

            <!-- Thông báo hậu cần -->
            <div class="card animate-in">
                <div class="card-header mb-md">
                    <div class="card-title">📢 Bảng Tin Hậu Cần</div>
                    <button class="btn btn-primary btn-sm" onclick="openAnnouncementModal()">➕ Đăng thông báo</button>
                </div>
                <div class="stagger-in">
                    ${announcements.slice(0, 5).map(a => `
                    <div class="announcement ${a.ghim ? 'pinned' : ''}">
                        <div class="announcement-title">${a.loai === 'phan_hoi' ? '💬' : '📢'} ${a.tieu_de}</div>
                        <div class="announcement-body">${a.noi_dung}</div>
                        <div class="announcement-date">${formatDateTime(a.ngay_tao)}</div>
                    </div>`).join('')}
                </div>
            </div>`;

    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

function openReplyModal(feedbackId) {
    openModal('💬 Phản hồi góp ý', `
        <div class="form-group">
            <label class="form-label">Nội dung phản hồi</label>
            <textarea class="form-textarea" id="replyText" rows="4" placeholder="Nhập phản hồi..." style="min-height:100px"></textarea>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%" onclick="submitReply(${feedbackId})">📤 Gửi phản hồi</button>
    `);
}

async function submitReply(id) {
    const text = document.getElementById('replyText').value.trim();
    if (!text) { showToast('Vui lòng nhập nội dung!', 'error'); return; }
    try {
        await API.post(`/api/feedback/${id}/reply`, { phan_hoi: text });
        showToast('Phản hồi đã được gửi! ✅', 'success');
        closeModal();
        renderLogistics();
    } catch(e) { showToast('Phản hồi thất bại!', 'error'); }
}

function openAnnouncementModal() {
    openModal('📢 Đăng Thông Báo Mới', `
        <div class="form-group">
            <label class="form-label">Tiêu đề *</label>
            <input class="form-input" id="annTitle" placeholder="Tiêu đề thông báo">
        </div>
        <div class="form-group">
            <label class="form-label">Nội dung *</label>
            <textarea class="form-textarea" id="annBody" rows="4" placeholder="Nội dung..." style="min-height:100px"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Loại</label>
            <select class="form-select" id="annType">
                <option value="thong_bao">📢 Thông báo</option>
                <option value="phan_hoi">💬 Phản hồi</option>
                <option value="canh_bao">⚠️ Cảnh báo</option>
            </select>
        </div>
        <label class="form-checkbox" style="margin-bottom:16px">
            <input type="checkbox" id="annPin"> 📌 Ghim thông báo
        </label>
        <button class="btn btn-primary btn-lg" style="width:100%; margin-top:8px" onclick="submitAnnouncement()">📢 Đăng thông báo</button>
    `);
}

async function submitAnnouncement() {
    const title = document.getElementById('annTitle').value.trim();
    const body = document.getElementById('annBody').value.trim();
    if (!title || !body) { showToast('Vui lòng nhập đầy đủ!', 'error'); return; }
    try {
        await API.post('/api/logistics/announcements', {
            tieu_de: title, noi_dung: body,
            loai: document.getElementById('annType').value,
            ghim: document.getElementById('annPin').checked
        });
        showToast('Thông báo đã được đăng! 📢', 'success');
        closeModal();
        renderLogistics();
    } catch(e) { showToast('Đăng thông báo thất bại!', 'error'); }
}
