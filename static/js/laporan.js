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
        const style = document.createElement('style');
        style.innerHTML = `
            .custom-premium-popup .leaflet-popup-content-wrapper {
                padding: 0;
                border-radius: 12px;
                overflow: hidden;
            }
            .custom-premium-popup .leaflet-popup-content {
                margin: 0;
                line-height: 1.5;
                width: 240px !important;
            }
            .custom-premium-popup .leaflet-popup-tip-container {
                margin-top: -1px;
            }
            .popup-inner-content {
                padding: 15px;
            }
            .map-wrapper.fullscreen-map {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 999999 !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
            }
            .map-wrapper.fullscreen-map #map {
                height: 100% !important;
                border-radius: 0 !important;
            }
            .map-wrapper.fullscreen-map .location-actions {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 500px;
                z-index: 999999;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            body.map-fullscreen-active {
                overflow: hidden !important;
            }
            body.map-fullscreen-active .header {
                display: none !important;
            }
            .leaflet-control-fullscreen a {
                background: #fff;
                width: 34px;
                height: 34px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333;
                text-decoration: none;
                border-radius: 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                cursor: pointer;
            }
            .leaflet-control-fullscreen a:hover {
                background: #f4f4f4;
            }
            .leaflet-control-fullscreen a svg {
                width: 18px;
                height: 18px;
            }
        `;
        document.head.appendChild(style);

        map = L.map('map', {
            center: [defaultLat, defaultLng],
            zoom: 15,
            zoomControl: true
        });

        // Add Fullscreen Control
        L.Control.Fullscreen = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: function (map) {
                var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fullscreen');
                var button = L.DomUtil.create('a', '', container);
                button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
                button.href = '#';
                button.title = 'Toggle Fullscreen';
                
                L.DomEvent.on(button, 'click', function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    var mapContainer = document.querySelector('.map-wrapper') || document.getElementById('map');
                    if (mapContainer.classList.contains('fullscreen-map')) {
                        mapContainer.classList.remove('fullscreen-map');
                        document.body.classList.remove('map-fullscreen-active');
                        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
                    } else {
                        mapContainer.classList.add('fullscreen-map');
                        document.body.classList.add('map-fullscreen-active');
                        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';
                    }
                    setTimeout(() => map.invalidateSize(), 300);
                });
                
                return container;
            }
        });
        map.addControl(new L.Control.Fullscreen());

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const orangeIcon = L.divIcon({
            className: 'custom-user-pin',
            html: `
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#FF6B00" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#ffffff" stroke-width="1.5"/>
                    <circle cx="12" cy="9.5" r="1.5" fill="#ffffff" />
                </svg>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36]
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

        const getMarkerIcon = (upvotes) => {
            let color = '#10b981'; // Hijau (Sedikit)
            if (upvotes >= 20) {
                color = '#ef4444'; // Merah (Banyak)
            } else if (upvotes >= 5) {
                color = '#facc15'; // Kuning (Sedang)
            }
            
            const svgIcon = `
                <svg width="36" height="36" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#ffffff" stroke-width="1"/>
                </svg>
            `;
            
            return L.divIcon({
                className: 'custom-svg-pin',
                html: svgIcon,
                iconSize: [36, 36],
                iconAnchor: [18, 36], // Point of the pin at the bottom center
                popupAnchor: [0, -32] // Popup opens just above the pin
            });
        };

        // Load waiting reports
        const loadWaitingReports = async () => {
            try {
                const res = await fetch('/api/reports/public/waiting');
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        data.data.forEach(rep => {
                            const icon = getMarkerIcon(rep.upvote_count || 0);
                            const repMarker = L.marker([rep.lat, rep.lng], { icon: icon }).addTo(map);
                            const imageUrl = rep.image_path ? `/static/${rep.image_path}` : 'https://via.placeholder.com/240x120?text=No+Image';
                            const popupContent = `
                                <div style="font-family: 'Inter', sans-serif;">
                                    <div style="height: 120px; width: 100%; position: relative; background-color: #f1f5f9;">
                                        <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto Laporan" onerror="this.onerror=null; this.src='https://via.placeholder.com/240x120?text=No+Image'" />
                                        <div style="position: absolute; top: 10px; right: 10px; background: ${rep.status === 'Proses' ? '#3b82f6' : '#FF6B00'}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;">
                                            ${rep.status || 'Menunggu'}
                                        </div>
                                    </div>
                                    <div class="popup-inner-content">
                                        <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.3;">${rep.title}</h4>
                                        <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">${rep.description}</p>
                                        <div style="font-size: 12px; color: #FF6B00; margin-bottom: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                            ${rep.upvote_count} warga terdampak
                                        </div>
                                        <button onclick="window.upvoteReport('${rep._id}')" 
                                            style="width: 100%; padding: 8px; background: linear-gradient(135deg, #FF6B00, #E63946); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(230, 57, 70, 0.3);">
                                            Saya juga terdampak
                                        </button>
                                    </div>
                                </div>
                            `;
                            repMarker.bindPopup(popupContent, {
                                className: 'custom-premium-popup'
                            });
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to load waiting reports:", err);
            }
        };
        
        loadWaitingReports();
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

window.upvoteReport = async function(reportId) {
    try {
        const response = await fetchWithAuth(`/api/reports/${reportId}/upvote`, {
            method: 'POST'
        });
        
        if (!response) return;
        const result = await response.json();
        
        if (response.ok) {
            Swal.fire({
                title: 'Berhasil!',
                text: 'Laporan Anda telah digabungkan (Upvote sukses). Terima kasih atas partisipasinya.',
                icon: 'success',
                confirmButtonColor: '#FF6B00'
            }).then(() => {
                window.location.href = 'riwayat.html';
            });
        } else {
            Swal.fire('Gagal', result.message || 'Terjadi kesalahan saat melakukan upvote.', 'error');
        }
    } catch (error) {
        console.error('Upvote error:', error);
        Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
};
