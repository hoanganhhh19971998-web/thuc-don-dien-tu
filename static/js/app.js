/* ============================
   SPA ROUTER - app.js
   ============================ */

const PAGES = {
    home:        { render: renderHome,        title: '🍜 Thực đơn hôm nay' },
    nutrition:   { render: renderNutrition,   title: '📊 Dinh dưỡng' },
    weekly:      { render: renderWeekly,      title: '📅 Thực đơn tuần' },
    rating:      { render: renderRating,      title: '⭐ Đánh giá bữa ăn' },
    feedback:    { render: renderFeedback,    title: '📮 Hòm thư góp ý' },
    voting:      { render: renderVoting,      title: '🗳️ Bình chọn cuối tuần' },
    hometown:    { render: renderHometown,    title: '🏡 Hương vị quê nhà' },
    competition: { render: renderCompetition, title: '🏆 Bảng thi đua' },
    personnel:   { render: renderPersonnel,   title: '👥 Quân số & Cắt cơm' },
    logistics:   { render: renderLogistics,   title: '📋 Dashboard hậu cần' },
    waste:       { render: renderWaste,       title: '♻️ Thực phẩm thừa' },
};

let currentPage = 'home';
let pageHistory = [];

async function navigateTo(page, addToHistory = true) {
    if (!PAGES[page]) return;

    // Track history for back button
    if (addToHistory && currentPage !== page) {
        pageHistory.push(currentPage);
        if (pageHistory.length > 20) pageHistory.shift();
    }

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('active');
    document.body.classList.remove('sidebar-open');

    // Update title
    document.title = `${PAGES[page].title} | Thực Đơn Điện Tử Quân Đội`;
    currentPage = page;

    // Update mobile top bar
    const mobileTitle = document.getElementById('mobilePageTitle');
    const backBtn = document.getElementById('mobileBackBtn');
    if (mobileTitle) mobileTitle.textContent = PAGES[page].title;
    if (backBtn) {
        backBtn.classList.toggle('hidden', page === 'home');
    }

    // Show loading
    document.getElementById('mainContent').innerHTML = `
        <div class="loading" style="min-height:60vh">
            <div class="loading-spinner"></div>
        </div>`;

    // Render page
    try {
        await PAGES[page].render();
    } catch (e) {
        document.getElementById('mainContent').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-text">Lỗi tải trang: ${e.message}</div>
            </div>`;
        console.error(e);
    }
}

// Back button
function goBack() {
    if (pageHistory.length > 0) {
        const prevPage = pageHistory.pop();
        navigateTo(prevPage, false);
    } else {
        navigateTo('home', false);
    }
}

// ========== AUTH GATE ==========
let authMode = 'login';

function switchAuthTab(mode) {
    authMode = mode;
    document.getElementById('loginTabBtn').classList.toggle('active', mode === 'login');
    document.getElementById('registerTabBtn').classList.toggle('active', mode === 'register');
    document.getElementById('loginSection').classList.toggle('active', mode === 'login');
    document.getElementById('registerSection').classList.toggle('active', mode === 'register');
    const errEl = document.getElementById('authError');
    if (errEl) errEl.style.display = 'none';
}

// Password toggle
function mTogglePw(id, btn) {
    const inp = document.getElementById(id);
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
    else { inp.type = 'password'; btn.textContent = '👁️'; }
}

// Password strength
function mCheckPw(pw) {
    const el = document.getElementById('mPwStr');
    const fill = document.getElementById('mPwFill');
    const text = document.getElementById('mPwTxt');
    if (!pw) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    fill.className = 'mpw-fill';
    if (score <= 1) { fill.classList.add('mpw-1'); text.textContent = '⚠️ Yếu'; text.style.color = '#ef4444'; }
    else if (score <= 2) { fill.classList.add('mpw-2'); text.textContent = '⚡ Trung bình'; text.style.color = '#f59e0b'; }
    else if (score <= 3) { fill.classList.add('mpw-3'); text.textContent = '💪 Tốt'; text.style.color = '#3b82f6'; }
    else { fill.classList.add('mpw-4'); text.textContent = '🛡️ Rất mạnh'; text.style.color = '#10b981'; }
}

async function handleAuthSubmit() {
    const errEl = document.getElementById('authError');

    if (authMode === 'register') {
        const hoTen = document.getElementById('inputHoTen').value.trim();
        const un = document.getElementById('inputUsernameReg').value.trim();
        const pw = document.getElementById('inputPasswordReg').value;
        const pwConfirm = document.getElementById('inputPasswordConfirm').value;
        if (!hoTen || !un || !pw) {
            errEl.textContent = 'Vui lòng điền đầy đủ thông tin';
            errEl.style.display = 'block'; return;
        }
        if (un.length < 4) { errEl.textContent = 'Tên đăng nhập phải có ít nhất 4 ký tự'; errEl.style.display = 'block'; return; }
        if (pw.length < 6) { errEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự'; errEl.style.display = 'block'; return; }
        if (pw !== pwConfirm) { errEl.textContent = 'Mật khẩu xác nhận không khớp'; errEl.style.display = 'block'; return; }
        try {
            const user = await API.post('/api/auth/register', { ten_dang_nhap: un, mat_khau: pw, ho_ten: hoTen });
            // Đăng xuất session vừa tạo khi đăng ký, yêu cầu đăng nhập lại
            try { await API.post('/api/auth/logout'); } catch(_) {}
            // Chuyển về tab đăng nhập
            switchAuthTab('login');
            // Điền sẵn tên đăng nhập
            document.getElementById('inputUsername').value = un;
            document.getElementById('inputPassword').value = '';
            document.getElementById('inputPassword').focus();
            // Xóa form đăng ký
            document.getElementById('inputHoTen').value = '';
            document.getElementById('inputUsernameReg').value = '';
            document.getElementById('inputPasswordReg').value = '';
            document.getElementById('inputPasswordConfirm').value = '';
            const pwStr = document.getElementById('mPwStr');
            if (pwStr) pwStr.style.display = 'none';
            showToast(`Đăng ký thành công! Vui lòng đăng nhập 🎉`, 'success');
        } catch (e) {
            errEl.textContent = e.message || 'Tên đăng nhập đã tồn tại hoặc lỗi';
            errEl.style.display = 'block';
        }
    } else {
        const un = document.getElementById('inputUsername').value.trim();
        const pw = document.getElementById('inputPassword').value;
        if (!un || !pw) { errEl.textContent = 'Vui lòng điền đầy đủ thông tin'; errEl.style.display = 'block'; return; }
        try {
            const user = await API.post('/api/auth/login', { ten_dang_nhap: un, mat_khau: pw });
            currentUser = user;
            enterApp(user);
            showToast(`Chào mừng, ${user.ho_ten}! 👋`, 'success');
        } catch (e) {
            errEl.textContent = 'Sai tên đăng nhập hoặc mật khẩu';
            errEl.style.display = 'block';
        }
    }
}

function enterApp(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'block';
    updateUserUI();
    navigateTo('home');

    // Check license status
    checkLicenseStatus(user);

    // Load feedback badge
    API.get('/api/feedback').then(data => {
        const unread = data.filter(f => !f.da_doc).length;
        const badge = document.getElementById('feedbackBadge');
        if (badge && unread > 0) {
            badge.textContent = unread;
            badge.style.display = 'inline';
        }
    }).catch(() => {});
}

async function checkLicenseStatus(user) {
    // Admin bypasses license
    if (user && user.vai_tro === 'admin') {
        updateLicenseBadge({ active: true, goi: 'admin', goi_label: 'Quản trị viên', con_lai_ngay: 9999 });
        return;
    }
    try {
        const license = user?.license || await API.get('/api/license/status');
        updateLicenseBadge(license);
        if (!license.active) {
            showLicensePopup();
        } else if (license.canh_bao) {
            showToast(`⚠️ License còn ${license.con_lai_ngay} ngày - Hãy gia hạn!`, 'warning');
        }
    } catch(e) {}
}

function updateLicenseBadge(license) {
    const el = document.getElementById('licenseBadge');
    if (!el) return;
    if (!license || !license.active) {
        el.innerHTML = '<span style="color:#ef4444;font-size:0.7rem">❌ Hết hạn</span>';
        el.style.cursor = 'pointer';
        el.onclick = showLicensePopup;
    } else if (license.goi === 'admin') {
        el.innerHTML = '<span style="color:#10b981;font-size:0.7rem">🌟 Admin</span>';
    } else {
        const color = license.canh_bao ? '#f59e0b' : '#10b981';
        el.innerHTML = `<span style="color:${color};font-size:0.7rem">🔑 ${license.con_lai_ngay} ngày</span>`;
    }
}

function showLicensePopup() {
    // Create overlay
    let overlay = document.getElementById('licenseOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'licenseOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s';
    overlay.innerHTML = `
    <div style="background:var(--bg-card,#0f172a);border:1px solid rgba(255,255,255,0.1);border-radius:20px;max-width:420px;width:100%;padding:32px;text-align:center;animation:slideUp 0.4s">
        <div style="font-size:3rem;margin-bottom:12px">🔒</div>
        <h2 style="color:#f1f5f9;margin:0 0 8px;font-size:1.3rem">License Hết Hạn</h2>
        <p style="color:#94a3b8;font-size:0.85rem;margin:0 0 20px">Vui lòng nhập mã key để tiếp tục sử dụng, hoặc mua key mới.</p>
        <div style="margin-bottom:16px">
            <input type="text" id="licenseKeyInput" placeholder="Nhập mã key: HA-XXXX-XXXX-XXXX" 
                style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:12px;color:#f1f5f9;font-size:0.95rem;text-align:center;letter-spacing:2px;font-family:monospace;box-sizing:border-box"
            >
            <div id="licenseKeyError" style="color:#ef4444;font-size:0.8rem;margin-top:6px;display:none"></div>
        </div>
        <button onclick="activateLicenseKey()" style="width:100%;padding:14px;background:linear-gradient(135deg,#3b82f6,#6366f1);border:none;border-radius:12px;color:white;font-size:0.95rem;font-weight:700;cursor:pointer;margin-bottom:10px">🔑 Kích Hoạt Key</button>
        <a href="https://app-store-pearl.vercel.app" target="_blank" style="display:block;width:100%;padding:14px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:12px;color:white;font-size:0.95rem;font-weight:700;text-decoration:none;cursor:pointer;box-sizing:border-box;margin-bottom:16px">🛒 Mua Key Tại Đây</a>
        <div style="display:flex;flex-direction:column;gap:6px;text-align:left;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:16px">
            <div style="font-size:0.75rem;color:#94a3b8;font-weight:600;margin-bottom:4px">💰 Bảng Giá</div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem"><span style="color:#94a3b8">1 tháng</span><span style="color:#60a5fa;font-weight:700">99.000đ</span></div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem"><span style="color:#94a3b8">3 tháng</span><span style="color:#10b981;font-weight:700">199.000đ</span></div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem"><span style="color:#94a3b8">6 tháng</span><span style="color:#f59e0b;font-weight:700">299.000đ</span></div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem"><span style="color:#94a3b8">1 năm</span><span style="color:#ef4444;font-weight:700">399.000đ</span></div>
        </div>
        <div style="font-size:0.7rem;color:#64748b">Liên hệ Zalo: 0336 309 979 để được hỗ trợ</div>
    </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('licenseKeyInput')?.focus(), 300);
}

async function activateLicenseKey() {
    const input = document.getElementById('licenseKeyInput');
    const errEl = document.getElementById('licenseKeyError');
    const keyCode = (input?.value || '').trim();
    if (!keyCode) { errEl.textContent = 'Vui lòng nhập mã key'; errEl.style.display = 'block'; return; }
    try {
        const result = await API.post('/api/license/activate', { key_code: keyCode });
        // Remove overlay
        const overlay = document.getElementById('licenseOverlay');
        if (overlay) overlay.remove();
        showToast(`✅ Kích hoạt thành công! Gói: ${result.goi_label}, còn ${result.con_lai_ngay} ngày`, 'success');
        updateLicenseBadge({ active: true, goi: result.goi, goi_label: result.goi_label, con_lai_ngay: result.con_lai_ngay });
    } catch(e) {
        errEl.textContent = e.message || 'Mã key không hợp lệ hoặc đã sử dụng';
        errEl.style.display = 'block';
    }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in (session)
    try {
        const user = await API.get('/api/auth/me');
        if (user && user.id) {
            currentUser = user;
            enterApp(user);
            return;
        }
    } catch(e) {}

    // Show login screen
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appRoot').style.display = 'none';

    setTimeout(() => {
        document.getElementById('inputUsername')?.focus();
    }, 100);
});

// ========== CHAT BOX ==========
let chatboxOpen = false;

function toggleChatBox() {
    chatboxOpen = !chatboxOpen;
    const win = document.getElementById('chatboxWindow');
    const badge = document.getElementById('chatboxBadge');

    if (chatboxOpen) {
        win.classList.add('open');
        if (badge) badge.style.display = 'none';
        // Focus input
        setTimeout(() => document.getElementById('chatboxInput')?.focus(), 300);
    } else {
        win.classList.remove('open');
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatboxInput');
    const msg = input.value.trim();
    if (!msg) return;

    const typeSelect = document.getElementById('chatboxType');
    const msgType = typeSelect.value;
    const typeLabels = {
        support: { label: '💬 Hỗ trợ', class: 'support' },
        bug: { label: '🐛 Báo lỗi', class: 'bug' },
        suggest: { label: '💡 Góp ý', class: 'suggest' }
    };
    const typeInfo = typeLabels[msgType] || typeLabels.support;

    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Add user message
    const messagesEl = document.getElementById('chatboxMessages');
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chat-msg user';
    userMsgEl.innerHTML = `
        <span class="chat-type-badge ${typeInfo.class}">${typeInfo.label}</span>
        <div class="chat-bubble">${escapeHTML(msg)}</div>
        <div class="chat-time">${timeStr}</div>
    `;
    messagesEl.appendChild(userMsgEl);

    input.value = '';
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Auto-reply after short delay
    setTimeout(() => {
        const replies = {
            support: 'Cảm ơn bạn đã liên hệ! Đội ngũ hỗ trợ sẽ phản hồi trong thời gian sớm nhất. Bạn cũng có thể liên hệ qua Zalo hoặc gọi điện trực tiếp. 📞',
            bug: 'Cảm ơn bạn đã báo lỗi! Chúng tôi đã ghi nhận và sẽ xử lý ngay. Mã phiếu: #' + Math.floor(1000 + Math.random() * 9000) + ' 🔧',
            suggest: 'Cảm ơn góp ý của bạn! Ý kiến của bạn rất quý giá giúp cải thiện hệ thống. Chúng tôi sẽ xem xét sớm nhất! ✨'
        };
        const replyEl = document.createElement('div');
        replyEl.className = 'chat-msg bot';
        replyEl.innerHTML = `
            <div class="chat-bubble">${replies[msgType] || replies.support}</div>
            <div class="chat-time">Hệ thống • ${timeStr}</div>
        `;
        messagesEl.appendChild(replyEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 800);

    // Also send to feedback API if user is logged in
    if (typeof currentUser !== 'undefined' && currentUser) {
        API.post('/api/feedback', {
            noi_dung: `[${typeInfo.label}] ${msg}`,
            loai: msgType
        }).catch(() => {});
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Close chatbox when clicking outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('chatboxContainer');
    if (chatboxOpen && container && !container.contains(e.target)) {
        toggleChatBox();
    }
});
