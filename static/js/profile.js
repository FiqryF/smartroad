document.addEventListener('DOMContentLoaded', async () => {
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
            
            if (avatarImg) {
                avatarImg.src = data.profile_pic === 'default-profile.png' 
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama)}&background=FF6B00&color=FFFFFF`
                    : `../static/${data.profile_pic}`;
            }
        }
    } catch (error) {
        console.error("Gagal mengambil profil", error);
    }

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
