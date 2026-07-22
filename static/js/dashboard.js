// static/js/dashboard.js

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
            const res = await fetch('/api/profile/leaderboard');
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
                    data.data.forEach((user, index) => {
                        const rank = index + 1;
                        let badgeClass = '';
                        if (user.badge === 'Suhu Jalanan') badgeClass = 'badge-suhu';
                        else if (user.badge === 'Pahlawan Jalanan') badgeClass = 'badge-pahlawan';
                        
                        const profilePicUrl = user.profile_pic === 'default-profile.png'
                            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=FF6B00&color=FFFFFF`
                            : `http://127.0.0.1:5000/static/${user.profile_pic}`;

                        lbList.innerHTML += `
                            <div class="leaderboard-item rank-${rank}">
                                <div class="rank-number">${rank}</div>
                                <img src="${profilePicUrl}" alt="${user.nama}" class="leaderboard-avatar">
                                <div class="leaderboard-info">
                                    <div class="leaderboard-name">${user.nama} <span class="leaderboard-badge ${badgeClass}">${user.badge}</span></div>
                                </div>
                                <div class="leaderboard-points">${user.points} pts</div>
                            </div>
                        `;
                    });
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
