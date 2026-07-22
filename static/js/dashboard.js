// static/js/dashboard.js

const updateProfileGamificationSummary = (profile) => {
    if (!profile) return;
    const points = Number(profile.points || 0);
    const badge = profile.badge || 'Warga Peduli';
    const badgeInfo = profile.badge_info || {};
    const nextBadge = badgeInfo.next_badge?.name || 'Level maksimal dicapai';
    const next = Number(badgeInfo.next_threshold || points || 0);
    const percentage = Number(badgeInfo.progress_percentage ?? 100);
    const badgeColors = {
        'Warga Peduli': 'linear-gradient(135deg, #3b82f6, #2563eb)',
        'Relawan Jalan': 'linear-gradient(135deg, #06b6d4, #0284c7)',
        'Penjaga Lingkungan': 'linear-gradient(135deg, #10b981, #059669)',
        'Pahlawan Jalanan': 'linear-gradient(135deg, #f59e0b, #d97706)',
        'Patriot Infrastruktur': 'linear-gradient(135deg, #FF6B00, #dc2626)',
        'Duta SmartRoad': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        'Legenda Jalanan': 'linear-gradient(135deg, #0f172a, #334155)'
    };
    const badgeBg = badgeInfo.current_badge?.color || badgeColors[badge] || badgeColors['Warga Peduli'];

    document.querySelectorAll('[data-profile-game-badge]').forEach(el => {
        el.textContent = badge;
        el.style.background = badgeBg;
    });
    document.querySelectorAll('[data-profile-game-points]').forEach(el => {
        el.textContent = `${points} Poin`;
    });
    document.querySelectorAll('[data-profile-game-fill]').forEach(el => {
        el.style.width = `${percentage}%`;
    });
    document.querySelectorAll('[data-profile-game-next]').forEach(el => {
        el.textContent = badgeInfo.next_badge ? `Menuju ${nextBadge} (${points}/${next})` : nextBadge;
    });
};

// 1. Validasi Sesi saat halaman dimuat
window.onload = async () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userEmail = sessionStorage.getItem('userEmail');
    let userName = sessionStorage.getItem('userName');

    // Cek proteksi
    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Ambil Profil dari Backend
    if (userEmail) {
        try {
            const response = await fetchWithAuth('/api/profile/user-profile');
            if (!response) return;
            const resData = await response.json();

            if (response.ok && resData.data) {
                const profile = resData.data;
                sessionStorage.setItem('userName', profile.nama);
                userName = profile.nama;
                updateProfileGamificationSummary(profile);

                // Tentukan URL Avatar
                const profilePic = profile.profile_pic === 'default-profile.png'
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nama)}&background=FF6B00&color=FFFFFF`
                    : `http://127.0.0.1:5000/static/${profile.profile_pic}`; // Pastikan base URL backend benar

                // SIMPAN KE SESSION STORAGE
                sessionStorage.setItem('userAvatar', profilePic);

                // Update Avatar di halaman dashboard
                document.querySelectorAll('.avatar-img, .profile-avatar').forEach(img => {
                    img.src = profilePic;
                });

                if (window.loadUserNotifications) {
                    await window.loadUserNotifications({ profile });
                }
            } else {
                console.error("Gagal mengambil data dari server:", resData);
            }
        } catch (error) {
            console.error("Gagal mengambil profil:", error);
        }
    }

    // 2. Menampilkan Nama Pengguna (Greeting) pada Desktop/Mobile Nav
    const userNames = document.querySelectorAll('.user-name');
    userNames.forEach(el => {
        if (userName) {
            el.textContent = userName;
        }
    });

    // 3. Menampilkan Data Dinamis ke ID yang baru ditambahkan
    const heroName = document.getElementById('heroName');
    const popupName = document.getElementById('popupName');
    const popupEmail = document.getElementById('popupEmail');

    if (userName) {
        if (heroName) heroName.textContent = userName.toUpperCase();
        if (popupName) popupName.textContent = userName;
    }

    if (userEmail && popupEmail) {
        popupEmail.textContent = userEmail;
    }

    // 4. GPS Permission Logic
    const gpsPreference = localStorage.getItem('gpsPreference');
    if (!gpsPreference && typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Izinkan Akses Lokasi?',
            text: 'Kami memerlukan akses lokasi Anda (GPS) untuk mendeteksi koordinat kerusakan jalan secara presisi.',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Selalu Izinkan',
            denyButtonText: 'Izinkan Sekali',
            cancelButtonText: 'Nanti Saja',
            confirmButtonColor: '#FF6B00',
            denyButtonColor: '#2A9D8F',
            cancelButtonColor: '#5A626A'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.setItem('gpsPreference', 'always');
                requestLocation();
            } else if (result.isDenied) {
                localStorage.setItem('gpsPreference', 'once');
                requestLocation();
            }
        });
    } else if (gpsPreference === 'always') {
        requestLocation();
    }

    function requestLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    localStorage.setItem('userLat', position.coords.latitude);
                    localStorage.setItem('userLng', position.coords.longitude);
                    console.log("Lokasi GPS berhasil disimpan:", position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Gagal mendapatkan lokasi GPS:", error.message);
                }
            );
        }
    }

    async function loadLeaderboard() {
        try {
            const res = await fetch('/api/profile/leaderboard?limit=10');
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    const lbList = document.getElementById('leaderboardList');
                    if (!lbList) return;
                    lbList.innerHTML = '';
                    if (data.data.length === 0) {
                        lbList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 2rem;">Belum ada warga yang memiliki poin. Jadilah yang pertama!</div>';
                        return;
                    }
                    const getBadgeClass = (user) => {
                        const badgeFromApi = user.badge_info?.current_badge?.class_name;
                        if (badgeFromApi) return badgeFromApi;
                        const badge = user.badge;
                        if (badge === 'Relawan Jalan') return 'badge-relawan';
                        if (badge === 'Penjaga Lingkungan') return 'badge-penjaga';
                        if (badge === 'Pahlawan Jalanan') return 'badge-pahlawan';
                        if (badge === 'Patriot Infrastruktur') return 'badge-suhu';
                        if (badge === 'Duta SmartRoad') return 'badge-duta';
                        if (badge === 'Legenda Jalanan') return 'badge-legenda';
                        return '';
                    };
                    const renderUser = (user, index, champion = false) => {
                        const rank = index + 1;
                        const badgeClass = getBadgeClass(user);
                        
                        const profilePicUrl = user.profile_pic === 'default-profile.png'
                            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=FF6B00&color=FFFFFF`
                            : `http://127.0.0.1:5000/static/${user.profile_pic}`;

                        if (champion) {
                            return `
                                <div class="leaderboard-item leaderboard-champion rank-${rank}">
                                    <div class="leaderboard-champion-top">
                                        <div class="rank-number">Juara #${rank}</div>
                                        <div class="leaderboard-points">${user.points} pts</div>
                                    </div>
                                    <div class="leaderboard-champion-body">
                                        <img src="${profilePicUrl}" alt="${user.nama}" class="leaderboard-avatar">
                                        <div class="leaderboard-info">
                                            <div class="leaderboard-name">${user.nama}</div>
                                            <span class="leaderboard-badge ${badgeClass}">${user.badge}</span>
                                            <div class="leaderboard-meta">Kontributor tertinggi SmartRoad</div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }

                        return `
                            <div class="leaderboard-item rank-${rank}">
                                <div class="rank-number">#${rank}</div>
                                <img src="${profilePicUrl}" alt="${user.nama}" class="leaderboard-avatar">
                                <div class="leaderboard-info">
                                    <div class="leaderboard-name">${user.nama} <span class="leaderboard-badge ${badgeClass}">${user.badge}</span></div>
                                    <div class="leaderboard-meta">Reward dari laporan selesai</div>
                                </div>
                                <div class="leaderboard-points">${user.points} pts</div>
                            </div>
                        `;
                    };

                    const [champion, ...others] = data.data;
                    lbList.innerHTML = `
                        ${renderUser(champion, 0, true)}
                        <div class="leaderboard-stack">
                            ${others.map((user, index) => renderUser(user, index + 1)).join('')}
                        </div>
                    `;
                }
            }
        } catch(err) {
            console.error('Failed to load leaderboard', err);
        }
    }
    
    loadLeaderboard();
};

// 4. Fungsi Logout
window.logout = function () {
    if (window.clearAuthSession) window.clearAuthSession();
    if (window.showLogoutNotice) window.showLogoutNotice();
    else window.location.href = 'login.html';
};
