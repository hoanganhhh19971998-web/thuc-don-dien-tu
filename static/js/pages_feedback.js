/* ==================================
   PAGES - Đánh giá & Hòm thư góp ý
   ================================== */

// === TRANG ĐÁNH GIÁ ===
async function renderRating() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>⭐ Đánh Giá Bữa Ăn</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [menuData, stats, ratings] = await Promise.all([
            API.get('/api/menu/today'),
            API.get('/api/ratings/stats'),
            API.get('/api/ratings')
        ]);
        const menus = Object.values(menuData);
        const menuOptions = menus.map(m => `<option value="${m.id}">Bữa ${m.bua === 'sang' ? 'Sáng' : m.bua === 'trua' ? 'Trưa' : 'Tối'} - ${formatDate(m.ngay)}</option>`).join('');

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>⭐ Đánh Giá Bữa Ăn</h2>
                <p>Chia sẻ cảm nhận để bếp ăn ngày càng tốt hơn</p>
            </div>

            <div class="stats-grid stagger-in mb-lg">
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-value">${stats.trung_binh}</div>
                    <div class="stat-label">Điểm trung bình</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-value">${stats.tong_danh_gia}</div>
                    <div class="stat-label">Tổng lượt đánh giá</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">😊</div>
                    <div class="stat-value">${stats.ty_le_hai_long}%</div>
                    <div class="stat-label">Tỷ lệ hài lòng</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">😞</div>
                    <div class="stat-value">${stats.chua_hai_long}</div>
                    <div class="stat-label">Chưa hài lòng</div>
                </div>
            </div>

            <div class="grid-2">
                <!-- Form đánh giá -->
                <div class="card animate-in">
                    <div class="card-title mb-md">📝 Gửi Đánh Giá</div>
                    <form id="ratingForm">
                        <div class="form-group">
                            <label class="form-label">Chọn bữa ăn</label>
                            <select class="form-select" name="thuc_don_id" required>
                                <option value="">-- Chọn bữa --</option>
                                ${menuOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Đánh giá của bạn</label>
                            <div class="star-rating" id="starRating">
                                <input type="radio" name="so_sao" value="5" id="s5"><label for="s5">★</label>
                                <input type="radio" name="so_sao" value="4" id="s4"><label for="s4">★</label>
                                <input type="radio" name="so_sao" value="3" id="s3"><label for="s3">★</label>
                                <input type="radio" name="so_sao" value="2" id="s2"><label for="s2">★</label>
                                <input type="radio" name="so_sao" value="1" id="s1"><label for="s1">★</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Bình luận (tùy chọn)</label>
                            <textarea class="form-textarea" name="binh_luan" placeholder="Chia sẻ cảm nhận của bạn..."></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Đính kèm ảnh (tùy chọn)</label>
                            <div class="file-upload">
                                <div class="upload-icon">📸</div>
                                <div class="upload-text">Chụp ảnh món ăn</div>
                                <div class="upload-hint">JPG, PNG - tối đa 10MB</div>
                                <input type="file" id="ratingImg" accept="image/*" capture="environment">
                            </div>
                            <div class="file-preview" id="ratingImgPreview"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-checkbox">
                                <input type="checkbox" name="an_danh"> Đánh giá ẩn danh
                            </label>
                        </div>
                        <button type="submit" class="btn btn-accent btn-lg" style="width:100%">⭐ Gửi Đánh Giá</button>
                    </form>
                </div>

                <!-- Danh sách đánh giá gần đây -->
                <div class="card animate-in">
                    <div class="card-title mb-md">💬 Đánh Giá Gần Đây</div>
                    <div class="feedback-list" style="max-height:500px; overflow-y:auto">
                        ${ratings.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Chưa có đánh giá</div></div>' :
                        ratings.slice(0, 20).map(r => `
                        <div class="feedback-item">
                            <div class="feedback-header">
                                <div class="feedback-author">
                                    👤 ${r.chien_si_ten}
                                    ${renderStars(r.so_sao)}
                                </div>
                                <div class="feedback-date">${formatDateTime(r.ngay_tao)}</div>
                            </div>
                            ${r.binh_luan ? `<div class="feedback-body">${r.binh_luan}</div>` : ''}
                            ${r.hinh_anh ? `<img src="${r.hinh_anh}" class="feedback-image">` : ''}
                        </div>`).join('')}
                    </div>
                </div>
            </div>`;

        setupImagePreview('ratingImg', 'ratingImgPreview');

        document.getElementById('ratingForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const fd = new FormData(this);
            const sao = fd.get('so_sao');
            if (!sao) { showToast('Vui lòng chọn số sao!', 'error'); return; }
            if (!fd.get('thuc_don_id')) { showToast('Vui lòng chọn bữa ăn!', 'error'); return; }
            fd.set('an_danh', this.querySelector('[name=an_danh]').checked ? 'true' : 'false');
            try {
                await API.postForm('/api/ratings', fd);
                showToast('Cảm ơn bạn đã đánh giá! ⭐', 'success');
                renderRating();
            } catch(err) {
                showToast('Gửi đánh giá thất bại!', 'error');
            }
        });
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

// === HÒM THƯ GÓP Ý ===
async function renderFeedback() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>📮 Hòm Thư Góp Ý</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [feedbacks, announcements] = await Promise.all([
            API.get('/api/feedback'),
            API.get('/api/logistics/announcements')
        ]);

        const unread = feedbacks.filter(f => !f.da_doc).length;
        const badge = document.getElementById('feedbackBadge');
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline' : 'none'; }

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>📮 Hòm Thư Góp Ý Số</h2>
                <p>Phản ánh dễ dàng - Hậu cần lắng nghe</p>
            </div>

            <div class="tabs" id="feedbackTabs">
                <div class="tab active" onclick="switchFeedbackTab('gui', this)">📝 Gửi góp ý</div>
                <div class="tab" onclick="switchFeedbackTab('list', this)">📋 Danh sách góp ý ${unread > 0 ? `<span class="nav-badge">${unread}</span>` : ''}</div>
                <div class="tab" onclick="switchFeedbackTab('announcement', this)">📢 Thông báo hậu cần</div>
            </div>

            <div id="feedbackTabGui">
                <div class="card animate-in">
                    <div class="card-title mb-md">💬 Gửi Góp Ý Mới</div>
                    <form id="feedbackForm">
                        <div class="form-group">
                            <label class="form-label">Nội dung góp ý *</label>
                            <textarea class="form-textarea" name="noi_dung" rows="4" placeholder="Ví dụ: Canh hôm nay hơi mặn, mong bếp điều chỉnh..." required style="min-height:120px"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Đính kèm ảnh (tùy chọn)</label>
                            <div class="file-upload">
                                <div class="upload-icon">📷</div>
                                <div class="upload-text">Chọn ảnh hoặc chụp từ camera</div>
                                <div class="upload-hint">JPG, PNG - tối đa 16MB - hỗ trợ điện thoại và máy tính</div>
                                <input type="file" id="feedbackImg" accept="image/*">
                            </div>
                            <div class="file-preview" id="feedbackImgPreview"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-checkbox">
                                <input type="checkbox" name="an_danh" checked> ✅ Gửi ẩn danh (bảo vệ danh tính)
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" style="width:100%">📮 Gửi Góp Ý</button>
                    </form>
                </div>
            </div>

            <div id="feedbackTabList" style="display:none">
                <div class="feedback-list stagger-in">
                    ${feedbacks.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Chưa có góp ý nào</div></div>' :
                    feedbacks.map(f => `
                    <div class="feedback-item">
                        <div class="feedback-header">
                            <div class="feedback-author">
                                ${f.an_danh ? '🎭 Ẩn danh' : `👤 ${f.chien_si_ten}`}
                                ${!f.da_doc ? '<span class="badge badge-warning">Chưa đọc</span>' : '<span class="badge badge-success">Đã đọc</span>'}
                            </div>
                            <div class="feedback-date">${formatDateTime(f.ngay_tao)}</div>
                        </div>
                        <div class="feedback-body">${f.noi_dung}</div>
                        ${f.hinh_anh ? `<img src="${f.hinh_anh}" class="feedback-image" style="max-width:300px; margin-top:8px; border-radius:8px; cursor:pointer" onclick="window.open('${f.hinh_anh}')">` : ''}
                        ${f.phan_hoi ? `
                        <div class="feedback-reply">
                            <div class="reply-label">🎖️ Phản hồi từ Trợ lý Hậu cần</div>
                            <div style="font-size:0.9rem; color:var(--text-secondary)">${f.phan_hoi}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px">${formatDateTime(f.ngay_phan_hoi)}</div>
                        </div>` : ''}
                    </div>`).join('')}
                </div>
            </div>

            <div id="feedbackTabAnnouncement" style="display:none">
                <div class="stagger-in">
                    ${announcements.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Chưa có thông báo</div></div>' :
                    announcements.map(a => `
                    <div class="announcement ${a.ghim ? 'pinned' : ''}">
                        <div class="announcement-title">
                            ${a.loai === 'canh_bao' ? '⚠️' : a.loai === 'phan_hoi' ? '💬' : '📢'} ${a.tieu_de}
                        </div>
                        <div class="announcement-body">${a.noi_dung}</div>
                        <div class="announcement-date">${formatDateTime(a.ngay_tao)}</div>
                    </div>`).join('')}
                </div>
            </div>`;

        setupImagePreview('feedbackImg', 'feedbackImgPreview');

        document.getElementById('feedbackForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const fd = new FormData(this);
            if (!fd.get('noi_dung').trim()) { showToast('Vui lòng nhập nội dung!', 'error'); return; }
            fd.set('an_danh', this.querySelector('[name=an_danh]').checked ? 'true' : 'false');
            try {
                await API.postForm('/api/feedback', fd);
                showToast('Góp ý đã được gửi thành công! 📮', 'success');
                this.reset();
                document.getElementById('feedbackImgPreview').innerHTML = '';
            } catch(err) {
                showToast('Gửi góp ý thất bại!', 'error');
            }
        });
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

function switchFeedbackTab(tab, el) {
    document.querySelectorAll('#feedbackTabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['gui', 'list', 'announcement'].forEach(t => {
        const el2 = document.getElementById(`feedbackTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (el2) el2.style.display = t === tab ? 'block' : 'none';
    });
}
