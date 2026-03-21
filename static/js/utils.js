/* ============================
   UTILS - Tiện ích dùng chung
   ============================ */

// === API CLIENT ===
const API = {
    async get(url) {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `API error ${res.status}`);
        }
        return res.json();
    },
    async postForm(url, formData) {
        const res = await fetch(url, { method: 'POST', credentials: 'include', body: formData });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
    },
    async put(url, data) {
        const res = await fetch(url, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
    },
    async delete(url) {
        const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
    }
};


// === TOAST ===
function showToast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    const container = document.getElementById('toastContainer');
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// === MODAL ===
function openModal(title, bodyHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalOverlay').classList.add('active');
}
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// === DATE HELPERS ===
const BUA_MAP = { sang: '🌅 Sáng', trua: '☀️ Trưa', toi: '🌙 Tối' };
const TRANG_THAI_MAP = {
    tai_vi: { label: 'Tại đơn vị', class: 'badge-success' },
    cong_tac: { label: 'Công tác', class: 'badge-info' },
    phep: { label: 'Nghỉ phép', class: 'badge-warning' },
    gac: { label: 'Làm nhiệm vụ', class: 'badge-danger' }
};
const LOAI_MAP = {
    mon_chinh: 'Món chính', mon_phu: 'Món phụ',
    canh: 'Canh', trang_mieng: 'Tráng miệng', do_uong: 'Đồ uống'
};
const VUNG_MAP = { bac: '🏔️ Miền Bắc', trung: '⛰️ Miền Trung', nam: '🌴 Miền Nam', chung: '🇻🇳 Chung' };

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
    return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function formatDateTime(dtStr) {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function renderStars(n, max = 5) {
    let html = '';
    for (let i = 1; i <= max; i++) {
        html += i <= n ? '⭐' : '<span class="empty">☆</span>';
    }
    return `<span class="stars-display">${html}</span>`;
}

function dishEmoji(loai) {
    const map = { mon_chinh: '🍖', canh: '🍲', mon_phu: '🥗', trang_mieng: '🍮', do_uong: '🍵' };
    return map[loai] || '🍽️';
}

// === SIDEBAR MOBILE ===
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
}

// Close sidebar on overlay touch (important for mobile)
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('mobileOverlay');
    if (overlay) {
        // Use touchstart for faster response on mobile
        overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleSidebar();
        }, { passive: false });
    }
});

// === IMAGE PREVIEW ===
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    input.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Ảnh xem trước">`;
            };
            reader.readAsDataURL(file);
        }
    });
}
