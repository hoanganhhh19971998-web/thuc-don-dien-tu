/* ==========================================
   AUTH UI - User bar & Logout (for main page)
   ========================================== */

let currentUser = null;

async function loadCurrentUser() {
    try {
        const data = await API.get('/api/auth/me');
        currentUser = data;
        updateUserUI();
        return data;
    } catch (e) {
        currentUser = null;
        updateUserUI();
        return null;
    }
}

function updateUserUI() {
    const userBar = document.getElementById('userBar');
    if (!userBar || !currentUser) return;

    userBar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--border);">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:white;flex-shrink:0">
            ${currentUser.ho_ten.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${currentUser.ho_ten}</div>
            <div style="font-size:0.65rem;color:var(--accent);text-transform:uppercase;letter-spacing:1px">${currentUser.vai_tro === 'admin' ? '🎖️ Quản trị viên' : '🪖 Chiến sĩ'}</div>
        </div>
        <button onclick="doLogout()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:4px" title="Đăng xuất">🚪</button>
    </div>`;
}

async function doLogout() {
    try { await API.post('/api/auth/logout', {}); } catch(e) {}
    currentUser = null;
    showToast('Đã đăng xuất', 'info');
    // Reload to show login screen
    location.reload();
}
