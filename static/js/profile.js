document.addEventListener('DOMContentLoaded', async () => {
    const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
    const formatPointDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.href = 'login.html';
        return;
    }

    // Elemen Form Profil Utama
    const profileForm = document.getElementById('profileForm');
    const inputNama = document.getElementById('inputNama');
    const inputEmail = document.getElementById('inputEmail');
    const inputTelepon = document.getElementById('inputTelepon');
    const inputAlamat = document.getElementById('inputAlamat');
    const labelBergabung = document.getElementById('labelBergabung');
    const heroNama = document.getElementById('heroNama');
    
    // Elemen Foto Profil
    const avatarImg = document.getElementById('avatarImg');
    const avatarEditBtn = document.getElementById('avatarEditBtn');
    const photoInput = document.getElementById('photoInput');
    
    // Elemen Password
    const passwordForm = document.getElementById('passwordForm');
    const badgeDropdown = document.getElementById('badgeDropdown');
    const badgeDropdownToggle = document.getElementById('badgeDropdownToggle');
    const badgeMenu = document.getElementById('badgeMenu');
    const currentBadgeMini = document.getElementById('currentBadgeMini');
    const pointHistoryButton = document.getElementById('pointHistoryButton');
    const pointHistoryModal = document.getElementById('pointHistoryModal');
    const pointHistoryClose = document.getElementById('pointHistoryClose');
    const renderPointHistory = (history) => {
        const pointHistoryList = document.getElementById('pointHistoryList');
        if (!pointHistoryList) return;
        if (!Array.isArray(history) || !history.length) {
            pointHistoryList.innerHTML = '<div class="point-history-empty" style="color:#64748b; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:14px; font-size:0.9rem;">Belum ada reward poin. Poin akan masuk saat laporan selesai dikerjakan.</div>';
            return;
        }
        pointHistoryList.innerHTML = history.map(item => `
            <div class="point-history-item" style="display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc; padding:10px 12px; color:#1e293b; font-size:0.82rem; font-weight:800;">
                <span>${escape(item.reason || 'Reward SmartRoad')}<br><small style="color:#64748b; font-weight:700;">${escape(item.report_title || 'Laporan selesai')} - ${escape(formatPointDate(item.awarded_at))}</small></span>
                <strong style="color:#FF6B00; white-space:nowrap;">+${escape(item.points || 0)}</strong>
            </div>
        `).join('');
    };

    // 1. Mengisi Data Awal secara instan dari sessionStorage (Agar tidak muncul "Memuat...")
    const userName = sessionStorage.getItem('userName');
    if (heroNama && userName) heroNama.textContent = userName;
    if (inputNama && userName) inputNama.value = userName;
    if (inputEmail && userEmail) inputEmail.value = userEmail;

    // 2. Fetch Profil Lanjutan dari Server saat dimuat (Untuk mengambil Telepon, Alamat, dan Tanggal Bergabung)
    try {
        const response = await fetchWithAuth('/api/profile/user-profile');
        if (!response) return;
        const resData = await response.json();
        
        if (response.ok && resData.data) {
            const data = resData.data;
            if (inputNama) inputNama.value = data.nama;
            if (inputEmail) inputEmail.value = data.email;
            if (inputTelepon) inputTelepon.value = data.telepon;
            if (inputAlamat) inputAlamat.value = data.alamat;
            if (labelBergabung) labelBergabung.textContent = `Bergabung ${data.bergabung}`;
            if (heroNama) heroNama.textContent = data.nama;
            
            const heroBadge = document.getElementById('heroBadge');
            const heroPoints = document.getElementById('heroPoints');
            const badgeInfo = data.badge_info || {};
            const apiBadgeColors = {};
            (Array.isArray(badgeInfo.badge_levels) ? badgeInfo.badge_levels : []).forEach(level => {
                if (level.name && level.color) apiBadgeColors[level.name] = level.color;
            });
            const badgeColors = {
                'Warga Peduli': 'linear-gradient(135deg, #3b82f6, #2563eb)',
                'Relawan Jalan': 'linear-gradient(135deg, #06b6d4, #0284c7)',
                'Penjaga Lingkungan': 'linear-gradient(135deg, #10b981, #059669)',
                'Pahlawan Jalanan': 'linear-gradient(135deg, #f59e0b, #d97706)',
                'Patriot Infrastruktur': 'linear-gradient(135deg, #FF6B00, #dc2626)',
                'Duta SmartRoad': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                'Legenda Jalanan': 'linear-gradient(135deg, #0f172a, #334155)'
            };
            Object.assign(badgeColors, apiBadgeColors);
            
            if (heroBadge && data.badge) {
                heroBadge.textContent = data.badge;
                heroBadge.style.background = badgeColors[data.badge] || badgeColors['Warga Peduli'];
                heroBadge.style.boxShadow = '0 2px 4px rgba(15, 23, 42, 0.18)';
            }
            if (currentBadgeMini && data.badge) currentBadgeMini.textContent = data.badge;
            if (badgeDropdownToggle && data.badge) {
                const activeBadgeColor = badgeColors[data.badge] || badgeColors['Warga Peduli'];
                badgeDropdownToggle.style.background = activeBadgeColor;
                badgeDropdownToggle.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.18)';
            }
            if (badgeMenu) {
                const levels = Array.isArray(badgeInfo.badge_levels) ? badgeInfo.badge_levels : [];
                badgeMenu.innerHTML = levels.map((level, index) => {
                    const nextLevel = levels[index + 1];
                    const rangeText = nextLevel
                        ? `${level.min_points} - ${nextLevel.min_points - 1} poin`
                        : `${level.min_points}+ poin`;
                    const activeClass = level.name === data.badge ? ' active' : '';
                    return `
                        <div class="badge-menu-item${activeClass}">
                            <span class="badge-menu-pill" style="background: ${badgeColors[level.name] || badgeColors['Warga Peduli']};">${escape(level.name)}</span>
                            <span class="badge-menu-range">${escape(rangeText)}</span>
                        </div>
                    `;
                }).join('');
            }
            if (heroPoints && data.points !== undefined) {
                heroPoints.textContent = `${data.points} Poin`;
                const profilePointTotal = document.getElementById('profilePointTotal');
                if (profilePointTotal) profilePointTotal.textContent = data.points;
                
                // Progress Level Calculation
                const progressContainer = document.getElementById('progressContainer');
                const progressBar = document.getElementById('progressBar');
                const progressPercentage = document.getElementById('progressPercentage');
                const nextLevelText = document.getElementById('nextLevelText');
                
                if (progressContainer && progressBar && progressPercentage && nextLevelText) {
                    progressContainer.style.display = 'block';
                    const currentPoints = Number(data.points || 0);
                    const nextBadge = badgeInfo.next_badge?.name || 'Level Maksimal';
                    const nextLevelThreshold = Number(badgeInfo.next_threshold || currentPoints || 0);
                    const percentage = Number(badgeInfo.progress_percentage ?? 100);

                    if (!badgeInfo.next_badge) {
                        progressBar.style.width = '100%';
                        progressPercentage.textContent = '100%';
                        nextLevelText.textContent = 'Level Maksimal Dicapai!';
                    } else {
                        setTimeout(() => {
                            progressBar.style.width = `${percentage}%`;
                        }, 100);
                        progressPercentage.textContent = `${percentage}%`;
                        nextLevelText.textContent = `Menuju ${nextBadge} (${currentPoints}/${nextLevelThreshold} Poin)`;
                    }
                }
            }

            renderPointHistory(data.point_history);
            
            if (avatarImg) {
                avatarImg.src = data.profile_pic === 'default-profile.png' 
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama)}&background=FF6B00&color=FFFFFF`
                    : `../static/${data.profile_pic}`;
            }
        }
    } catch (error) {
        console.error("Gagal mengambil profil", error);
    }

    badgeDropdownToggle?.addEventListener('click', (event) => {
        event.stopPropagation();
        const isActive = badgeDropdown?.classList.toggle('active');
        badgeDropdownToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });

    document.addEventListener('click', (event) => {
        if (badgeDropdown && !event.target.closest('#badgeDropdown')) {
            badgeDropdown.classList.remove('active');
            badgeDropdownToggle?.setAttribute('aria-expanded', 'false');
        }
    });

    pointHistoryButton?.addEventListener('click', async () => {
        pointHistoryModal?.classList.add('active');
        pointHistoryModal?.setAttribute('aria-hidden', 'false');
        try {
            const response = await fetchWithAuth('/api/profile/points-history?limit=50');
            if (!response || !response.ok) return;
            const payload = await response.json();
            if (payload.status === 'success') renderPointHistory(payload.data);
        } catch (error) {
            console.error('Gagal mengambil riwayat poin:', error);
        }
    });

    const closePointHistory = () => {
        pointHistoryModal?.classList.remove('active');
        pointHistoryModal?.setAttribute('aria-hidden', 'true');
    };
    pointHistoryClose?.addEventListener('click', closePointHistory);
    pointHistoryModal?.addEventListener('click', (event) => {
        if (event.target === pointHistoryModal) closePointHistory();
    });

    // Update Profil Utama
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const response = await fetchWithAuth('/api/profile/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nama: inputNama.value,
                        telepon: inputTelepon.value,
                        alamat: inputAlamat.value
                    })
                });
                if (!response) return;
                
                const data = await response.json();
                if (response.ok) {
                    sessionStorage.setItem('userName', inputNama.value);
                    Swal.fire('Berhasil', data.message, 'success');
                } else {
                    Swal.fire('Gagal', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Kesalahan koneksi ke server', 'error');
            }
        });
    }

    // Ubah Password
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!oldPassword) {
                Swal.fire('Validasi Gagal', 'Password saat ini wajib diisi!', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                Swal.fire('Validasi Gagal', 'Konfirmasi password tidak cocok!', 'error');
                return;
            }
            
            try {
                const response = await fetchWithAuth('/api/profile/update-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        old_password: oldPassword,
                        new_password: newPassword
                    })
                });
                if (!response) return;
                
                const data = await response.json();
                if (response.ok) {
                    Swal.fire('Berhasil', data.message, 'success');
                    passwordForm.reset();
                } else {
                    Swal.fire('Gagal', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Kesalahan koneksi ke server', 'error');
            }
        });
    }

    // Upload Foto Profil
    if (avatarEditBtn && photoInput) {
        avatarEditBtn.addEventListener('click', () => {
            photoInput.click();
        });
        
        photoInput.addEventListener('change', async () => {
            if (photoInput.files.length > 0) {
                const file = photoInput.files[0];
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Swal.fire('Gagal', 'Format foto harus JPG, PNG, atau WEBP.', 'error');
                    photoInput.value = '';
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    Swal.fire('Gagal', 'Ukuran foto maksimal 5 MB.', 'error');
                    photoInput.value = '';
                    return;
                }

                const formData = new FormData();
                formData.append('photo', file);
                
                try {
                    const response = await fetchWithAuth('/api/profile/upload-photo', {
                        method: 'POST',
                        body: formData
                    });
                    if (!response) return;
                    
                    const data = await response.json();
                    if (response.ok) {
                        avatarImg.src = `../static/${data.profile_pic}`;
                        Swal.fire('Berhasil', 'Foto profil berhasil diperbarui', 'success');
                    } else {
                        Swal.fire('Gagal', data.message || 'Gagal mengunggah foto', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Kesalahan koneksi saat mengunggah foto', 'error');
                }
            } // INI PENUTUP YANG HILANG 1
        }); // INI PENUTUP YANG HILANG 2
    } // INI PENUTUP YANG HILANG 3

    // Pastikan Lucide icon tetap berfungsi setelah DOM berubah
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
