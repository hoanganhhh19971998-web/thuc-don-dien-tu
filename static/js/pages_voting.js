/* ==========================================
   PAGES - Bình chọn, Thi đua, Hương vị
   ========================================== */

// === BÌNH CHỌN CUỐI TUẦN ===
async function renderVoting() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>🗳️ Bình Chọn Cuối Tuần</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [candidates, results] = await Promise.all([
            API.get('/api/voting/candidates'),
            API.get('/api/voting/current')
        ]);

        const totalVotes = results.tong_phieu || 1;
        const top3 = results.ket_qua.slice(0, 5);
        // Map results to easy lookup
        const voteMap = {};
        results.ket_qua.forEach(r => { voteMap[r.mon_an_id] = r.so_phieu; });

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>🗳️ Bình Chọn Món Cuối Tuần</h2>
                <p>Tuần ${results.tuan} • ${results.tong_phieu} lượt bình chọn</p>
            </div>

            ${top3.length > 0 ? `
            <div class="card animate-in mb-lg">
                <div class="card-title mb-md">🏆 Top Món Được Yêu Thích</div>
                ${top3.map((r, i) => `
                <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-light)">
                    <div style="font-size:1.5rem; width:36px; text-align:center">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</div>
                    <div style="flex:1">
                        <div style="font-weight:700">${r.ten}</div>
                        <div class="progress-bar" style="margin-top:4px">
                            <div class="progress-bar-fill progress-yellow" style="width:${Math.round(r.so_phieu/totalVotes*100)}%"></div>
                        </div>
                    </div>
                    <div style="font-size:1.3rem; font-weight:900; color:var(--accent)">${r.so_phieu}</div>
                </div>`).join('')}
            </div>` : ''}

            <div class="card animate-in">
                <div class="card-header mb-md">
                    <div class="card-title">🍽️ Danh Sách Bình Chọn</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Mỗi chiến sĩ được chọn 1 món/tuần</div>
                </div>
                <div class="form-group mb-lg">
                    <label class="form-label">Chiến sĩ (ID để demo)</label>
                    <input type="number" class="form-input" id="voterIdInput" placeholder="Nhập ID chiến sĩ (1-100)" min="1" max="200">
                </div>
                <div class="voting-grid stagger-in" id="votingGrid">
                    ${candidates.map(c => `
                    <div class="vote-card" id="vote-${c.id}" onclick="castVote(${c.id}, '${c.ten}')">
                        <div class="vote-emoji">${dishEmoji(c.loai)}</div>
                        <div class="vote-name">${c.ten}</div>
                        <div class="vote-region">${VUNG_MAP[c.vung_mien] || c.vung_mien}</div>
                        <div class="vote-count">${voteMap[c.id] || 0}</div>
                        <div class="vote-bar">
                            <div class="vote-bar-fill" style="width:${voteMap[c.id] ? Math.round(voteMap[c.id]/totalVotes*100) : 0}%"></div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

async function castVote(monAnId, ten) {
    const idInput = document.getElementById('voterIdInput');
    const chiSi = parseInt(idInput?.value);
    if (!chiSi || chiSi < 1) { showToast('Vui lòng nhập ID chiến sĩ!', 'error'); return; }
    try {
        await API.post('/api/voting', { chien_si_id: chiSi, mon_an_id: monAnId });
        showToast(`Đã bình chọn: ${ten} ✅`, 'success');
        renderVoting();
    } catch(e) {
        showToast('Bình chọn thất bại!', 'error');
    }
}

// === HƯƠNG VỊ QUÊ NHÀ ===
async function renderHometown() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>🏡 Hương Vị Quê Nhà</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const data = await API.get('/api/hometown-flavor');
        const hv = data.huong_vi;
        const bdSoldiers = data.chien_si_sinh_nhat;
        const phanBo = data.phan_bo_vung_mien;

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>🏡 Hương Vị Quê Nhà</h2>
                <p>Mỗi tháng một món đặc sản - gắn kết tình đồng đội</p>
            </div>

            ${hv ? `
            <div class="hometown-card animate-in mb-lg">
                <div class="hometown-emoji">${dishEmoji(hv.mon_an?.loai)}</div>
                <div class="hometown-title">${hv.mon_an?.ten || 'Món đặc sản tháng này'}</div>
                <div style="margin-bottom:12px;">
                    <span class="badge badge-warning">${VUNG_MAP[hv.mon_an?.vung_mien] || ''}</span>
                    &nbsp;
                    <span class="badge badge-info">Tháng ${hv.thang}/${hv.nam}</span>
                </div>
                <div class="hometown-desc">${hv.mo_ta || ''}</div>
            </div>` : `
            <div class="card animate-in mb-lg" style="text-align:center; padding:40px">
                <div style="font-size:3rem; margin-bottom:12px">🌾</div>
                <div style="color:var(--text-muted)">Chưa có món đặc sản cho tháng này</div>
            </div>`}

            <div class="grid-2 animate-in mb-lg">
                <div class="card">
                    <div class="card-title mb-md">🎂 ${data.so_sinh_nhat} Chiến Sĩ Sinh Nhật Tháng Này</div>
                    <div class="birthday-grid">
                        ${bdSoldiers.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎂</div><div class="empty-text">Không có sinh nhật tháng này</div></div>' :
                        bdSoldiers.slice(0, 12).map(cs => `
                        <div class="birthday-card">
                            <div class="birthday-emoji">🎂</div>
                            <div class="birthday-name">${cs.ho_ten}</div>
                            <div class="birthday-region">${cs.que_quan || ''}</div>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-title mb-md">🗺️ Phân Bố Vùng Miền</div>
                    ${Object.entries(phanBo).map(([vung, count]) => `
                    <div style="margin-bottom:12px">
                        <div class="flex-between mb-md" style="margin-bottom:4px">
                            <span style="font-size:0.85rem">${VUNG_MAP[vung] || vung}</span>
                            <span style="font-weight:700; color:var(--accent)">${count}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar-fill progress-yellow" style="width:${Math.round(count/data.so_sinh_nhat*100)}%"></div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

// === BẢNG THI ĐUA ===
async function renderCompetition() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>🏆 Bảng Thi Đua</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const [ranking, daily] = await Promise.all([
            API.get('/api/competition/ranking'),
            API.get('/api/competition/daily')
        ]);

        const rankIcons = ['🥇','🥈','🥉'];

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>🏆 Bảng Thi Đua Nhà Ăn Điểm 10</h2>
                <p>Xếp hạng các đơn vị - đúng giờ, vệ sinh, tiết kiệm</p>
            </div>

            <div class="card animate-in mb-lg">
                <div class="card-title mb-md">📊 Tiêu Chí Chấm Điểm</div>
                <div class="grid-3">
                    <div style="text-align:center; padding:16px">
                        <div style="font-size:2rem; margin-bottom:8px">⏰</div>
                        <div style="font-weight:700">Đúng giờ</div>
                        <div style="font-size:0.75rem; color:var(--text-muted)">Ra nhà ăn đúng giờ quy định</div>
                    </div>
                    <div style="text-align:center; padding:16px">
                        <div style="font-size:2rem; margin-bottom:8px">🧹</div>
                        <div style="font-weight:700">Vệ sinh</div>
                        <div style="font-size:0.75rem; color:var(--text-muted)">Giữ gìn khay bát, bàn ăn sạch sẽ</div>
                    </div>
                    <div style="text-align:center; padding:16px">
                        <div style="font-size:2rem; margin-bottom:8px">🌾</div>
                        <div style="font-weight:700">Tiết kiệm</div>
                        <div style="font-size:0.75rem; color:var(--text-muted)">Không bỏ phí thức ăn</div>
                    </div>
                </div>
            </div>

            <div class="leaderboard stagger-in mb-lg">
                ${ranking.length === 0 ? '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Chưa có dữ liệu</div></div>' :
                ranking.map(r => `
                <div class="leaderboard-item top-${r.hang <= 3 ? r.hang : ''}">
                    <div class="rank-badge rank-${r.hang <= 3 ? r.hang : 'other'}">${r.hang <= 3 ? rankIcons[r.hang-1] : r.hang}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${r.ten_don_vi}</div>
                        <div class="leaderboard-scores">
                            <span>⏰ ${r.diem_dung_gio}</span>
                            <span>🧹 ${r.diem_ve_sinh}</span>
                            <span>🌾 ${r.diem_tiet_kiem}</span>
                            <span style="color:var(--text-muted)">${r.so_ngay} ngày</span>
                        </div>
                    </div>
                    <div class="leaderboard-total">${r.tong_diem}</div>
                </div>`).join('')}
            </div>

            <div class="card animate-in">
                <div class="card-title mb-md">➕ Nhập Điểm Thi Đua Mới</div>
                <form id="competitionForm">
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Đơn vị ID</label>
                            <input class="form-input" type="number" name="don_vi_id" placeholder="ID đơn vị" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ngày</label>
                            <input class="form-input" type="date" name="ngay" value="${todayStr()}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Điểm đúng giờ (0-10)</label>
                            <input class="form-input" type="number" name="diem_dung_gio" min="0" max="10" step="0.5" value="8">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Điểm vệ sinh (0-10)</label>
                            <input class="form-input" type="number" name="diem_ve_sinh" min="0" max="10" step="0.5" value="8">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Điểm tiết kiệm (0-10)</label>
                            <input class="form-input" type="number" name="diem_tiet_kiem" min="0" max="10" step="0.5" value="8">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ghi chú</label>
                            <input class="form-input" type="text" name="ghi_chu" placeholder="Ghi chú (tùy chọn)">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">➕ Nhập Điểm</button>
                </form>
            </div>`;

        document.getElementById('competitionForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            const data = Object.fromEntries(fd.entries());
            data.don_vi_id = parseInt(data.don_vi_id);
            data.diem_dung_gio = parseFloat(data.diem_dung_gio);
            data.diem_ve_sinh = parseFloat(data.diem_ve_sinh);
            data.diem_tiet_kiem = parseFloat(data.diem_tiet_kiem);
            try {
                await API.post('/api/competition', data);
                showToast('Đã nhập điểm thi đua! 🏆', 'success');
                renderCompetition();
            } catch(err) {
                showToast('Nhập điểm thất bại!', 'error');
            }
        });
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}
