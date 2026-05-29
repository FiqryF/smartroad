// static/js/dashboard.js

// 1. Validasi Sesi saat halaman dimuat
window.onload = async () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userEmail = localStorage.getItem('userEmail');
    let userName = localStorage.getItem('userName');

    // Cek proteksi
    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Ambil Profil dari Backend
    if (userEmail) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/auth/api/profile/user-profile?email=${encodeURIComponent(userEmail)}`);
            const resData = await response.json();

            if (response.ok && resData.data) {
                const profile = resData.data;
                localStorage.setItem('userName', profile.nama);
                userName = profile.nama;

                // Tentukan URL Avatar
                const profilePic = profile.profile_pic === 'default-profile.png'
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nama)}&background=FF6B00&color=FFFFFF`
                    : `http://127.0.0.1:5000/static/${profile.profile_pic}`; // Pastikan base URL backend benar

                // SIMPAN KE LOCAL STORAGE
                localStorage.setItem('userAvatar', profilePic);

                // Update Avatar di halaman dashboard
                document.querySelectorAll('.avatar-img, .profile-avatar').forEach(img => {
                    img.src = profilePic;
                });

                // Evaluasi Profil Kosong (Sistem Notifikasi Cerdas)
                const notifDot = document.getElementById('notifDot');
                const notifDropdown = document.getElementById('notifDropdown');

                if (!profile.telepon || !profile.alamat) {
                    // Profil INCOMPLETE
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
                        // Re-initialize lucide icons for newly injected HTML
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                } else {
                    // Profil COMPLETE
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
                        // Re-initialize lucide icons
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
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
};

// 4. Fungsi Logout
window.logout = function () {
    // Menghapus data sesi dari localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');

    // Redirect dengan notifikasi jika SweetAlert2 tersedia (opsional tapi disarankan)
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
        // Fallback jika SweetAlert2 tidak ter-load
        window.location.href = 'login.html';
    }
};
