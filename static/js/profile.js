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
            
            const heroBadge = document.getElementById('heroBadge');
            const heroPoints = document.getElementById('heroPoints');
            
            if (heroBadge && data.badge) {
                heroBadge.textContent = data.badge;
                // Atur warna badge berdasarkan gelar
                if (data.badge === 'Suhu Jalanan') {
                    heroBadge.style.background = 'linear-gradient(135deg, #FF6B00, #E63946)';
                    heroBadge.style.boxShadow = '0 2px 4px rgba(230, 57, 70, 0.3)';
                } else if (data.badge === 'Pahlawan Jalanan') {
                    heroBadge.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    heroBadge.style.boxShadow = 'none';
                } else {
                    heroBadge.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
                    heroBadge.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.2)';
                }
            }
            if (heroPoints && data.points !== undefined) {
                heroPoints.textContent = `${data.points} Poin`;
                
                // Progress Level Calculation
                const progressContainer = document.getElementById('progressContainer');
                const progressBar = document.getElementById('progressBar');
                const progressPercentage = document.getElementById('progressPercentage');
                const nextLevelText = document.getElementById('nextLevelText');
                
                if (progressContainer && progressBar && progressPercentage && nextLevelText) {
                    progressContainer.style.display = 'block';
                    let currentPoints = data.points;
                    let nextLevelThreshold = 0;
                    let prevLevelThreshold = 0;
                    let nextBadge = '';
                    
                    if (currentPoints < 50) {
                        prevLevelThreshold = 0;
                        nextLevelThreshold = 50;
                        nextBadge = 'Pahlawan Jalanan';
                    } else if (currentPoints < 150) {
                        prevLevelThreshold = 50;
                        nextLevelThreshold = 150;
                        nextBadge = 'Suhu Jalanan';
                    } else {
                        prevLevelThreshold = 150;
                        nextLevelThreshold = 150; // Max level
                        nextBadge = 'Level Maksimal';
                    }
                    
                    if (nextBadge === 'Level Maksimal') {
                        progressBar.style.width = '100%';
                        progressPercentage.textContent = '100%';
                        nextLevelText.textContent = 'Level Maksimal Dicapai!';
                    } else {
                        let range = nextLevelThreshold - prevLevelThreshold;
                        let earned = currentPoints - prevLevelThreshold;
                        let percentage = Math.floor((earned / range) * 100);
                        
                        setTimeout(() => {
                            progressBar.style.width = `${percentage}%`;
                        }, 100);
                        progressPercentage.textContent = `${percentage}%`;
                        nextLevelText.textContent = `Menuju ${nextBadge} (${currentPoints}/${nextLevelThreshold} Poin)`;
                    }
                }
            }
            
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
