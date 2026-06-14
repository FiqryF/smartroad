document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('taskList');
    const notificationPanel = document.getElementById('notificationPanel');
    const profileMenu = document.getElementById('profileMenu');
    const notificationBtn = document.getElementById('notificationBtn');
    const profileBtn = document.getElementById('profileBtn');
    const detailModal = document.getElementById('detailModal');
    const confirmModal = document.getElementById('confirmModal');
    const modalTaskId = document.getElementById('modalTaskId');
    const fileInput = document.getElementById('fileInput');
    const completionNote = document.getElementById('completionNote');
    const uploadContent = document.getElementById('uploadContent');

    let reports = [];
    let mainMap = null;
    let mainMarkers = null;
    let miniMap = null;
    let miniMapMarker = null;

    const escape = window.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char])));

    const getReportId = (report) => report._id || report.id || '';
    const shortId = (report) => {
        const id = getReportId(report);
        return id ? `#RPT-${String(id).slice(-6).toUpperCase()}` : '#RPT';
    };
    const staticPath = (path) => path ? `/static/${String(path).replace(/^\/?static\//, '')}` : '';
    const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const updateIdentity = () => {
        const name = sessionStorage.getItem('userName') || 'Petugas';
        const email = sessionStorage.getItem('userEmail') || '';
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6B00&color=FFFFFF`;

        document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = el.textContent.includes('(') ? `${name} (Petugas)` : name;
        });
        document.querySelectorAll('.avatar-img, .profile-avatar').forEach(img => {
            img.src = avatar;
            img.alt = name;
        });

        const profileStrong = document.querySelector('.profile-summary strong');
        const profileRole = document.querySelector('.profile-summary p');
        const profileEmail = document.querySelector('.profile-detail strong');
        const heroName = document.querySelector('.hero-headline span');

        if (profileStrong) profileStrong.textContent = name;
        if (profileRole) profileRole.textContent = 'Petugas Lapangan';
        if (profileEmail) profileEmail.textContent = email;
        if (heroName) heroName.textContent = name.split(' ')[0] || name;
    };

    const initHeaderInteractions = () => {
        const navbar = document.getElementById('navbar');
        const handleScroll = () => {
            if (!navbar) return;
            navbar.classList.toggle('scrolled', window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();

        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        const drawerOverlay = document.getElementById('drawerOverlay');

        const toggleMobileMenu = () => {
            navMenu?.classList.toggle('active');
            drawerOverlay?.classList.toggle('active');
            const icon = menuToggle?.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', navMenu?.classList.contains('active') ? 'x' : 'menu');
            document.body.style.overflow = navMenu?.classList.contains('active') ? 'hidden' : '';
            if (window.lucide) window.lucide.createIcons();
        };

        menuToggle?.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleMobileMenu();
        });
        drawerOverlay?.addEventListener('click', () => {
            navMenu?.classList.remove('active');
            drawerOverlay?.classList.remove('active');
            document.body.style.overflow = '';
            menuToggle?.querySelector('i')?.setAttribute('data-lucide', 'menu');
            if (window.lucide) window.lucide.createIcons();
        });

        notificationBtn?.addEventListener('click', (event) => {
            event.stopPropagation();
            profileMenu?.classList.remove('active');
            notificationPanel?.classList.toggle('active');
        });
        profileBtn?.addEventListener('click', (event) => {
            event.stopPropagation();
            notificationPanel?.classList.remove('active');
            profileMenu?.classList.toggle('active');
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.notification-panel') && !event.target.closest('#notificationBtn')) {
                notificationPanel?.classList.remove('active');
            }
            if (!event.target.closest('.profile-menu') && !event.target.closest('#profileBtn')) {
                profileMenu?.classList.remove('active');
            }
        });

        document.querySelectorAll('a[href="login.html"], .profile-menu .btn-secondary').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                if (window.clearAuthSession) window.clearAuthSession();
                window.location.href = 'login.html';
            });
        });
    };

    const initMap = () => {
        if (!window.L || !document.getElementById('main-map')) return;
        mainMap = L.map('main-map').setView([-7.29, 112.74], 11.5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mainMap);
        mainMarkers = L.featureGroup().addTo(mainMap);
    };

    const renderMapMarkers = () => {
        if (!mainMap || !mainMarkers) return;
        mainMarkers.clearLayers();

        reports.forEach(report => {
            const lat = Number(report.lat);
            const lng = Number(report.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const id = getReportId(report);
            L.marker([lat, lng])
                .bindPopup(`
                    <div style="font-family: Inter, sans-serif; min-width: 210px;">
                        <strong style="color: #FF6B00;">${escape(shortId(report))}</strong><br>
                        <strong>${escape(report.title || 'Laporan')}</strong>
                        <p style="margin: 6px 0; color: #5A626A;">${escape(report.address || '-')}</p>
                        <button onclick="openDetailModal('${escape(id)}')" style="background: #FF6B00; border: none; color: white; padding: 0.4rem 0.75rem; border-radius: 4px; font-weight: 700; width: 100%; cursor: pointer;">Lihat Detail</button>
                    </div>
                `)
                .addTo(mainMarkers);
        });

        if (mainMarkers.getLayers().length > 0) {
            mainMap.fitBounds(mainMarkers.getBounds(), { padding: [30, 30], maxZoom: 15 });
        }
    };

    const renderNotifications = () => {
        const panelList = notificationPanel?.querySelector('.panel-list');
        if (!panelList) return;

        const activeReports = reports.filter(report => report.status === 'Proses');
        if (activeReports.length === 0) {
            panelList.innerHTML = '<li>Tidak ada tugas aktif baru.</li>';
            return;
        }

        panelList.innerHTML = activeReports.slice(0, 5).map(report => `
            <li><strong>${escape(formatDate(report.assigned_at || report.created_at))}</strong> - Tugas ${escape(shortId(report))}: ${escape(report.title || 'Laporan')}</li>
        `).join('');
    };

    const renderTasks = () => {
        if (!taskList) return;

        if (reports.length === 0) {
            taskList.innerHTML = `
                <div class="task-card">
                    <div class="task-card-body">
                        <div class="task-card-top">
                            <span class="task-id">Tidak ada tugas aktif</span>
                            <span class="task-status status-processing">Kosong</span>
                        </div>
                        <ul class="task-details-list">
                            <li><i data-lucide="check-circle"></i> <span>Belum ada laporan yang ditugaskan kepada Anda.</span></li>
                        </ul>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        taskList.innerHTML = reports.map(report => {
            const id = escape(getReportId(report));
            const status = report.status === 'Selesai' ? 'Selesai' : 'Dalam Pengerjaan';
            const image = staticPath(report.image_path) || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800';
            const disabled = report.status === 'Selesai' ? 'disabled style="opacity: 0.55; cursor: not-allowed;"' : '';

            return `
                <div class="task-card">
                    <div class="task-card-image">
                        <img src="${escape(image)}" alt="Foto laporan">
                    </div>
                    <div class="task-card-body">
                        <div class="task-card-top">
                            <span class="task-id">${escape(shortId(report))}</span>
                            <span class="task-status status-processing">${escape(status)}</span>
                        </div>
                        <ul class="task-details-list">
                            <li><i data-lucide="map-pin"></i> <span>${escape(report.address || '-')}</span></li>
                            <li><i data-lucide="alert-triangle"></i> <span>${escape(report.title || report.category || 'Laporan kerusakan')}</span></li>
                            <li><i data-lucide="clock"></i> <span>Ditugaskan: ${escape(formatDate(report.assigned_at || report.created_at))}</span></li>
                        </ul>
                        <div class="task-actions">
                            <button class="btn btn-outline-dark" onclick="openDetailModal('${id}')">
                                <i data-lucide="eye"></i> Detail
                            </button>
                            <button class="btn btn-primary" onclick="openConfirmModal('${id}')" ${disabled}>
                                <i data-lucide="check"></i> Selesai
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    };

    const findReport = (id) => reports.find(report => getReportId(report) === id);

    window.openDetailModal = (id) => {
        const report = findReport(id);
        if (!report) return;

        document.getElementById('detailTaskIdText').textContent = escape(shortId(report));
        document.getElementById('detailImage').src = staticPath(report.image_path) || '';
        document.getElementById('detailCategory').textContent = report.category || '-';
        document.getElementById('detailDesc').textContent = report.description || '-';
        document.getElementById('detailLocation').textContent = report.address || '-';
        document.getElementById('detailReporterName').textContent = report.reporter_email || '-';
        document.getElementById('detailReportTime').textContent = formatDate(report.created_at);

        const confirmBtn = document.getElementById('detailConfirmBtn');
        confirmBtn.onclick = () => {
            closeDetailModal();
            openConfirmModal(id);
        };
        confirmBtn.disabled = report.status === 'Selesai';
        confirmBtn.style.opacity = report.status === 'Selesai' ? '0.55' : '1';

        detailModal?.classList.add('active');

        const coords = [Number(report.lat), Number(report.lng)];
        setTimeout(() => {
            if (!window.L || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return;
            if (!miniMap) {
                miniMap = L.map('mini-map', { zoomControl: false, attributionControl: false }).setView(coords, 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(miniMap);
                miniMapMarker = L.marker(coords).addTo(miniMap);
            } else {
                miniMap.setView(coords, 15);
                miniMapMarker.setLatLng(coords);
            }
            miniMap.invalidateSize();
        }, 250);
    };

    window.closeDetailModal = () => detailModal?.classList.remove('active');

    window.openConfirmModal = (id) => {
        const report = findReport(id);
        if (!report || report.status === 'Selesai') return;
        modalTaskId.value = shortId(report);
        modalTaskId.dataset.reportId = id;
        confirmModal?.classList.add('active');
    };

    window.closeConfirmModal = () => {
        confirmModal?.classList.remove('active');
        if (fileInput) fileInput.value = '';
        if (completionNote) completionNote.value = '';
        if (uploadContent) {
            uploadContent.innerHTML = `
                <i data-lucide="camera"></i>
                <span style="font-weight: 600; color: var(--asphalt-dark);">Klik atau Drag Foto Disini</span>
                <span style="font-size: 0.75rem;">Format JPG/PNG/WEBP, Maksimal 5MB</span>
            `;
        }
        if (window.lucide) window.lucide.createIcons();
    };

    window.handleFileChange = () => {
        if (!fileInput?.files?.[0] || !uploadContent) return;
        uploadContent.innerHTML = `
            <i data-lucide="check-circle" style="color: var(--success-green); width: 32px; height: 32px;"></i>
            <span style="font-weight: 600; color: var(--success-green);">${escape(fileInput.files[0].name)}</span>
            <span style="font-size: 0.75rem;">File terpilih dan siap dikirim</span>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    window.submitCompletionForm = async (event) => {
        event.preventDefault();
        const reportId = modalTaskId?.dataset.reportId;
        const file = fileInput?.files?.[0];
        if (!reportId) return alert('ID laporan tidak valid.');
        if (!file) return alert('Foto bukti perbaikan wajib diunggah.');

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
            return alert('Foto harus JPG, PNG, atau WEBP dengan ukuran maksimal 5 MB.');
        }

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('completion_note', completionNote?.value || '');

        try {
            const response = await fetchWithAuth(`/api/reports/${encodeURIComponent(reportId)}/complete`, {
                method: 'POST',
                body: formData
            });
            if (!response) return;

            const data = await response.json();
            if (!response.ok) return alert(data.message || 'Gagal mengirim konfirmasi selesai.');

            alert(data.message || 'Konfirmasi penyelesaian berhasil dikirim.');
            closeConfirmModal();
            await loadAssignedReports();
        } catch (error) {
            console.error(error);
            alert('Gagal terhubung ke server.');
        }
    };

    async function loadAssignedReports() {
        try {
            const response = await fetchWithAuth('/api/reports/assigned');
            if (!response) return;

            const data = await response.json();
            reports = response.ok && Array.isArray(data.data) ? data.data : [];
            renderTasks();
            renderMapMarkers();
            renderNotifications();
        } catch (error) {
            console.error('Gagal memuat tugas petugas:', error);
            if (taskList) {
                taskList.innerHTML = '<div class="task-card"><div class="task-card-body">Gagal memuat penugasan.</div></div>';
            }
        }
    }

    updateIdentity();
    initHeaderInteractions();
    initMap();
    loadAssignedReports();
    if (window.lucide) window.lucide.createIcons();
});
