(function() {
    document.addEventListener('DOMContentLoaded', async () => {
        const userEmail = localStorage.getItem('userEmail');

        if (!userEmail) {
            console.error("navbar-manager: Email tidak ditemukan di localStorage. Pengguna mungkin belum login.");
            return;
        }

        try {
            const response = await fetchWithAuth(`/api/profile/user-profile?email=${encodeURIComponent(userEmail)}`);
            
            if (!response) {
                console.warn("navbar-manager: Sesi tidak valid atau token kedaluwarsa. Mengalihkan ke halaman login.");
                window.location.replace('login.html');
                return;
            }

            if (response.ok) {
                const data = await response.json();
                const user = data.user || data.data || data; // Mengantisipasi struktur JSON dari backend
                
                if (user && user.nama) {
                    // Update Nama
                    const navbarName = document.getElementById('navbarName');
                    if (navbarName) navbarName.textContent = user.nama;
                    
                    const popupName = document.getElementById('popupName');
                    if (popupName) popupName.textContent = user.nama;
                    
                    const popupEmailEl = document.getElementById('popupEmail');
                    if (popupEmailEl) popupEmailEl.textContent = user.email || userEmail;
                    
                    const userNames = document.querySelectorAll('.user-name');
                    if (userNames) userNames.forEach(el => el.textContent = user.nama);

                    // Update Avatar
                    let avatarUrl = '';
                    const profilePic = user.profile_pic;
                    
                    if (!profilePic || profilePic === 'default-profile.png' || profilePic.trim() === '') {
                        const initials = user.nama.length >= 2 ? user.nama.substring(0, 2).toUpperCase() : user.nama.toUpperCase();
                        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=FF6B00&color=FFFFFF`;
                    } else {
                        avatarUrl = `/static/${profilePic.startsWith('/') ? profilePic.substring(1) : profilePic}`;
                    }

                    const avatarImgs = document.querySelectorAll('.avatar-img');
                    if (avatarImgs) avatarImgs.forEach(img => img.src = avatarUrl);

                    const profileAvatars = document.querySelectorAll('.profile-avatar');
                    if (profileAvatars) profileAvatars.forEach(img => img.src = avatarUrl);
                }
            } else {
                console.error("navbar-manager: Gagal mengambil data profil dari server. Status:", response.status);
            }
        } catch (error) {
            console.error("navbar-manager: Terjadi kesalahan saat melakukan fetch data profil:", error);
        }
    });
})();
