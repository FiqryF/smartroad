document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // --- 0. DYNAMIC PROFILE & NOTIFICATION LOGIC ---
    const initDynamicProfile = async () => {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        const userEmail = sessionStorage.getItem('userEmail');
        const userName = sessionStorage.getItem('userName');

        if (isLoggedIn !== 'true') {
            window.location.href = 'login.html';
            return;
        }

        // Set Navbar Names
        document.querySelectorAll('.user-name').forEach(el => {
            if (userName) el.textContent = userName;
        });

        const popupName = document.getElementById('popupName');
        const popupEmail = document.getElementById('popupEmail');
        if (popupName && userName) popupName.textContent = userName;
        if (popupEmail && userEmail) popupEmail.textContent = userEmail;

        if (userEmail) {
            try {
                const response = await fetchWithAuth('/api/profile/user-profile');
                if (!response) return;
                const resData = await response.json();
                if (response.ok && resData.data) {
                    const profile = resData.data;

                    const profilePic = profile.profile_pic === 'default-profile.png'
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nama)}&background=FF6B00&color=FFFFFF`
                        : `static/${profile.profile_pic}`;

                    document.querySelectorAll('.avatar-img, .profile-avatar').forEach(img => {
                        img.src = profilePic;
                    });

                    if (window.loadUserNotifications) {
                        await window.loadUserNotifications({ profile });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            }
        }
    };
    initDynamicProfile();

    // 1. Navbar & Menu Toggles
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
        if (window.scrollY > 40) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const drawerOverlay = document.getElementById('drawerOverlay');

    const toggleMobileMenu = () => {
        navMenu.classList.toggle('active');
        drawerOverlay.classList.toggle('active');
        const icon = menuToggle.querySelector('i');
        if (navMenu.classList.contains('active')) {
            icon.setAttribute('data-lucide', 'x');
            document.body.style.overflow = 'hidden';
        } else {
            icon.setAttribute('data-lucide', 'menu');
            document.body.style.overflow = '';
        }
        if (window.lucide) window.lucide.createIcons();
    };

    if (menuToggle && navMenu && drawerOverlay) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileMenu();
        });
        drawerOverlay.addEventListener('click', () => {
            navMenu.classList.remove('active');
            drawerOverlay.classList.remove('active');
            document.body.style.overflow = '';
            menuToggle.querySelector('i').setAttribute('data-lucide', 'menu');
            if (window.lucide) window.lucide.createIcons();
        });
    }

    const notificationBtn = document.querySelector('.notification-btn');
    const profileDesktop = document.querySelector('.user-profile-desktop');
    const notificationPanel = document.getElementById('notificationPanel');
    const profileMenu = document.getElementById('profileMenu');

    notificationBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileMenu) profileMenu.classList.remove('active');
        notificationPanel?.classList.toggle('active');
    });

    profileDesktop?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notificationPanel) notificationPanel.classList.remove('active');
        profileMenu?.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-actions') && !e.target.closest('.header-dropdowns')) {
            if (notificationPanel) notificationPanel.classList.remove('active');
            if (profileMenu) profileMenu.classList.remove('active');
        }
    });

    // 2. File Upload Box Logic
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImg = document.getElementById('previewImg');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const removeUploadBtn = document.getElementById('removeUploadBtn');

    if (uploadBox && fileInput) {
        uploadBox.addEventListener('click', () => fileInput.click());
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('drag-over');
        });
        uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('drag-over'));
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) handleFileSelect(fileInput.files[0]);
        });
    }

    const handleFileSelect = (file) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (file && allowedTypes.includes(file.type) && file.size <= 5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg) previewImg.src = e.target.result;
                if (previewName) previewName.textContent = file.name;
                const sizeKB = (file.size / 1024).toFixed(1);
                if (previewSize) previewSize.textContent = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                if (uploadPreview) uploadPreview.style.display = 'flex';
                if (uploadBox) uploadBox.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else {
            if (fileInput) fileInput.value = '';
            Swal.fire('Error', 'Mohon unggah gambar JPG, PNG, atau WEBP dengan ukuran maksimal 5 MB.', 'error');
        }
    };

    removeUploadBtn?.addEventListener('click', () => {
        fileInput.value = '';
        if (previewImg) previewImg.src = '';
        if (uploadPreview) uploadPreview.style.display = 'none';
        if (uploadBox) uploadBox.style.display = 'flex';
    });

    // 3. EMSIFA API Wilayah Indonesia (Cascading Dropdowns)
    const urlProvinsi = "https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json";
    const provinsiSelect = document.getElementById("provinsiLaporan");
    const kotaSelect = document.getElementById("kotaLaporan");
    const kecamatanSelect = document.getElementById("kecamatanLaporan");

    const setLocationFallback = () => {
        const fallbackOption = '<option value="manual" selected>Mengikuti alamat lengkap</option>';
        if (provinsiSelect) {
            provinsiSelect.innerHTML = fallbackOption;
            provinsiSelect.disabled = false;
        }
        if (kotaSelect) {
            kotaSelect.innerHTML = fallbackOption;
            kotaSelect.disabled = false;
        }
        if (kecamatanSelect) {
            kecamatanSelect.innerHTML = fallbackOption;
            kecamatanSelect.disabled = false;
        }
    };

    // Load Provinces
    fetch(urlProvinsi)
        .then(response => response.json())
        .then(provinces => {
            provinsiSelect.innerHTML = '<option value="" disabled selected>Pilih Provinsi...</option>';
            provinces.forEach(provinsi => {
                const option = document.createElement("option");
                option.value = provinsi.id;
                option.textContent = provinsi.name;
                provinsiSelect.appendChild(option);
            });
        }).catch(err => {
            console.error("Error loading provinces:", err);
            setLocationFallback();
        });

    // Province changed -> Load Cities
    provinsiSelect.addEventListener("change", (e) => {
        const idProvinsi = e.target.value;
        kotaSelect.disabled = true;
        kecamatanSelect.disabled = true;
        kotaSelect.innerHTML = '<option value="" disabled selected>Memuat Kota...</option>';
        kecamatanSelect.innerHTML = '<option value="" disabled selected>Pilih Kota Dahulu</option>';

        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${idProvinsi}.json`)
            .then(response => response.json())
            .then(regencies => {
                kotaSelect.innerHTML = '<option value="" disabled selected>Pilih Kota/Kabupaten...</option>';
                regencies.forEach(kota => {
                    const option = document.createElement("option");
                    option.value = kota.id;
                    option.textContent = kota.name;
                    kotaSelect.appendChild(option);
                });
                kotaSelect.disabled = false;
            }).catch(err => {
                console.error("Error loading cities:", err);
                setLocationFallback();
            });
    });

    // City changed -> Load Districts
    kotaSelect.addEventListener("change", (e) => {
        const idKota = e.target.value;
        kecamatanSelect.disabled = true;
        kecamatanSelect.innerHTML = '<option value="" disabled selected>Memuat Kecamatan...</option>';

        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${idKota}.json`)
            .then(response => response.json())
            .then(districts => {
                kecamatanSelect.innerHTML = '<option value="" disabled selected>Pilih Kecamatan...</option>';
                districts.forEach(kec => {
                    const option = document.createElement("option");
                    option.value = kec.id;
                    option.textContent = kec.name;
                    kecamatanSelect.appendChild(option);
                });
                kecamatanSelect.disabled = false;
            }).catch(err => {
                console.error("Error loading districts:", err);
                setLocationFallback();
            });
    });

    // 4. Leaflet Geolocation Map Integration
    let defaultLat = -6.917464;
    let defaultLng = 107.619123; // Bandung default

    const userLatStr = localStorage.getItem('userLat');
    const userLngStr = localStorage.getItem('userLng');
    
    if (userLatStr && userLngStr) {
        defaultLat = parseFloat(userLatStr);
        defaultLng = parseFloat(userLngStr);
    }

    const valLat = document.getElementById('valLat');
    const valLng = document.getElementById('valLng');
    const latInput = document.getElementById('latInput');
    const lngInput = document.getElementById('lngInput');

    const updateCoordsDisplay = (lat, lng) => {
        const fixedLat = Number(lat).toFixed(6);
        const fixedLng = Number(lng).toFixed(6);
        if (valLat) valLat.textContent = fixedLat;
        if (valLng) valLng.textContent = fixedLng;
        if (latInput) latInput.value = fixedLat;
        if (lngInput) lngInput.value = fixedLng;
    };
    
    updateCoordsDisplay(defaultLat, defaultLng);
    
    let map = null;
    let marker = null;
    if (window.L && document.getElementById('map')) {
        map = L.map('map', {
            center: [defaultLat, defaultLng],
            zoom: 15,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const orangeIcon = L.divIcon({
            className: 'custom-orange-pin',
            html: '<div style="background-color: #FF6B00; width: 14px; height: 14px; border: 2.5px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 8px rgba(255, 107, 0, 0.65);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        marker = L.marker([defaultLat, defaultLng], {
            draggable: true,
            icon: orangeIcon
        }).addTo(map);

        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            updateCoordsDisplay(pos.lat, pos.lng);
        });

        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            updateCoordsDisplay(e.latlng.lat, e.latlng.lng);
        });
    }

    const btnGps = document.getElementById('btnGps');
    btnGps?.addEventListener('click', () => {
        btnGps.innerHTML = '<i data-lucide="loader" class="spin-icon"></i> Mencari...';
        if (window.lucide) window.lucide.createIcons();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    if (map && marker) {
                        map.setView([lat, lng], 16);
                        marker.setLatLng([lat, lng]);
                    }
                    updateCoordsDisplay(lat, lng);
                    localStorage.setItem('userLat', lat);
                    localStorage.setItem('userLng', lng);
                    btnGps.innerHTML = '<i data-lucide="check"></i> Terdeteksi';
                    if (window.lucide) window.lucide.createIcons();
                    setTimeout(() => {
                        btnGps.innerHTML = '<i data-lucide="crosshair"></i> GPS Aktif';
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                },
                () => {
                    Swal.fire('Peringatan', 'Akses lokasi tidak diizinkan atau tidak tersedia.', 'warning');
                    btnGps.innerHTML = '<i data-lucide="crosshair"></i> GPS Aktif';
                    if (window.lucide) window.lucide.createIcons();
                }
            );
        } else {
            Swal.fire('Error', 'Browser Anda tidak mendukung fitur Geolocation.', 'error');
            btnGps.innerHTML = '<i data-lucide="crosshair"></i> GPS Aktif';
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // 5. Handle Form Submission
    const laporanForm = document.getElementById('laporanForm');
    
    const getRequiredValue = (id, label) => {
        const element = document.getElementById(id);
        const value = element ? element.value.trim() : '';
        if (!value) throw new Error(`${label} wajib diisi.`);
        return value;
    };

    const getSelectedText = (select, label) => {
        if (!select || select.selectedIndex < 0 || !select.value) {
            throw new Error(`${label} wajib dipilih.`);
        }
        return select.options[select.selectedIndex].text;
    };

    laporanForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userEmail = sessionStorage.getItem('userEmail');
        if (!userEmail) {
            Swal.fire('Sesi Habis', 'Silakan login kembali.', 'error');
            return;
        }

        if (!fileInput || fileInput.files.length === 0) {
            Swal.fire('Peringatan', 'Harap unggah foto bukti kerusakan.', 'warning');
            return;
        }

        const formData = new FormData();
        try {
            formData.append('title', getRequiredValue('judulLaporan', 'Judul pelaporan'));
            formData.append('address', getRequiredValue('alamatLengkap', 'Alamat lengkap lokasi'));
            formData.append('category', getRequiredValue('kategoriKerusakan', 'Kategori aduan'));
            formData.append('province', getSelectedText(provinsiSelect, 'Provinsi'));
            formData.append('city', getSelectedText(kotaSelect, 'Kota / Kabupaten'));
            formData.append('district', getSelectedText(kecamatanSelect, 'Kecamatan'));
            formData.append('hazard_level', getRequiredValue('tingkatKeparahan', 'Tingkat keparahan'));
            formData.append('dimensions', getRequiredValue('estimasiUkuran', 'Estimasi dimensi'));
            formData.append('description', getRequiredValue('deskripsiKerusakan', 'Deskripsi masalah'));
        } catch (validationError) {
            Swal.fire('Data Belum Lengkap', validationError.message, 'warning');
            return;
        }

        formData.append('lat', latInput ? latInput.value : String(defaultLat));
        formData.append('lng', lngInput ? lngInput.value : String(defaultLng));
        formData.append('photo', fileInput.files[0]);

        // Loading state
        const btnSubmit = document.getElementById('btnSubmit');
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i data-lucide="loader" class="spin-icon"></i> Mengirim...';
        if (window.lucide) window.lucide.createIcons();

        try {
            const response = await fetchWithAuth('/api/reports/submit', {
                method: 'POST',
                body: formData
            });
            if (!response) return;

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'Berhasil!',
                    text: `Laporan "${result.title || 'Aduan Anda'}" telah resmi masuk ke dalam sistem verifikasi Dinas Pekerjaan Umum Kota.`,
                    icon: 'success',
                    confirmButtonColor: '#FF6B00'
                }).then(() => {
                    window.location.href = 'riwayat.html';
                });
            } else {
                Swal.fire('Gagal', result.message || 'Terjadi kesalahan saat mengirim laporan', 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            Swal.fire('Error', 'Gagal terhubung ke server', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
            if (window.lucide) window.lucide.createIcons();
        }
    });
});

window.logout = function () {
    if (window.clearAuthSession) window.clearAuthSession();
    if (window.showLogoutNotice) window.showLogoutNotice();
    else window.location.href = 'login.html';
};
