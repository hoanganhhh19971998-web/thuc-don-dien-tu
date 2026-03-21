/* ==================================
   PAGES - Trang chủ & Dinh dưỡng
   ================================== */

// === TRANG CHỦ ===
async function renderHome() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="page-header animate-in">
            <h2>🍜 Thực Đơn Hôm Nay</h2>
            <p>Bữa ăn chất lượng - Chiến sĩ khỏe mạnh</p>
            <div class="date-display" id="todayDate"></div>
        </div>
        <div class="loading"><div class="loading-spinner"></div></div>
    `;
    document.getElementById('todayDate').textContent = formatDate(todayStr());

    try {
        const [menuData, stats] = await Promise.all([
            API.get('/api/menu/today'),
            API.get('/api/logistics/dashboard')
        ]);

        // Stats bar
        const statsHTML = `
        <div class="stats-grid stagger-in mb-lg">
            <div class="stat-card stat-card-clickable" onclick="navigateTo('home')" title="Thực đơn hôm nay">
                <div class="stat-icon">🍽️</div>
                <div class="stat-value">${stats.so_bua_hom_nay || 0}</div>
                <div class="stat-label">Bữa ăn hôm nay</div>
                <div class="stat-change positive">👆 Xem thực đơn</div>
            </div>
            <div class="stat-card stat-card-clickable" onclick="navigateTo('rating')" title="Xem đánh giá món ăn">
                <div class="stat-icon">⭐</div>
                <div class="stat-value">${stats.danh_gia_trung_binh}</div>
                <div class="stat-label">Đánh giá món ăn</div>
                <div class="stat-change positive">★★★★☆ Nhấn xem</div>
            </div>
            <div class="stat-card stat-card-clickable" onclick="navigateTo('feedback')" title="Xem hòm thư góp ý">
                <div class="stat-icon">📮</div>
                <div class="stat-value">${stats.gop_y_chua_doc}</div>
                <div class="stat-label">Hòm thư góp ý</div>
                <div class="stat-change positive">👆 Nhấn để xem</div>
            </div>
            <div class="stat-card" title="Thực phẩm thừa tuần này">
                <div class="stat-icon">♻️</div>
                <div class="stat-value">${stats.thuc_pham_thua_tuan_kg || 0}</div>
                <div class="stat-label">TP thừa (kg/tuần)</div>
            </div>
        </div>`;

        const buas = ['sang', 'trua', 'toi'];
        const mealsHTML = `
        <div class="meals-grid stagger-in">
            ${buas.map(bua => {
                const menu = menuData[bua];
                if (!menu) return `
                    <div class="meal-card animate-in">
                        <div class="meal-card-header">
                            <span class="meal-icon">${bua === 'sang' ? '🌅' : bua === 'trua' ? '☀️' : '🌙'}</span>
                            <h3>Bữa ${bua === 'sang' ? 'Sáng' : bua === 'trua' ? 'Trưa' : 'Tối'}</h3>
                        </div>
                        <div class="meal-card-body">
                            <div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Chưa có thực đơn</div></div>
                        </div>
                    </div>`;
                const dishes = menu.mon_an || [];
                return `
                <div class="meal-card animate-in">
                    <div class="meal-card-header">
                        <span class="meal-icon">${bua === 'sang' ? '🌅' : bua === 'trua' ? '☀️' : '🌙'}</span>
                        <h3>Bữa ${bua === 'sang' ? 'Sáng' : bua === 'trua' ? 'Trưa' : 'Tối'}</h3>
                        <span class="meal-time">${bua === 'sang' ? '6:00 - 7:00' : bua === 'trua' ? '11:30 - 12:30' : '17:30 - 18:30'}</span>
                    </div>
                    <div class="meal-card-body">
                        ${dishes.map(d => `
                        <div class="dish-item">
                            <div class="dish-img">
                                ${d.hinh_anh ? `<img src="${d.hinh_anh}" alt="${d.ten}">` : dishEmoji(d.loai)}
                            </div>
                            <div class="dish-info">
                                <div class="dish-name">${d.ten}</div>
                                <div class="dish-type">${LOAI_MAP[d.loai] || d.loai}</div>
                            </div>
                            <div class="dish-calo">${d.calo} kcal</div>
                        </div>`).join('')}
                        <div class="meal-nutrition-bar">
                            <div class="nutrition-item">
                                <div class="value">${Math.round(menu.tong_calo)}</div>
                                <div class="label">Calo</div>
                            </div>
                            <div class="nutrition-item">
                                <div class="value">${Math.round(menu.tong_protein)}g</div>
                                <div class="label">Protein</div>
                            </div>
                            <div class="nutrition-item">
                                <div class="value">${Math.round(menu.tong_fat)}g</div>
                                <div class="label">Chất béo</div>
                            </div>
                            <div class="nutrition-item">
                                <div class="value">${Math.round(menu.tong_carbs)}g</div>
                                <div class="label">Tinh bột</div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>🍜 Thực Đơn Hôm Nay</h2>
                <p>Bữa ăn chất lượng - Chiến sĩ khỏe mạnh</p>
                <div class="date-display">${formatDate(todayStr())}</div>
            </div>
            ${statsHTML}
            ${mealsHTML}
        `;
    } catch (e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Không thể tải dữ liệu: ${e.message}</div></div>`;
    }
}

// === TRANG DINH DƯỠNG ===
async function renderNutrition() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="page-header animate-in">
            <h2>📊 Chỉ Số Dinh Dưỡng</h2>
            <p>Theo dõi calo và dưỡng chất theo ngày</p>
        </div>
        <div class="loading"><div class="loading-spinner"></div></div>
    `;

    try {
        const data = await API.get(`/api/nutrition/daily/${todayStr()}`);
        const t = data.tong;
        const calorieGoal = 2800;
        const pct = Math.min(100, Math.round((t.calo / calorieGoal) * 100));
        const pctColor = pct < 70 ? 'progress-red' : pct < 90 ? 'progress-yellow' : 'progress-green';

        const nutrItems = [
            { key: 'protein', label: 'Protein', unit: 'g', goal: 100, color: '#3b82f6', icon: '🥩' },
            { key: 'fat', label: 'Chất béo', unit: 'g', goal: 70, color: '#f59e0b', icon: '🧈' },
            { key: 'carbs', label: 'Tinh bột', unit: 'g', goal: 350, color: '#8b5cf6', icon: '🍚' },
            { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg', goal: 80, color: '#10b981', icon: '🍊' },
            { key: 'canxi', label: 'Canxi', unit: 'mg', goal: 800, color: '#06b6d4', icon: '🦴' },
            { key: 'sat', label: 'Sắt', unit: 'mg', goal: 15, color: '#ef4444', icon: '🔴' },
        ];

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>📊 Chỉ Số Dinh Dưỡng</h2>
                <p>Hôm nay: ${formatDate(todayStr())}</p>
            </div>

            <div class="card animate-in mb-lg">
                <div class="card-header">
                    <div class="card-title">🔥 Tổng Calo Hôm Nay</div>
                    <div style="font-size:0.85rem; color:var(--text-muted)">Mục tiêu: ${calorieGoal} kcal</div>
                </div>
                <div style="font-size: 3rem; font-weight: 900; color: var(--accent); margin: 12px 0;">
                    ${Math.round(t.calo)} <span style="font-size:1rem; color:var(--text-muted)">kcal</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill ${pctColor}" style="width: ${pct}%"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:8px;">
                    <span style="font-size:0.75rem; color:var(--text-muted)">0 kcal</span>
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:700">${pct}% mục tiêu</span>
                    <span style="font-size:0.75rem; color:var(--text-muted)">${calorieGoal} kcal</span>
                </div>
            </div>

            <div class="grid-2 stagger-in">
                ${nutrItems.map(item => {
                    const val = Math.round(t[item.key] || 0);
                    const p = Math.min(100, Math.round((val / item.goal) * 100));
                    return `
                    <div class="card">
                        <div class="flex-between mb-md">
                            <div class="card-title">${item.icon} ${item.label}</div>
                            <div style="font-size:1.3rem; font-weight:800; color:${item.color}">${val}<span style="font-size:0.7rem; color:var(--text-muted); font-weight:400"> ${item.unit}</span></div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar-fill" style="width:${p}%; background:linear-gradient(90deg, ${item.color}99, ${item.color})"></div>
                        </div>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; text-align:right">Mục tiêu: ${item.goal} ${item.unit} (${p}%)</div>
                    </div>`;
                }).join('')}
            </div>`;
    } catch (e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}

// === THỰC ĐƠN TUẦN ===
async function renderWeekly() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="page-header animate-in"><h2>📅 Thực Đơn Tuần</h2></div><div class="loading"><div class="loading-spinner"></div></div>`;
    try {
        const data = await API.get('/api/menu/week');
        const dates = Object.keys(data).sort();
        const buas = ['sang', 'trua', 'toi'];
        const buaLabels = { sang: '🌅 Sáng', trua: '☀️ Trưa', toi: '🌙 Tối' };

        content.innerHTML = `
            <div class="page-header animate-in">
                <h2>📅 Thực Đơn Cả Tuần</h2>
                <p>Kế hoạch bữa ăn 7 ngày</p>
            </div>
            <div class="stagger-in">
            ${dates.map(d => `
                <div class="card mb-md ${d === todayStr() ? 'animate-pulse' : ''}">
                    <div class="card-header">
                        <div class="card-title">
                            ${d === todayStr() ? '⭐ ' : ''}${formatDate(d)}
                            ${d === todayStr() ? '<span class="badge badge-success" style="margin-left:8px">Hôm nay</span>' : ''}
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px">
                    ${buas.map(bua => {
                        const menu = data[d] && data[d][bua];
                        if (!menu) return `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px">${buaLabels[bua]}: Chưa có</div>`;
                        const dishes = menu.mon_an || [];
                        return `
                        <div style="padding:12px; background:var(--bg-secondary); border-radius:var(--radius-sm);">
                            <div style="font-weight:700; font-size:0.8rem; color:var(--accent); margin-bottom:8px">${buaLabels[bua]}</div>
                            ${dishes.map(d => `<div style="font-size:0.8rem; color:var(--text-secondary); padding:2px 0">${dishEmoji(d.loai)} ${d.ten}</div>`).join('')}
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px">🔥 ${Math.round(menu.tong_calo)} kcal</div>
                        </div>`;
                    }).join('')}
                    </div>
                </div>`).join('')}
            </div>`;
    } catch(e) {
        content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${e.message}</div></div>`;
    }
}
