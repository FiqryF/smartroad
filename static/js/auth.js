// static/js/auth.js

// Pastikan DOM sudah dimuat sebelum menambahkan event listener
document.addEventListener('DOMContentLoaded', () => {
    
    // Form Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await ApiService.post('/auth/login', { email, password });
                
                if (response.ok) {
                    // Menyimpan status sesi, nama pengguna, dan email ke localStorage
                    localStorage.setItem('jwtToken', response.data.access_token);
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userName', response.data.user_data.nama);
                    localStorage.setItem('userEmail', response.data.user_data.email);

                    Swal.fire({
                        icon: 'success',
                        title: 'Sukses',
                        text: 'Login berhasil!',
                        confirmButtonColor: '#FF6B00'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "dashboard.html";
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Gagal',
                        text: response.data.message || 'Kredensial tidak valid.',
                        confirmButtonColor: '#FF6B00'
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan Jaringan',
                    text: 'Tidak dapat terhubung ke server backend.',
                    confirmButtonColor: '#FF6B00'
                });
            }
        });
    }

    // Form Register
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const nama = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirm_password = document.getElementById('confirm_password').value;
            
            if (password !== confirm_password) {
                Swal.fire({
                    icon: 'error',
                    title: 'Validasi Gagal',
                    text: 'Password tidak cocok!',
                    confirmButtonColor: '#FF6B00'
                });
                return;
            }
            
            try {
                const response = await ApiService.post('/auth/register', { 
                    nama, email, password, confirm_password 
                });
                
                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sukses',
                        text: 'Registrasi berhasil!',
                        confirmButtonColor: '#FF6B00'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "login.html";
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Registrasi Gagal',
                        text: response.data.message || 'Terjadi kesalahan saat registrasi.',
                        confirmButtonColor: '#FF6B00'
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan Jaringan',
                    text: 'Terjadi kesalahan saat menghubungi server.',
                    confirmButtonColor: '#FF6B00'
                });
            }
        });
    }
});
