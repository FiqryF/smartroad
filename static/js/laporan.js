document.addEventListener('DOMContentLoaded', () => {
    const escape = window.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char])));

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // --- 0. DYNAMIC PROFILE & NOTIFICATION LOGIC ---
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
                    updateProfileGamificationSummary(profile);

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

    document.querySelectorAll('[data-profile-link]').forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = button.dataset.profileLink || 'profile.html';
        });
    });

    document.querySelectorAll('[data-logout-button]').forEach(button => {
        button.addEventListener('click', () => window.logout());
    });

    document.querySelectorAll('[data-cancel-report]').forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    });

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
    let publicReports = [];
    window.smartRoadSupportedReportIds = window.smartRoadSupportedReportIds || new Set();
    window.smartRoadPublicReports = window.smartRoadPublicReports || [];
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
            .crowd-map-legend {
                background: rgba(255, 255, 255, 0.96);
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
                color: #0f172a;
                font-size: 0.68rem;
                line-height: 1.2;
                padding: 8px 10px;
                min-width: 145px;
            }
            .crowd-map-legend strong {
                display: block;
                font-size: 0.68rem;
                font-weight: 900;
                letter-spacing: 0.05em;
                margin-bottom: 6px;
                text-transform: uppercase;
            }
            .crowd-map-legend span {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 5px;
                white-space: nowrap;
            }
            .crowd-map-dot {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                border: 2px solid #ffffff;
                box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.16);
                flex: 0 0 auto;
            }
            .report-detail-modal {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(15, 23, 42, 0.58);
                backdrop-filter: blur(5px);
            }
            .report-detail-modal.active {
                display: flex;
            }
            .report-detail-card {
                width: min(900px, 100%);
                max-height: calc(100vh - 32px);
                background: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28);
                display: flex;
                align-items: stretch;
            }
            .report-detail-card.is-own-report {
                border: 2px solid #2563eb;
            }
            .report-detail-card.is-own-report .report-detail-body {
                background: linear-gradient(180deg, #eff6ff 0%, #ffffff 42%);
            }
            .report-detail-card.is-supported-report {
                border: 2px solid #94a3b8;
            }
            .report-detail-card.is-supported-report .report-detail-body {
                background: linear-gradient(180deg, #f8fafc 0%, #ffffff 42%);
            }
            .report-detail-photo {
                width: min(46%, 420px);
                flex: 0 0 min(46%, 420px);
                min-height: 460px;
                background: #0f172a;
                border-right: 1px solid #e2e8f0;
                border-bottom: none;
                display: block;
                overflow: hidden;
            }
            .report-detail-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center center;
                display: block;
            }
            .report-detail-body {
                padding: 18px;
                overflow: visible;
                min-width: 0;
                flex: 1 1 auto;
            }
            .report-detail-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 8px;
            }
            .report-detail-kicker {
                color: #FF6B00;
                font-size: 0.68rem;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.09em;
                margin-bottom: 5px;
            }
            .report-detail-card.is-own-report .report-detail-kicker {
                color: #2563eb;
            }
            .report-detail-card.is-supported-report .report-detail-kicker {
                color: #475569;
            }
            .report-detail-title {
                color: #0f172a;
                font-size: 1.15rem;
                font-weight: 900;
                line-height: 1.25;
                margin: 0;
            }
            .report-detail-close {
                width: 34px;
                height: 34px;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                color: #64748b;
                border-radius: 8px;
                cursor: pointer;
                display: grid;
                place-items: center;
                flex: 0 0 auto;
            }
            .report-detail-desc {
                color: #475569;
                font-size: 0.84rem;
                line-height: 1.35;
                margin: 0 0 10px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .report-detail-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-bottom: 10px;
            }
            .report-detail-stat {
                border: 1px solid #e2e8f0;
                background: #f8fafc;
                border-radius: 7px;
                padding: 8px 10px;
            }
            .report-detail-stat span {
                display: block;
                color: #64748b;
                font-size: 0.62rem;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.07em;
                margin-bottom: 3px;
            }
            .report-detail-stat strong {
                color: #0f172a;
                font-size: 0.82rem;
                font-weight: 900;
                line-height: 1.25;
                word-break: break-word;
            }
            .report-detail-address {
                border-top: 1px solid #e2e8f0;
                padding-top: 8px;
                color: #475569;
                font-size: 0.78rem;
                line-height: 1.3;
                margin-bottom: 10px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .report-detail-action {
                width: 100%;
                border: none;
                border-radius: 7px;
                background: #FF6B00;
                color: #ffffff;
                min-height: 38px;
                font-weight: 900;
                cursor: pointer;
            }
            .report-detail-action:hover {
                background: #E05E00;
            }
            .report-detail-action[disabled] {
                background: #e2e8f0;
                color: #64748b;
                cursor: not-allowed;
            }
            .report-detail-card.is-own-report .report-detail-action[disabled] {
                background: #2563eb;
                color: #ffffff;
            }
            .report-detail-card.is-supported-report .report-detail-action[disabled] {
                background: #64748b;
                color: #ffffff;
            }
            @media (max-width: 640px) {
                .report-detail-card {
                    display: flex;
                    flex-direction: column;
                    width: min(520px, 100%);
                }
                .report-detail-photo {
                    width: 100%;
                    flex-basis: auto;
                    height: 190px;
                    min-height: 190px;
                    border-right: none;
                    border-bottom: 1px solid #e2e8f0;
                }
                .report-detail-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
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

        L.Control.CrowdLegend = L.Control.extend({
            options: {
                position: 'bottomleft'
            },
            onAdd: function () {
                const container = L.DomUtil.create('div', 'crowd-map-legend');
                container.innerHTML = `
                    <strong>Status Marker</strong>
                    <span><i class="crowd-map-dot" style="background:#2563eb"></i> Laporan Anda</span>
                    <span><i class="crowd-map-dot" style="background:#64748b"></i> Sudah terdampak</span>
                    <span><i class="crowd-map-dot" style="background:#10b981"></i> Prioritas normal</span>
                    <span><i class="crowd-map-dot" style="background:#f59e0b"></i> Prioritas sedang</span>
                    <span><i class="crowd-map-dot" style="background:#f97316"></i> Prioritas tinggi</span>
                    <span><i class="crowd-map-dot" style="background:#ef4444"></i> Mendesak</span>
                `;
                L.DomEvent.disableClickPropagation(container);
                return container;
            }
        });
        map.addControl(new L.Control.CrowdLegend());

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

        const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
            const toRad = value => value * Math.PI / 180;
            const earthRadius = 6371000;
            const dLat = toRad(lat2 - lat1);
            const dLng = toRad(lng2 - lng1);
            const a = Math.sin(dLat / 2) ** 2
                + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
            return 2 * earthRadius * Math.asin(Math.sqrt(a));
        };

        const reportModal = document.createElement('div');
        reportModal.id = 'reportDetailModal';
        reportModal.className = 'report-detail-modal';
        reportModal.setAttribute('aria-hidden', 'true');
        document.body.appendChild(reportModal);

        const closeReportModal = () => {
            reportModal.classList.remove('active');
            reportModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        window.addEventListener('pageshow', () => {
            closeReportModal();
        });

        reportModal.addEventListener('click', (event) => {
            if (event.target === reportModal || event.target.closest('[data-close-report-modal]')) {
                closeReportModal();
            }
        });

        const openReportDetailModal = (report, distance = 0) => {
            const affectedCount = report.affected_count || ((report.upvote_count || 0) + 1);
            const priorityLevel = report.priority_level || 'Normal';
            const supportCount = Number(report.upvote_count || 0) || Math.max(affectedCount - 1, 0);
            const imageUrl = report.image_path ? `/static/${report.image_path}` : 'https://via.placeholder.com/720x360?text=No+Image';
            const isOwnReport = Boolean(report.is_own_report);
            const isSupported = Boolean(report.is_supported_by_current_user || report.clustered_by_current_user);
            const detailKicker = isOwnReport
                ? 'Laporan Anda'
                : (isSupported ? 'Laporan yang Anda dukung' : 'Detail laporan publik');
            const actionHtml = isOwnReport
                ? '<button type="button" class="report-detail-action" disabled>Laporan ini dibuat oleh Anda</button>'
                : (isSupported
                    ? '<button type="button" class="report-detail-action" disabled>Anda sudah tercatat terdampak</button>'
                    : `<button type="button" class="report-detail-action" data-modal-upvote-report-id="${escape(report._id)}">Saya juga terdampak</button>`);
            const modalClass = isOwnReport ? ' is-own-report' : (isSupported ? ' is-supported-report' : '');
            reportModal.innerHTML = `
                <div class="report-detail-card${modalClass}" role="dialog" aria-modal="true" aria-label="Detail laporan terdekat">
                    <div class="report-detail-photo">
                        <img src="${escape(imageUrl)}" alt="Foto laporan" onerror="this.onerror=null; this.src='https://via.placeholder.com/720x360?text=No+Image';">
                    </div>
                    <div class="report-detail-body">
                        <div class="report-detail-top">
                            <div>
                                <div class="report-detail-kicker">${detailKicker}</div>
                                <h3 class="report-detail-title">${escape(report.title || 'Laporan')}</h3>
                            </div>
                            <button type="button" class="report-detail-close" data-close-report-modal aria-label="Tutup detail laporan">x</button>
                        </div>
                        <p class="report-detail-desc">${escape(report.description || '-')}</p>
                        <div class="report-detail-grid">
                            <div class="report-detail-stat"><span>Warga terdampak</span><strong>${affectedCount} orang</strong></div>
                            <div class="report-detail-stat"><span>Prioritas</span><strong>${escape(priorityLevel)}</strong></div>
                            <div class="report-detail-stat"><span>Status</span><strong>${escape(report.status || 'Menunggu')}</strong></div>
                            <div class="report-detail-stat"><span>Jarak dari titik Anda</span><strong>${Math.round(distance)} meter</strong></div>
                            <div class="report-detail-stat"><span>Dukungan warga</span><strong>${supportCount} warga tambahan</strong></div>
                            <div class="report-detail-stat"><span>Koordinat</span><strong>${escape(Number(report.lat).toFixed(5))}, ${escape(Number(report.lng).toFixed(5))}</strong></div>
                        </div>
                        <div class="report-detail-address">
                            <strong>Alamat:</strong> ${escape(report.address || '-')}
                        </div>
                        ${actionHtml}
                    </div>
                </div>
            `;
            reportModal.classList.add('active');
            reportModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            reportModal.querySelector('[data-modal-upvote-report-id]')?.addEventListener('click', (event) => {
                window.upvoteReport(event.currentTarget.dataset.modalUpvoteReportId);
            });
        };

        const getMarkerIcon = (report) => {
            const affectedCount = report.affected_count || ((report.upvote_count || 0) + 1);
            const priorityLevel = report.priority_level || '';
            let color = '#10b981'; // Hijau (Sedikit)
            if (report.is_own_report) {
                color = '#2563eb';
            } else if (report.is_supported_by_current_user || report.clustered_by_current_user) {
                color = '#64748b';
            } else if (priorityLevel === 'Mendesak' || affectedCount >= 10) {
                color = '#ef4444';
            } else if (priorityLevel === 'Tinggi' || affectedCount >= 5) {
                color = '#f97316';
            } else if (priorityLevel === 'Sedang' || affectedCount >= 3) {
                color = '#f59e0b';
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
                const token = sessionStorage.getItem('jwtToken');
                const publicRequestOptions = token ? {
                    headers: { Authorization: `Bearer ${token}` }
                } : undefined;
                const [publicResponse, userReportsResponse] = await Promise.all([
                    fetch('/api/reports/public/waiting', publicRequestOptions),
                    token ? fetch('/api/reports/user', publicRequestOptions).catch(() => null) : Promise.resolve(null)
                ]);

                const ownReportIds = new Set();
                if (userReportsResponse && userReportsResponse.ok) {
                    const userReportsPayload = await userReportsResponse.json();
                    const userEmail = (sessionStorage.getItem('userEmail') || '').trim().toLowerCase();
                    (userReportsPayload.data || []).forEach(item => {
                        const id = String(item._id || '');
                        const reporterEmail = String(item.reporter_email || '').trim().toLowerCase();
                        if (!id) return;
                        if (reporterEmail === userEmail) ownReportIds.add(id);
                        if (item.clustered_by_current_user || (Array.isArray(item.upvoted_by) && item.upvoted_by.map(email => String(email || '').trim().toLowerCase()).includes(userEmail))) {
                            window.smartRoadSupportedReportIds.add(id);
                        }
                    });
                }

                const res = publicResponse;
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        const currentUserEmail = (sessionStorage.getItem('userEmail') || '').trim().toLowerCase();
                        const reports = data.data.map(rep => {
                            const reporterEmail = String(rep.reporter_email || '').trim().toLowerCase();
                            const upvotedBy = Array.isArray(rep.upvoted_by) ? rep.upvoted_by.map(email => String(email || '').trim().toLowerCase()) : [];
                            return {
                                ...rep,
                                is_own_report: Boolean(rep.is_own_report) || ownReportIds.has(String(rep._id || '')) || (currentUserEmail && reporterEmail === currentUserEmail),
                                is_supported_by_current_user: Boolean(rep.is_supported_by_current_user || rep.clustered_by_current_user) || window.smartRoadSupportedReportIds.has(String(rep._id || '')) || (currentUserEmail && upvotedBy.includes(currentUserEmail))
                            };
                        });

                        reports.forEach(rep => {
                            const affectedCount = rep.affected_count || ((rep.upvote_count || 0) + 1);
                            const priorityLevel = rep.priority_level || 'Normal';
                            const icon = getMarkerIcon(rep);
                            const repMarker = L.marker([rep.lat, rep.lng], { icon: icon }).addTo(map);
                            const tooltipPrefix = rep.is_own_report
                                ? 'Laporan Anda'
                                : (rep.is_supported_by_current_user || rep.clustered_by_current_user ? 'Anda terdampak' : `${affectedCount} terdampak`);
                            repMarker.bindTooltip(`${tooltipPrefix} - ${priorityLevel}`, {
                                direction: 'top',
                                offset: [0, -28],
                                opacity: 0.9
                            });
                            repMarker.on('click', () => {
                                const userPos = marker?.getLatLng();
                                const distance = userPos
                                    ? calculateDistanceMeters(userPos.lat, userPos.lng, Number(rep.lat), Number(rep.lng))
                                    : 0;
                                openReportDetailModal(rep, distance);
                            });
                        });
                        publicReports = reports;
                        window.smartRoadPublicReports = reports;
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
                if (result.clustered) {
                    Swal.fire({
                        title: 'Laporan Digabungkan',
                        text: `Sudah ada laporan serupa dalam radius 20 meter. Foto dan deskripsi Anda tersimpan sebagai bukti tambahan. Dukungan Anda membuat laporan "${result.title || 'Aduan terkait'}" menjadi prioritas ${result.priority_level || 'lebih tinggi'} dengan ${result.affected_count || 'beberapa'} warga terdampak.`,
                        icon: 'success',
                        confirmButtonColor: '#FF6B00'
                    }).then(() => {
                        window.location.href = 'riwayat.html';
                    });
                } else {
                    Swal.fire({
                        title: 'Berhasil!',
                        text: `Laporan "${result.title || 'Aduan Anda'}" telah resmi masuk ke dalam sistem verifikasi Dinas Pekerjaan Umum Kota.`,
                        icon: 'success',
                        confirmButtonColor: '#FF6B00'
                    }).then(() => {
                        window.location.href = 'riwayat.html';
                    });
                }
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
    const targetId = String(reportId || '');
    const escapedTargetId = window.CSS && CSS.escape ? CSS.escape(targetId) : targetId.replace(/"/g, '\\"');
    const activeButton = document.querySelector(`[data-modal-upvote-report-id="${escapedTargetId}"]`);
    const markAsSupported = () => {
        window.smartRoadSupportedReportIds = window.smartRoadSupportedReportIds || new Set();
        window.smartRoadSupportedReportIds.add(targetId);
        if (activeButton) {
            activeButton.disabled = true;
            activeButton.removeAttribute('data-modal-upvote-report-id');
            activeButton.textContent = 'Anda sudah tercatat terdampak';
            activeButton.closest('.report-detail-card')?.classList.add('is-supported-report');
        }
    };

    if (activeButton) {
        activeButton.disabled = true;
        activeButton.textContent = 'Mencatat dukungan...';
    }

    try {
        const response = await fetchWithAuth(`/api/reports/${reportId}/upvote`, {
            method: 'POST'
        });
        
        if (!response) {
            if (activeButton) {
                activeButton.disabled = false;
                activeButton.textContent = 'Saya juga terdampak';
            }
            return;
        }
        const result = await response.json();
        
        if (response.ok) {
            markAsSupported();
            window.smartRoadPublicReports = (window.smartRoadPublicReports || []).map(report => String(report._id || '') === targetId
                ? {
                    ...report,
                    is_supported_by_current_user: true,
                    upvote_count: Number(report.upvote_count || 0) + 1,
                    affected_count: result.affected_count || report.affected_count,
                    priority_level: result.priority_level || report.priority_level
                }
                : report
            );
            Swal.fire({
                title: 'Berhasil!',
                text: `Anda sudah tercatat sebagai warga terdampak. Kini ada ${result.affected_count || 'lebih banyak'} warga terdampak.`,
                icon: 'success',
                confirmButtonColor: '#FF6B00',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            const alreadySupported = /sudah|melaporkan|upvote/i.test(result.message || '');
            if (alreadySupported) {
                markAsSupported();
                Swal.close();
                return;
            }
            if (activeButton) {
                activeButton.disabled = false;
                activeButton.textContent = 'Saya juga terdampak';
            }
            Swal.fire('Gagal', result.message || 'Terjadi kesalahan saat melakukan upvote.', 'error');
        }
    } catch (error) {
        console.error('Upvote error:', error);
        if (activeButton) {
            activeButton.disabled = false;
            activeButton.textContent = 'Saya juga terdampak';
        }
        Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
};
