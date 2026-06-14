document.addEventListener('DOMContentLoaded', () => {
    const adminTableBody = document.getElementById('adminTableBody');
    const laporanTableBody = document.getElementById('laporanTableBody');
    const searchInput = document.getElementById('adminSearchInput');
    const exportReportsBtn = document.getElementById('exportReportsBtn');
    const coordinateCategoryFilter = document.getElementById('coordinateCategoryFilter');
    const allowedStatuses = new Set(['Menunggu', 'Proses', 'Selesai']);
    let cachedReports = [];
    let cachedPetugas = [];

    const escape = window.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char])));

    const normalizeStatus = (status) => {
        if (status === 'Sedang Diproses' || status === 'Diproses') return 'Proses';
        if (status === 'Menunggu Verifikasi' || status === 'Kritis') return 'Menunggu';
        if (status === 'Selesai') return 'Selesai';
        return allowedStatuses.has(status) ? status : 'Menunggu';
    };

    const getStatusClasses = (status) => {
        const normalized = normalizeStatus(status);
        if (normalized === 'Menunggu') {
            return {
                badge: 'bg-red-50 text-red-700 border border-red-100',
                dot: 'bg-red-500 animate-pulse',
                marker: '#ef4444'
            };
        }
        if (normalized === 'Proses') {
            return {
                badge: 'bg-orange-50 text-safety border border-orange-100',
                dot: 'bg-safety',
                marker: '#FF6B00'
            };
        }
        return {
            badge: 'bg-green-50 text-green-700 border border-green-100',
            dot: 'bg-green-500',
            marker: '#22c55e'
        };
    };

    const renderStatusBadge = (status) => {
        const safeStatus = escape(normalizeStatus(status));
        const classes = getStatusClasses(status);
        return `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold ${classes.badge}">
                <span class="w-1.5 h-1.5 rounded-full ${classes.dot}"></span> ${safeStatus}
            </span>
        `;
    };

    const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getReportPayload = (report, dateStr) => ({
        title: report.title || 'Laporan',
        reporter_email: report.reporter_email || '-',
        created_at: dateStr,
        status: normalizeStatus(report.status),
        address: report.address || '-',
        description: report.description || '-',
        image_path: report.image_path ? `/static/${report.image_path}` : '',
        lat: report.lat ?? '',
        lng: report.lng ?? ''
    });

    const updateAdminIdentity = () => {
        const name = sessionStorage.getItem('userName') || 'Admin';
        const email = sessionStorage.getItem('userEmail') || '';
        const nameEl = document.getElementById('adminName');
        const emailEl = document.getElementById('adminEmail');
        const avatarEl = document.getElementById('adminAvatar');

        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email || 'admin@smartroad.gov';
        if (avatarEl) {
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6B00&color=fff`;
        }
    };

    const fetchAllReports = async () => {
        try {
            const response = await window.authFetch('/api/reports/all');
            if (!response) return;

            if (response.status === 403) {
                alert('Akses ditolak. Akun ini bukan admin.');
                if (window.clearAuthSession) window.clearAuthSession();
                window.location.replace('login.html');
                return;
            }

            const data = await response.json();

            if (response.ok && Array.isArray(data.data)) {
                const reports = data.data;
                cachedReports = reports;
                renderAdminTable(getFilteredReports());
                updateDashboardStats(reports);
            } else {
                console.error('Failed to load reports:', data.message);
                alert(data.message || 'Gagal memuat laporan admin.');
            }
        } catch (error) {
            console.error('Failed to fetch all reports:', error);
            alert('Gagal terhubung ke server.');
        }
    };

    const getFilteredReports = () => {
        const query = (searchInput?.value || '').trim().toLowerCase();
        if (!query) return cachedReports;

        return cachedReports.filter(report => {
            const fields = [
                report._id,
                report.title,
                report.reporter_email,
                report.address,
                report.category,
                report.status,
                report.description
            ];
            return fields.some(field => String(field || '').toLowerCase().includes(query));
        });
    };

    const exportReportsCsv = () => {
        const reports = getFilteredReports();
        if (reports.length === 0) {
            alert('Tidak ada data laporan untuk diekspor.');
            return;
        }

        const headers = ['ID', 'Judul', 'Pelapor', 'Kategori', 'Status', 'Alamat', 'Latitude', 'Longitude', 'Tanggal'];
        const rows = reports.map(report => [
            report._id || '',
            report.title || '',
            report.reporter_email || '',
            report.category || '',
            normalizeStatus(report.status),
            report.address || '',
            report.lat ?? '',
            report.lng ?? '',
            formatDate(report.created_at)
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `smartroad-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const fetchUsers = async () => {
        const usersTableBody = document.getElementById('usersTableBody');
        const userCountBadge = document.getElementById('userCountBadge');
        if (!usersTableBody) return;

        try {
            const response = await window.authFetch('/api/admin/users');
            if (!response) return;

            const data = await response.json();
            if (!response.ok || !Array.isArray(data.data)) {
                usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Gagal memuat data user.</td></tr>';
                return;
            }

            const users = data.data;
            if (userCountBadge) userCountBadge.textContent = `${users.length} user`;

            if (users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Belum ada user terdaftar.</td></tr>';
                return;
            }

            usersTableBody.innerHTML = '';
            users.forEach(user => {
                const safeName = escape(user.nama || '-');
                const safeEmail = escape(user.email || '-');
                const safeRole = escape(user.role || 'user');
                const safeContact = escape(user.telepon || '-');
                const safeDate = escape(formatDate(user.created_at));
                const roleClass = user.role === 'admin'
                    ? 'bg-orange-50 text-safety border border-orange-100'
                    : 'bg-gray-50 text-gray-700 border border-gray-100';
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama || user.email || 'User')}&background=E0F2FE&color=0284C7`;

                usersTableBody.insertAdjacentHTML('beforeend', `
                    <tr class="hover:bg-gray-50/80 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full">
                                <span class="font-bold text-gray-800">${safeName}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-gray-600">${safeEmail}</td>
                        <td class="px-6 py-4">
                            <span class="inline-flex px-3 py-1 rounded-md text-xs font-bold ${roleClass}">${safeRole}</span>
                        </td>
                        <td class="px-6 py-4 text-gray-600">${safeContact}</td>
                        <td class="px-6 py-4 text-gray-500">${safeDate}</td>
                    </tr>
                `);
            });
        } catch (error) {
            console.error('Failed to fetch users:', error);
            usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Gagal terhubung ke server.</td></tr>';
        }
    };

    const fetchPetugas = async () => {
        const select = document.getElementById('modalPetugasSelect');
        try {
            const response = await window.authFetch('/api/admin/petugas');
            if (!response) return;

            const data = await response.json();
            cachedPetugas = response.ok && Array.isArray(data.data) ? data.data : [];
            if (!select) return;

            select.innerHTML = '<option value="">Pilih petugas lapangan...</option>';
            cachedPetugas.forEach(item => {
                const option = document.createElement('option');
                option.value = item.email;
                option.textContent = `${item.nama || item.email} - ${item.email}`;
                select.appendChild(option);
            });

            if (cachedPetugas.length === 0) {
                select.innerHTML = '<option value="">Belum ada akun petugas</option>';
            }
        } catch (error) {
            console.error('Failed to fetch petugas:', error);
            if (select) select.innerHTML = '<option value="">Gagal memuat petugas</option>';
        }
    };

    const addReportMarker = (report, group) => {
        const lat = Number(report.lat);
        const lng = Number(report.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const color = getStatusClasses(report.status).marker;
        const title = escape(report.title || 'Laporan');
        const address = escape(report.address || '-');
        const status = escape(normalizeStatus(report.status));
        const marker = L.circleMarker([lat, lng], {
            radius: 7,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).bindPopup(`
            <div style="min-width: 180px">
                <strong>${title}</strong>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px">${address}</div>
                <div style="font-size: 12px; margin-top: 6px"><b>Status:</b> ${status}</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
            </div>
        `);

        marker.addTo(group);
    };

    const updateDashboardStats = (reports) => {
        const total = reports.length;
        let proses = 0;
        let selesai = 0;
        let kritis = 0;
        const catCounts = {
            'Berlubang': 0,
            'Retak': 0,
            'Lampu Mati': 0,
            'Rambu': 0,
            'Genangan': 0
        };
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];

        if (window.overviewMarkers) window.overviewMarkers.clearLayers();
        if (window.coordinateMarkers) window.coordinateMarkers.clearLayers();

        reports.forEach(report => {
            const normalizedStatus = normalizeStatus(report.status);
            if (normalizedStatus === 'Menunggu') kritis++;
            else if (normalizedStatus === 'Proses') proses++;
            else selesai++;

            const category = report.category || 'Berlubang';
            if (catCounts[category] !== undefined) catCounts[category]++;
            else catCounts['Berlubang']++;

            const date = new Date(report.created_at);
            if (!Number.isNaN(date.getTime())) {
                const dayOfWeek = date.getDay();
                const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                dayCounts[adjustedDay]++;
            }

            const categoryFilter = coordinateCategoryFilter?.value || 'Semua Kategori';
            const includeOnCoordinateMap = categoryFilter === 'Semua Kategori' || report.category === categoryFilter;

            if (window.overviewMap && window.overviewMarkers) {
                addReportMarker(report, window.overviewMarkers);
            }
            if (includeOnCoordinateMap && window.coordinateMap && window.coordinateMarkers) {
                addReportMarker(report, window.coordinateMarkers);
            }
        });

        if (window.overviewMap && window.overviewMarkers && window.overviewMarkers.getLayers().length > 0) {
            window.overviewMap.fitBounds(window.overviewMarkers.getBounds(), { padding: [30, 30], maxZoom: 15 });
        }
        if (window.coordinateMap && window.coordinateMarkers && window.coordinateMarkers.getLayers().length > 0) {
            window.coordinateMap.fitBounds(window.coordinateMarkers.getBounds(), { padding: [30, 30], maxZoom: 15 });
        }

        document.getElementById('total-laporan-count').textContent = total;
        document.getElementById('proses-count').textContent = proses;
        document.getElementById('selesai-count').textContent = selesai;
        document.getElementById('kritis-count').textContent = kritis;

        const prosesPercent = total > 0 ? Math.round((proses / total) * 100) : 0;
        const selesaiPercent = total > 0 ? Math.round((selesai / total) * 100) : 0;

        document.getElementById('proses-percent').textContent = `${prosesPercent}% Total`;
        document.getElementById('proses-bar').style.width = `${prosesPercent}%`;
        document.getElementById('selesai-percent').textContent = `${selesaiPercent}% Total`;
        document.getElementById('selesai-bar').style.width = `${selesaiPercent}%`;

        if (window.trendChart) {
            window.trendChart.data.datasets[0].data = dayCounts;
            window.trendChart.update();
        }
        if (window.categoryChart) {
            window.categoryChart.data.datasets[0].data = [
                catCounts['Berlubang'],
                catCounts['Retak'],
                catCounts['Lampu Mati'],
                catCounts['Rambu'],
                catCounts['Genangan']
            ];
            window.categoryChart.update();
        }
    };

    const renderAdminTable = (reports) => {
        if (adminTableBody) adminTableBody.innerHTML = '';
        if (laporanTableBody) laporanTableBody.innerHTML = '';

        const badge = document.getElementById('sidebar-laporan-badge');
        if (badge) badge.textContent = reports.length;

        if (reports.length === 0) {
            const emptyOverview = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Tidak ada laporan masuk.</td></tr>';
            const emptyLaporan = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Tidak ada laporan masuk.</td></tr>';
            if (adminTableBody) adminTableBody.innerHTML = emptyOverview;
            if (laporanTableBody) laporanTableBody.innerHTML = emptyLaporan;
            return;
        }

        reports.forEach((report, index) => {
            const dateStr = formatDate(report.created_at);
            const shortId = report._id ? escape(String(report._id).slice(-6).toUpperCase()) : 'N/A';
            const safeId = escape(report._id || '');
            const safeStatus = escape(normalizeStatus(report.status));
            const safeEmail = escape(report.reporter_email || '-');
            const safeTitle = escape(report.title || 'Laporan');
            const safeCategory = escape(report.category || 'Infrastruktur');
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter_email || 'User')}&background=E0F2FE&color=0284C7`;
            const reportPayload = encodeURIComponent(JSON.stringify(getReportPayload(report, dateStr)));
            const statusHtml = renderStatusBadge(report.status);

            const overviewRow = `
                <tr class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-4 font-bold text-gray-900">#RPT-${shortId}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full">
                            <div>
                                <p class="font-bold text-gray-800">${safeEmail}</p>
                                <p class="text-[11px] text-gray-500 font-semibold">${escape(dateStr)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800">${safeTitle}</p>
                        <p class="text-xs text-gray-500 truncate max-w-[150px]">${safeCategory}</p>
                    </td>
                    <td class="px-6 py-4">${statusHtml}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="openStatusModal('${safeId}', '${safeStatus}')" class="text-gray-400 hover:text-safety bg-white border border-gray-200 hover:border-safety/30 hover:bg-orange-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center mx-auto" title="Ubah Status">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </td>
                </tr>
            `;

            const laporanRow = `
                <tr class="hover:bg-gray-50/80 transition-colors group" data-report-id="${safeId}">
                    <td class="px-6 py-4 text-center">
                        <input type="checkbox" value="${safeId}" class="row-checkbox w-4 h-4 text-safety border-gray-300 rounded focus:ring-safety cursor-pointer">
                    </td>
                    <td class="px-6 py-4 font-bold text-gray-900">#RPT-${shortId}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full">
                            <div>
                                <p class="font-bold text-gray-800">${safeEmail}</p>
                                <p class="text-[11px] text-gray-500 font-semibold">${escape(dateStr)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800">${safeTitle}</p>
                        <p class="text-xs text-gray-500 truncate max-w-[150px]">${safeCategory}</p>
                    </td>
                    <td class="px-6 py-4">${statusHtml}</td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="openDetailModal('${reportPayload}')" class="text-gray-400 hover:text-blue-500 bg-white border border-gray-200 hover:border-blue-500/30 hover:bg-blue-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center" title="Lihat Detail">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="openStatusModal('${safeId}', '${safeStatus}')" class="text-gray-400 hover:text-safety bg-white border border-gray-200 hover:border-safety/30 hover:bg-orange-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center" title="Ubah Status">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;

            if (adminTableBody && index < 5) adminTableBody.insertAdjacentHTML('beforeend', overviewRow);
            if (laporanTableBody) laporanTableBody.insertAdjacentHTML('beforeend', laporanRow);
        });

        initCheckboxLogic();
    };

    const initCheckboxLogic = () => {
        const selectAllCb = document.getElementById('selectAllCheckbox');
        const rowCbs = document.querySelectorAll('.row-checkbox');
        const batchActionsBar = document.getElementById('batchActionsBar');
        const selectedCountEl = document.getElementById('selectedCount');
        const applyBatchBtn = document.getElementById('applyBatchStatusBtn');
        const batchStatusSelect = document.getElementById('batchStatusSelect');

        const updateBatchUI = () => {
            const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
            if (batchActionsBar) {
                batchActionsBar.classList.toggle('hidden', checkedCount === 0);
                batchActionsBar.classList.toggle('flex', checkedCount > 0);
            }
            if (selectedCountEl) selectedCountEl.textContent = checkedCount;
            if (selectAllCb) selectAllCb.checked = checkedCount === rowCbs.length && rowCbs.length > 0;
        };

        if (selectAllCb && !selectAllCb.dataset.handlerAttached) {
            selectAllCb.dataset.handlerAttached = 'true';
            selectAllCb.addEventListener('change', (event) => {
                document.querySelectorAll('.row-checkbox').forEach(cb => {
                    cb.checked = event.target.checked;
                });
                updateBatchUI();
            });
        }

        rowCbs.forEach(cb => cb.addEventListener('change', updateBatchUI));

        if (applyBatchBtn && !applyBatchBtn.dataset.handlerAttached) {
            applyBatchBtn.dataset.handlerAttached = 'true';
            applyBatchBtn.addEventListener('click', async () => {
                const newStatus = normalizeStatus(batchStatusSelect.value);
                if (!allowedStatuses.has(newStatus)) {
                    alert('Silakan pilih status baru terlebih dahulu.');
                    return;
                }
                if (newStatus === 'Proses') {
                    alert('Status Proses membutuhkan penugasan petugas. Gunakan tombol ubah status pada masing-masing laporan.');
                    return;
                }

                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
                if (selectedIds.length === 0) return;

                const originalText = applyBatchBtn.textContent;
                applyBatchBtn.textContent = 'Memproses...';
                applyBatchBtn.disabled = true;

                try {
                    const results = await Promise.all(selectedIds.map(async id => {
                        const response = await window.authFetch(`/api/reports/${encodeURIComponent(id)}/status`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus })
                        });

                        if (!response) return { ok: false, id, message: 'Sesi tidak valid' };
                        let payload = {};
                        try {
                            payload = await response.json();
                        } catch (error) {
                            payload = {};
                        }
                        return { ok: response.ok, id, message: payload.message || 'Gagal memperbarui status' };
                    }));

                    const failed = results.filter(result => !result.ok);
                    if (failed.length > 0) {
                        alert(`${failed.length} dari ${selectedIds.length} laporan gagal diperbarui.`);
                    } else {
                        alert('Status laporan terpilih berhasil diperbarui.');
                    }

                    if (selectAllCb) selectAllCb.checked = false;
                    batchStatusSelect.value = '';
                    await fetchAllReports();
                } catch (error) {
                    console.error(error);
                    alert('Terjadi kesalahan saat mengupdate secara batch.');
                } finally {
                    applyBatchBtn.textContent = originalText;
                    applyBatchBtn.disabled = false;
                    if (batchActionsBar) {
                        batchActionsBar.classList.add('hidden');
                        batchActionsBar.classList.remove('flex');
                    }
                }
            });
        }
    };

    const detailModal = document.getElementById('detailModal');
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    const detailCloseBtn = document.getElementById('detailCloseBtn');

    window.openDetailModal = (encodedReport) => {
        try {
            const report = JSON.parse(decodeURIComponent(encodedReport));

            document.getElementById('detailTitle').textContent = report.title || '-';
            document.getElementById('detailEmail').textContent = report.reporter_email || '-';
            document.getElementById('detailDate').textContent = report.created_at || '-';
            document.getElementById('detailAddress').textContent = report.address || '-';
            document.getElementById('detailDesc').textContent = report.description || '-';

            const detailCoords = document.getElementById('detailCoords');
            if (detailCoords) {
                detailCoords.textContent = report.lat !== '' && report.lng !== '' ? `${report.lat}, ${report.lng}` : '-';
            }

            const detailStatus = document.getElementById('detailStatus');
            const normalizedStatus = normalizeStatus(report.status);
            const classes = getStatusClasses(normalizedStatus);
            detailStatus.textContent = normalizedStatus;
            detailStatus.className = `inline-block px-3 py-1 rounded-lg text-sm font-bold mb-4 ${classes.badge}`;

            const imgEl = document.getElementById('detailImg');
            if (report.image_path) {
                imgEl.src = report.image_path;
                imgEl.classList.remove('hidden');
            } else {
                imgEl.src = '';
                imgEl.classList.add('hidden');
            }

            detailModal.classList.remove('hidden');
            detailModal.classList.add('flex');
        } catch (error) {
            console.error('Failed to parse report details', error);
        }
    };

    const closeDetail = () => {
        detailModal.classList.add('hidden');
        detailModal.classList.remove('flex');
    };

    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetail);
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetail);

    const modal = document.getElementById('statusModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const saveBtn = document.getElementById('saveStatusBtn');
    const modalStatusSelect = document.getElementById('modalStatusSelect');
    const petugasAssignGroup = document.getElementById('petugasAssignGroup');
    const modalPetugasSelect = document.getElementById('modalPetugasSelect');

    const togglePetugasAssign = () => {
        const shouldAssign = normalizeStatus(modalStatusSelect?.value) === 'Proses';
        petugasAssignGroup?.classList.toggle('hidden', !shouldAssign);
    };

    window.openStatusModal = (id, currentStatus) => {
        document.getElementById('modalReportId').value = id;
        if (modalStatusSelect) modalStatusSelect.value = normalizeStatus(currentStatus);
        const report = cachedReports.find(item => item._id === id);
        if (modalPetugasSelect) modalPetugasSelect.value = report?.assigned_petugas_email || '';
        togglePetugasAssign();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modalStatusSelect?.addEventListener('change', togglePetugasAssign);

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const reportId = document.getElementById('modalReportId').value;
            const newStatus = normalizeStatus(modalStatusSelect?.value);
            if (!reportId || !allowedStatuses.has(newStatus)) {
                alert('Data status tidak valid.');
                return;
            }
            const assignedPetugasEmail = modalPetugasSelect?.value || '';
            if (newStatus === 'Proses' && !assignedPetugasEmail) {
                alert('Pilih petugas penanggung jawab terlebih dahulu.');
                return;
            }

            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Menyimpan...';
            saveBtn.disabled = true;

            try {
                const response = await window.authFetch(`/api/reports/${encodeURIComponent(reportId)}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: newStatus,
                        assigned_petugas_email: assignedPetugasEmail
                    })
                });
                if (!response) return;

                const data = await response.json();
                if (response.ok) {
                    closeModal();
                    await fetchAllReports();
                } else {
                    alert(data.message || 'Gagal mengubah status.');
                }
            } catch (error) {
                console.error(error);
                alert('Terjadi kesalahan jaringan.');
            } finally {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    searchInput?.addEventListener('input', () => {
        renderAdminTable(getFilteredReports());
    });

    exportReportsBtn?.addEventListener('click', exportReportsCsv);

    coordinateCategoryFilter?.addEventListener('change', () => {
        updateDashboardStats(cachedReports);
    });

    updateAdminIdentity();
    fetchAllReports();
    fetchUsers();
    fetchPetugas();
});
