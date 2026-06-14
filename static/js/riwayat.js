document.addEventListener('DOMContentLoaded', async () => {
    const userName = sessionStorage.getItem('userName');
    const userEmail = sessionStorage.getItem('userEmail');
    const userAvatar = sessionStorage.getItem('userAvatar');
    const profileStatus = sessionStorage.getItem('profileStatus');
    const escape = window.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char])));

    // --- 1. SINKRONISASI NAMA & INISIAL ---
    if (userName) {
        // Update Nama di Navbar
        const navbarName = document.getElementById('navbarName');
        if (navbarName) navbarName.textContent = userName;

        const userNames = document.querySelectorAll('.user-name');
        if (userNames) userNames.forEach(el => el.textContent = userName);

        // Update Popup Name
        const popupName = document.getElementById('popupName');
        if (popupName) popupName.textContent = userName;

        // Logika Avatar Cerdas (Mengikuti sessionStorage)
        let finalAvatarUrl;

        if (userAvatar) {
            finalAvatarUrl = userAvatar;
        } else {
            // Fallback jika tidak ada di sessionStorage
            const initials = userName.length >= 2 ? userName.substring(0, 2).toUpperCase() : userName.toUpperCase();
            finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=FF6B00&color=FFFFFF`;
        }

        // Terapkan URL ke semua elemen avatar
        const avatarImgs = document.querySelectorAll('.avatar-img');
        if (avatarImgs) avatarImgs.forEach(el => el.src = finalAvatarUrl);

        const profileAvatars = document.querySelectorAll('.profile-avatar');
        if (profileAvatars) profileAvatars.forEach(el => el.src = finalAvatarUrl);

        // Logika inisial teks (jika ada)
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = userName.length >= 2 ? userName.substring(0, 2).toUpperCase() : userName.toUpperCase();
        }
    }

    if (userEmail) {
        const popupEmail = document.getElementById('popupEmail');
        if (popupEmail) popupEmail.textContent = userEmail;
    }

    if (window.loadUserNotifications) {
        await window.loadUserNotifications();
    }


    // --- 3. FETCH RIWAYAT LAPORAN ---
    const container = document.getElementById('riwayatContainer');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    if (!userEmail) {
        window.location.replace('login.html');
        return;
    }

    try {
        const response = await fetchWithAuth('/api/reports/user');
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
                if (report.status === 'Sedang Diproses' || report.status === 'Proses') { badgeClass = 'badge-processing'; iconName = 'loader'; }
                if (report.status === 'Selesai') { badgeClass = 'badge-done'; iconName = 'check-circle'; }

                const safeStatus = escape(report.status || 'Menunggu');
                const safeTitle = escape(report.title || 'Laporan');
                const safeAddress = escape(report.address || '-');
                const safeDescription = escape(report.description || '');
                const safeCreatedAt = escape(report.created_at || '');
                const safeDateDisplay = escape(`${dateStr} - ${timeStr} WIB`);
                const imgSrc = report.image_path ? `/static/${report.image_path}` : 'https://images.unsplash.com/photo-1526481280690-9f10f80d63b2?auto=format&fit=crop&w=900&q=80';
                const safeImgSrc = escape(imgSrc);
                const safeRepairImgSrc = escape(report.repair_image_path ? `/static/${report.repair_image_path}` : '');

                const card = `
                    <article class="history-card" data-status="${safeStatus}" data-title="${safeTitle}" data-date="${safeCreatedAt}">
                        <div class="card-img-container">
                            <img src="${safeImgSrc}" alt="Foto Laporan" class="history-img">
                            <span class="badge-overlay ${badgeClass}"><i data-lucide="${iconName}"></i> ${safeStatus}</span>
                        </div>
                        <div class="history-body">
                            <div class="history-date"><i data-lucide="calendar"></i> ${safeDateDisplay}</div>
                            <h3 class="history-card-title">${safeTitle}</h3>
                            <div class="history-address"><i data-lucide="map-pin"></i> ${safeAddress}</div>
                            <p class="history-desc-text">${safeDescription}</p>
                            <div class="card-divider"></div>
                            <div class="history-actions">
                                <button class="btn btn-outline-orange detail-button" 
                                    data-title="${safeTitle}" 
                                    data-status="${safeStatus}" 
                                    data-date="${safeDateDisplay}" 
                                    data-address="${safeAddress}" 
                                    data-desc="${safeDescription}" 
                                    data-img="${safeImgSrc}"
                                    data-img-repair="${safeRepairImgSrc}"
                                >Lihat Detail</button>
                            </div>
                        </div>
                    </article>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });

            // Render ulang icon lucide untuk kartu riwayat yang baru di-inject
            if (window.lucide) window.lucide.createIcons();

            // Sembunyikan empty state dan tampilkan container
            if (emptyState) emptyState.style.display = 'none';
            container.style.display = 'grid';
        } else {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        }
    } catch (error) {
        console.error("Gagal memuat riwayat:", error);
    }

    // --- 4. EVENT DELEGATION MODAL DETAIL ---
    if (container) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.detail-button');
            if (!btn) return;

            const modal = document.getElementById('detailModal');
            if (!modal) return;

            // Ambil data dari atribut tombol
            const title = btn.getAttribute('data-title');
            const status = btn.getAttribute('data-status');
            const date = btn.getAttribute('data-date');
            const address = btn.getAttribute('data-address');
            const desc = btn.getAttribute('data-desc');
            const img = btn.getAttribute('data-img');
            const imgRepair = btn.getAttribute('data-img-repair');

            // Injeksi data ke elemen modal eksisting di riwayat.html
            const detailOriginalPhoto = document.getElementById('detailOriginalPhoto');
            const detailTitle = document.getElementById('detailTitle');
            const detailDate = document.getElementById('detailDate');
            const detailLocation = document.getElementById('detailLocation');
            const detailDescription = document.getElementById('detailDescription');
            const detailStatus = document.getElementById('detailStatus');
            const detailRepairPhoto = document.getElementById('detailRepairPhoto');
            const repairNoPhoto = document.getElementById('repairNoPhoto');

            if (detailOriginalPhoto) detailOriginalPhoto.src = img;
            if (detailTitle) detailTitle.textContent = title;
            if (detailDate) detailDate.textContent = date;
            if (detailLocation) detailLocation.textContent = address;
            if (detailDescription) detailDescription.textContent = desc;

            if (detailStatus) {
                detailStatus.textContent = status;
                detailStatus.className = 'detail-status'; // Reset class
                if (status === 'Menunggu' || status === 'Menunggu Verifikasi') detailStatus.classList.add('badge-pending');
                else if (status === 'Sedang Diproses' || status === 'Proses') detailStatus.classList.add('badge-processing');
                else if (status === 'Selesai') detailStatus.classList.add('badge-done');
            }

            // Logika Foto Perbaikan
            if (imgRepair) {
                if (detailRepairPhoto) {
                    detailRepairPhoto.src = imgRepair;
                    detailRepairPhoto.style.display = 'block';
                }
                if (repairNoPhoto) repairNoPhoto.style.display = 'none';
            } else {
                if (detailRepairPhoto) {
                    detailRepairPhoto.src = '';
                    detailRepairPhoto.style.display = 'none';
                }
                if (repairNoPhoto) repairNoPhoto.style.display = 'flex';
            }

            // Tampilkan modal (menggunakan class 'active' bawaan dari riwayat.html)
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Re-render lucide icons inside modal if needed
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // --- 5. LOGIKA TUTUP MODAL ---
    const detailModal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('detailCloseBtn');
    
    const closeModal = () => {
        if (!detailModal) return;
        detailModal.classList.remove('active');
        detailModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeModal();
        });
    }
});
window.logout = function () {
    if (window.clearAuthSession) window.clearAuthSession();
    if (window.showLogoutNotice) window.showLogoutNotice();
    else window.location.href = 'login.html';
};
