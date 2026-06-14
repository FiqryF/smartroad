async function fetchWithAuth(url, options = {}) {
    const token = sessionStorage.getItem('jwtToken');

    if (!token) {
        window.location.replace('login.html');
        return null;
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 422) {
            if (window.clearAuthSession) clearAuthSession();
            else {
                sessionStorage.removeItem('jwtToken');
                sessionStorage.removeItem('userRole');
            }
            window.location.replace('login.html');
            return null;
        }

        return response;
    } catch (error) {
        console.error('Fetch with auth error:', error);
        throw error;
    }
}

function clearAuthSession() {
    const authKeys = ['jwtToken', 'isLoggedIn', 'userName', 'userEmail', 'userAvatar', 'userRole', 'profileStatus'];
    authKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
}

function showLogoutNotice() {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: 'info',
            title: 'Berhasil Keluar',
            text: 'Anda telah keluar dari sistem.',
            confirmButtonColor: '#FF6B00',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.location.href = 'login.html';
        });
    }

    window.location.href = 'login.html';
    return Promise.resolve();
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

async function loadUserNotifications(options = {}) {
    const userEmail = sessionStorage.getItem('userEmail');
    const notifDot = document.getElementById('notifDot');
    const notifDropdown = document.getElementById('notifDropdown');
    const notificationBtn = document.querySelector('.notification-btn');

    if (!userEmail || !notifDropdown) return;

    let profile = options.profile || null;
    let profileStatus = sessionStorage.getItem('profileStatus');

    try {
        if (!profile) {
            const profileResponse = await fetchWithAuth('/api/profile/user-profile');
            if (profileResponse && profileResponse.ok) {
                const profileData = await profileResponse.json();
                profile = profileData.data || profileData.user || profileData;
            }
        }

        if (profile) {
            profileStatus = profile.telepon && profile.alamat ? 'complete' : 'incomplete';
            sessionStorage.setItem('profileStatus', profileStatus);
        }

        const response = await fetchWithAuth('/api/reports/notifications/user');
        if (!response || !response.ok) return;

        const data = await response.json();
        const notifications = data.data || [];
        const hasUnread = notifications.some(item => !item.is_read);
        const showProfileReminder = profileStatus === 'incomplete';

        if (notifDot) {
            notifDot.style.display = hasUnread || showProfileReminder ? 'block' : 'none';
        }

        notifDropdown.innerHTML = '';

        if (showProfileReminder) {
            notifDropdown.insertAdjacentHTML('beforeend', `
                <li>
                    <div class="notification-item notification-item-warning">
                        <span class="notification-icon-wrap"><i data-lucide="alert-circle"></i></span>
                        <div class="notification-copy">
                            <strong>Profil Belum Lengkap</strong>
                            <span>Silakan <a href="profile.html">lengkapi data diri Anda</a></span>
                        </div>
                    </div>
                </li>
            `);
        }

        notifications.forEach(item => {
            const createdAt = new Date(item.created_at);
            const validDate = !Number.isNaN(createdAt.getTime());
            const dateStr = validDate ? createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const timeStr = validDate ? createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
            const meta = dateStr && timeStr ? `${dateStr} - ${timeStr}` : '';

            notifDropdown.insertAdjacentHTML('beforeend', `
                <li>
                    <div class="notification-item">
                        <span class="notification-icon-wrap"><i data-lucide="bell"></i></span>
                        <div class="notification-copy">
                            <strong>${escapeHtml(item.title || 'Notifikasi')}</strong>
                            <span>${escapeHtml(item.message || '')}</span>
                            ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
                        </div>
                    </div>
                </li>
            `);
        });

        if (!showProfileReminder && notifications.length === 0) {
            notifDropdown.insertAdjacentHTML('beforeend', `
                <li>
                    <div class="notification-empty">
                        <i data-lucide="check-circle"></i>
                        <span>Tidak ada notifikasi baru</span>
                    </div>
                </li>
            `);
        }

        if (notificationBtn && !notificationBtn.dataset.readHandlerAttached) {
            notificationBtn.dataset.readHandlerAttached = 'true';
            notificationBtn.addEventListener('click', async () => {
                if (notifDot && profileStatus !== 'incomplete') notifDot.style.display = 'none';
                try {
                    await fetchWithAuth('/api/reports/notifications/user/read', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (error) {
                    console.error(error);
                }
            });
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        console.error('Gagal memuat notifikasi:', error);
    }
}

window.clearAuthSession = clearAuthSession;
window.escapeHtml = escapeHtml;
window.loadUserNotifications = loadUserNotifications;
window.showLogoutNotice = showLogoutNotice;

window.logout = function () {
    clearAuthSession();
    showLogoutNotice();
};
