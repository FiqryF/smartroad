document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    const userAvatar = localStorage.getItem('userAvatar');
    const profileStatus = localStorage.getItem('profileStatus');

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

        // Logika Avatar Cerdas (Mengikuti LocalStorage)
        let finalAvatarUrl;

        if (userAvatar) {
            finalAvatarUrl = userAvatar;
        } else {
            // Fallback jika tidak ada di localStorage
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

    // --- 2. SINKRONISASI NOTIFIKASI ---
    const notifDot = document.getElementById('notifDot');
    const notifDropdown = document.getElementById('notifDropdown');

    if (profileStatus === 'incomplete') {
        if (notifDot) notifDot.style.display = 'block';
        if (notifDropdown) {
            notifDropdown.innerHTML = `
                <li>
                    <div style="display: flex; gap: 0.5rem; align-items: start;">
                        <i data-lucide="alert-circle" style="color: var(--danger-red); width: 16px; margin-top: 2px;"></i>
                        <div>
                            <strong style="color: var(--asphalt-dark);">Profil Belum Lengkap</strong><br>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">Silakan <a href="profile.html" style="color: var(--safety-orange); font-weight: 600;">lengkapi data diri Anda</a> (Opsional)</span>
                        </div>
                    </div>
                </li>
            `;
        }
    } else if (profileStatus === 'complete') {
        if (notifDot) notifDot.style.display = 'none';
        if (notifDropdown) {
            notifDropdown.innerHTML = `
                <li>
                    <div style="text-align: center; padding: 1rem 0; color: var(--text-muted);">
                        <i data-lucide="check-circle" style="color: var(--success-green); width: 24px; margin-bottom: 0.5rem;"></i><br>
                        Tidak ada notifikasi baru
                    </div>
                </li>
            `;
        }
    }

    // Render icon lucide untuk notifikasi
    if (typeof lucide !== 'undefined') lucide.createIcons();


    // --- 3. FETCH RIWAYAT LAPORAN ---
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
                                <button class="btn btn-outline-orange detail-button" 
                                    data-title="${report.title.replace(/"/g, '&quot;')}" 
                                    data-status="${report.status}" 
                                    data-date="${dateStr} • ${timeStr} WIB" 
                                    data-address="${(report.address || '-').replace(/"/g, '&quot;')}" 
                                    data-desc="${report.description.replace(/"/g, '&quot;')}" 
                                    data-img="${imgSrc}"
                                    data-img-repair="${report.repair_image_path ? `/static/${report.repair_image_path}` : ''}"
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
                else if (status === 'Sedang Diproses') detailStatus.classList.add('badge-processing');
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
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('profileStatus');

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: 'Berhasil Keluar',
            text: 'Anda telah keluar dari sistem.',
            confirmButtonColor: '#FF6B00',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.location.href = 'login.html';
        });
    } else {
        window.location.href = 'login.html';
    }
};
