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
                // Update Local Storage just in case
                localStorage.setItem('userName', profile.nama);
                userName = profile.nama;
                
                // Update Avatar
                const profilePic = profile.profile_pic === 'default-profile.png' 
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nama)}&background=FF6B00&color=FFFFFF`
                    : `static/${profile.profile_pic}`;
                    
                document.querySelectorAll('.avatar-img, .profile-avatar').forEach(img => {
                    img.src = profilePic;
                });

                // Cek profil kosong
                if (!profile.telepon || !profile.alamat) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Profil Belum Lengkap!',
                        text: 'Silakan lengkapi data diri Anda (telepon dan alamat) di menu Pengaturan Akun.',
                        confirmButtonText: 'Lengkapi Sekarang',
                        showCancelButton: true,
                        cancelButtonText: 'Nanti',
                        confirmButtonColor: '#FF6B00'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'profile.html';
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Gagal mengambil profil:", error);
        }
    }

    // 2. Menampilkan Nama Pengguna (Greeting)
    const userNames = document.querySelectorAll('.user-name');
    userNames.forEach(el => {
        if (userName) {
            el.textContent = userName;
        }
    });
};

// 3. Fungsi Logout
window.logout = function() {
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
