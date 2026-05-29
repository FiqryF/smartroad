document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    // Ambil data avatar dari localStorage
    const userAvatar = localStorage.getItem('userAvatar');

    // --- PERBAIKAN INISIAL & NAMA ---
    if (userName) {
        // 1. Update Nama di Navbar
        const navbarName = document.getElementById('navbarName');
        if (navbarName) navbarName.textContent = userName;

        const userNames = document.querySelectorAll('.user-name');
        if (userNames) userNames.forEach(el => el.textContent = userName);

        // 2. Update Popup Name
        const popupName = document.getElementById('popupName');
        if (popupName) popupName.textContent = userName;

        // 3. Logika Avatar Cerdas (Mengikuti LocalStorage)
        let finalAvatarUrl;

        if (userAvatar) {
            // Jika foto profil (baik custom atau inisial dari dashboard) sudah ada di storage
            finalAvatarUrl = userAvatar;
        } else {
            // Fallback cadangan jika user langsung masuk ke halaman riwayat tanpa lewat dashboard
            const initials = userName.length >= 2 ? userName.substring(0, 2).toUpperCase() : userName.toUpperCase();
            finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=FF6B00&color=FFFFFF`;
        }

        // Terapkan URL ke semua elemen avatar
        const avatarImgs = document.querySelectorAll('.avatar-img');
        if (avatarImgs) avatarImgs.forEach(el => el.src = finalAvatarUrl);

        const profileAvatars = document.querySelectorAll('.profile-avatar');
        if (profileAvatars) profileAvatars.forEach(el => el.src = finalAvatarUrl);

        // Logika inisial teks (jika ada elemen text khusus)
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = userName.length >= 2 ? userName.substring(0, 2).toUpperCase() : userName.toUpperCase();
        }
    }

    // --- SISA KODE SEBELUMNYA ---
    const container = document.getElementById('riwayatContainer');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    if (!userEmail) {
        window.location.replace('login.html');
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/reports/user?email=${encodeURIComponent(userEmail)}`);
        if (!response) return;

        const resData = await response.json();
        container.innerHTML = '';

        if (response.ok && resData.data && resData.data.length > 0) {
            if (emptyState) emptyState.style.display = 'none';
            container.style.display = 'grid';

            resData.data.forEach(report => {
                const dateObj = new Date(report.created_at);
                const dateStr = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                let badgeClass = 'badge-pending';
                let iconName = 'clock';
                if (report.status === 'Sedang Diproses') { badgeClass = 'badge-processing'; iconName = 'loader'; }
                if (report.status === 'Selesai') { badgeClass = 'badge-done'; iconName = 'check-circle'; }

                const imgSrc = report.image_path ? `/static/${report.image_path}` : 'https://images.unsplash.com/photo-1526481280690-9f10f80d63b2?auto=format&fit=crop&w=900&q=80';

                const card = `
                    <article class="history-card" data-status="${report.status}" data-title="${report.title}" data-date="${report.created_at}">
                        <div class="card-img-container">
                            <img src="${imgSrc}" alt="Foto Laporan" class="history-img">
                            <span class="badge-overlay ${badgeClass}"><i data-lucide="${iconName}"></i> ${report.status}</span>
                        </div>
                        <div class="history-body">
                            <div class="history-date"><i data-lucide="calendar"></i> ${dateStr} • ${timeStr} WIB</div>
                            <h3 class="history-card-title">${report.title}</h3>
                            <div class="history-address"><i data-lucide="map-pin"></i> ${report.address || '-'}</div>
                            <p class="history-desc-text">${report.description}</p>
                            <div class="card-divider"></div>
                            <div class="history-actions">
                                <button class="btn btn-outline-orange detail-button" onclick="alert('Fitur detail menyusul!')">Lihat Detail</button>
                            </div>
                        </div>
                    </article>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });

            if (window.lucide) window.lucide.createIcons();
        } else {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        }
    } catch (error) {
        console.error("Gagal memuat riwayat:", error);
    }
});