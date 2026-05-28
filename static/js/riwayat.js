document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Dynamic Profile Initialization
    const initDynamicProfile = async () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');

        if (isLoggedIn !== 'true') {
            window.location.href = 'login.html';
            return;
        }

        document.querySelectorAll('.user-name').forEach(el => {
            if (userName) el.textContent = userName;
        });

        const popupName = document.getElementById('popupName');
        const popupEmail = document.getElementById('popupEmail');
        if (popupName && userName) popupName.textContent = userName;
        if (popupEmail && userEmail) popupEmail.textContent = userEmail;

        if (userEmail) {
            try {
                const response = await fetch(`http://127.0.0.1:5000/api/auth/api/profile/user-profile?email=${encodeURIComponent(userEmail)}`);
                const resData = await response.json();
                if (response.ok && resData.data) {
                    const profile = resData.data;
                    const profilePic = profile.profile_pic === 'default-profile.png'
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nama)}&background=FF6B00&color=FFFFFF`
                        : `static/${profile.profile_pic}`;

                    document.querySelectorAll('.avatar-img, .profile-avatar').forEach(img => {
                        img.src = profilePic;
                    });
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            }
        }
    };
    initDynamicProfile();

    // Setup Header scrolling, Menu toggles, and notification panels (Same as other pages)
    const navbar = document.getElementById('navbar') || document.querySelector('.header');
    if(navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
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

    // Fetch and Display Reports
    const historyGrid = document.getElementById('historyGrid');
    const userEmail = localStorage.getItem('userEmail');
    let allReports = [];

    const fetchReports = async () => {
        if (!userEmail) return;
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/reports/user?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            if (response.ok && data.data) {
                allReports = data.data;
                renderReports(allReports);
                updateStats(allReports);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        }
    };

    const renderReports = (reports) => {
        if (!historyGrid) return;
        
        historyGrid.innerHTML = '';
        
        if (reports.length === 0) {
            document.getElementById('emptyState').style.display = 'flex';
            return;
        }
        
        document.getElementById('emptyState').style.display = 'none';

        reports.forEach(report => {
            const date = new Date(report.created_at).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // Map status to badge class
            let badgeClass = 'badge-pending';
            let icon = 'clock';
            if (report.status === 'Sedang Diproses' || report.status === 'Diproses') {
                badgeClass = 'badge-processing';
                icon = 'loader';
            } else if (report.status === 'Selesai') {
                badgeClass = 'badge-done';
                icon = 'check-circle';
            }

            const imgUrl = report.image_path ? `static/${report.image_path}` : 'https://images.unsplash.com/photo-1526481280690-9f10f80d63b2?auto=format&fit=crop&w=900&q=80';
            
            const cardHtml = `
                <article class="history-card" data-status="${report.status}" data-title="${report.title}" data-date="${report.created_at}">
                    <div class="card-img-container">
                        <img src="${imgUrl}" alt="${report.title}" class="history-img">
                        <span class="badge-overlay ${badgeClass}"><i data-lucide="${icon}"></i> ${report.status}</span>
                    </div>
                    <div class="history-body">
                        <div class="history-date"><i data-lucide="calendar"></i> ${date} WIB</div>
                        <h3 class="history-card-title">${report.title}</h3>
                        <div class="history-address"><i data-lucide="map-pin"></i> ${report.address}</div>
                        <p class="history-desc-text">${report.description}</p>
                        <div class="card-divider"></div>
                        <div class="history-actions">
                            <button class="btn btn-outline-orange detail-button" onclick='openDetail(${JSON.stringify(report).replace(/'/g, "&apos;")})'>Lihat Detail</button>
                            <a href="mailto:pengaduan@smartroad.go.id?subject=Tanya%20Status%20Laporan%20ID%20${report._id}" class="btn btn-secondary action-contact" title="Hubungi Admin">
                                <i data-lucide="mail"></i>
                            </a>
                        </div>
                    </div>
                </article>
            `;
            historyGrid.insertAdjacentHTML('beforeend', cardHtml);
        });

        if (window.lucide) window.lucide.createIcons();
    };

    const updateStats = (reports) => {
        let pending = 0, processing = 0, done = 0;
        reports.forEach(r => {
            if (r.status === 'Menunggu' || r.status === 'Menunggu Verifikasi') pending++;
            else if (r.status === 'Diproses' || r.status === 'Sedang Diproses') processing++;
            else if (r.status === 'Selesai') done++;
        });

        const cPending = document.getElementById('countPending');
        const cProcessing = document.getElementById('countProcessing');
        const cDone = document.getElementById('countDone');
        
        if(cPending) cPending.textContent = pending;
        if(cProcessing) cProcessing.textContent = processing;
        if(cDone) cDone.textContent = done;
    };

    // Filter Logic
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortOrder = document.getElementById('sortOrder');
    const resetFilters = document.getElementById('resetFilters');

    const applyFilters = () => {
        const query = (searchInput?.value || '').toLowerCase();
        const status = statusFilter?.value || 'all';
        const sort = sortOrder?.value || 'newest';

        let filtered = allReports.filter(report => {
            const matchesQuery = report.title.toLowerCase().includes(query) || report.address.toLowerCase().includes(query);
            const matchesStatus = status === 'all' || report.status === status || 
                                (status === 'Menunggu Verifikasi' && report.status === 'Menunggu');
            return matchesQuery && matchesStatus;
        });

        filtered.sort((a, b) => {
            const dA = new Date(a.created_at).getTime();
            const dB = new Date(b.created_at).getTime();
            return sort === 'newest' ? dB - dA : dA - dB;
        });

        renderReports(filtered);
    };

    searchInput?.addEventListener('input', applyFilters);
    statusFilter?.addEventListener('change', applyFilters);
    sortOrder?.addEventListener('change', applyFilters);
    resetFilters?.addEventListener('click', () => {
        if(searchInput) searchInput.value = '';
        if(statusFilter) statusFilter.value = 'all';
        if(sortOrder) sortOrder.value = 'newest';
        applyFilters();
    });

    // Modal detail function globally available
    window.openDetail = (report) => {
        const modal = document.getElementById('detailModal');
        if(!modal) return;

        document.getElementById('detailTitle').textContent = report.title;
        document.getElementById('detailStatus').textContent = report.status;
        document.getElementById('detailLocation').textContent = report.address;
        
        const date = new Date(report.created_at).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        document.getElementById('detailDate').textContent = date;
        document.getElementById('detailDescription').textContent = report.description;
        document.getElementById('detailNote').textContent = "Sedang ditinjau oleh pihak berwenang.";
        
        document.getElementById('detailOriginalPhoto').src = report.image_path ? `static/${report.image_path}` : 'https://images.unsplash.com/photo-1526481280690-9f10f80d63b2?auto=format&fit=crop&w=900&q=80';
        
        // Hide repair container as this is simple version
        const repairContainer = document.getElementById('detailRepairContainer');
        if(repairContainer) repairContainer.style.display = 'none';

        modal.classList.add('active');
    };

    document.getElementById('detailCloseBtn')?.addEventListener('click', () => {
        document.getElementById('detailModal')?.classList.remove('active');
    });

    // Call fetch on load
    fetchReports();
});
