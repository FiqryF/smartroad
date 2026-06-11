document.addEventListener('DOMContentLoaded', () => {
    const adminTableBody = document.getElementById('adminTableBody');

    const fetchAllReports = async () => {
        try {
            const response = await window.authFetch('http://127.0.0.1:5000/api/reports/all');
            if (!response) return;

            if (response.status === 403) {
                alert('Akses Ditolak: Sesi Anda bermasalah atau Anda bukan admin!');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('userRole');
                window.location.replace('login.html');
                return;
            }

            const data = await response.json();
            
            if (response.ok && data.data) {
                const reports = data.data;
                renderAdminTable(reports);
                updateDashboardStats(reports);
            } else {
                console.error("Failed to load reports:", data.message);
            }
        } catch (error) {
            console.error('Failed to fetch all reports:', error);
        }
    };

    const updateDashboardStats = (reports) => {
        // 1. Calculate Stats
        const total = reports.length;
        let proses = 0;
        let selesai = 0;
        let kritis = 0;
        
        // Category counts
        const catCounts = {
            'Berlubang': 0, 'Retak': 0, 'Lampu Mati': 0, 'Rambu': 0, 'Genangan': 0
        };
        
        // Trend counts (dummy logic: put everything in today or spread it)
        // For actual data, parse created_at
        const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

        if (window.overviewMarkers) {
            window.overviewMarkers.clearLayers();
        }

        if (window.heatmapMarkers) {
            window.heatmapMarkers.clearLayers();
        }

        reports.forEach(r => {
            // Status counts
            if (r.status === 'Kritis' || r.status === 'Menunggu' || r.status === 'Menunggu Verifikasi') kritis++;
            else if (r.status === 'Proses' || r.status === 'Sedang Diproses' || r.status === 'Diproses') proses++;
            else selesai++;

            // Category counts
            let cat = r.category || 'Berlubang';
            if (catCounts[cat] !== undefined) catCounts[cat]++;
            else catCounts['Berlubang']++; // default

            // Trend counts
            const dayOfWeek = new Date(r.created_at).getDay();
            // JS getDay(): 0=Sun, 1=Mon... we want 0=Mon
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            dayCounts[adjustedDay]++;

            // Map markers
            if (r.lat && r.lng) {
                let color = "#22c55e"; // Selesai
                if (r.status === 'Kritis' || r.status === 'Menunggu' || r.status === 'Menunggu Verifikasi') color = "#ef4444";
                else if (r.status === 'Proses' || r.status === 'Sedang Diproses' || r.status === 'Diproses') color = "#FF6B00";
                
                const markerOptions = {
                    radius: 6,
                    fillColor: color,
                    color: "#fff",
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.9
                };

                if (window.overviewMap && window.overviewMarkers) {
                    L.circleMarker([r.lat, r.lng], markerOptions).addTo(window.overviewMarkers);
                }

                if (window.heatmapMap && window.heatmapMarkers) {
                    L.circleMarker([r.lat, r.lng], markerOptions).addTo(window.heatmapMarkers);
                }
            }
        });

        // Fit map bounds to markers
        if (window.overviewMap && window.overviewMarkers && window.overviewMarkers.getLayers().length > 0) {
            window.overviewMap.fitBounds(window.overviewMarkers.getBounds(), { padding: [30, 30], maxZoom: 15 });
        }
        if (window.heatmapMap && window.heatmapMarkers && window.heatmapMarkers.getLayers().length > 0) {
            window.heatmapMap.fitBounds(window.heatmapMarkers.getBounds(), { padding: [30, 30], maxZoom: 15 });
        }

        // 2. Update DOM
        document.getElementById('total-laporan-count').textContent = total;
        document.getElementById('proses-count').textContent = proses;
        document.getElementById('selesai-count').textContent = selesai;
        document.getElementById('kritis-count').textContent = kritis;
        
        const prosesPercent = total > 0 ? Math.round((proses/total)*100) : 0;
        const selesaiPercent = total > 0 ? Math.round((selesai/total)*100) : 0;
        
        document.getElementById('proses-percent').textContent = prosesPercent + '% Total';
        document.getElementById('proses-bar').style.width = prosesPercent + '%';
        document.getElementById('selesai-percent').textContent = selesaiPercent + '% Total';
        document.getElementById('selesai-bar').style.width = selesaiPercent + '%';

        // 3. Update Charts
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
        const laporanTableBody = document.getElementById('laporanTableBody');
        
        if (adminTableBody) adminTableBody.innerHTML = '';
        if (laporanTableBody) laporanTableBody.innerHTML = '';
        
        // Update sidebar badge
        const badge = document.getElementById('sidebar-laporan-badge');
        if (badge) badge.textContent = reports.length;

        if (reports.length === 0) {
            const emptyRow = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        Tidak ada laporan masuk.
                    </td>
                </tr>
            `;
            if (adminTableBody) adminTableBody.innerHTML = emptyRow;
            if (laporanTableBody) laporanTableBody.innerHTML = emptyRow;
            return;
        }

        reports.forEach((report, index) => {
            const dateStr = new Date(report.created_at).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            
            // Format ID (just take last 6 chars for brevity if it's MongoDB ObjectID)
            const shortId = report._id ? report._id.slice(-6).toUpperCase() : 'N/A';

            let statusHtml = '';
            if (report.status === 'Kritis' || report.status === 'Menunggu' || report.status === 'Menunggu Verifikasi') {
                statusHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> ${report.status}
                              </span>`;
            } else if (report.status === 'Proses' || report.status === 'Sedang Diproses' || report.status === 'Diproses') {
                statusHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-50 text-safety border border-orange-100">
                                <span class="w-1.5 h-1.5 rounded-full bg-safety"></span> ${report.status}
                              </span>`;
            } else {
                statusHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> ${report.status}
                              </span>`;
            }

            // Using ui-avatars for reporter
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter_email || 'User')}&background=E0F2FE&color=0284C7`;

            const overviewRow = `
                <tr class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-4 font-bold text-gray-900">#RPT-${shortId}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full">
                            <div>
                                <p class="font-bold text-gray-800">${report.reporter_email}</p>
                                <p class="text-[11px] text-gray-500 font-semibold">${dateStr}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800">${report.title}</p>
                        <p class="text-xs text-gray-500 truncate max-w-[150px]">${report.category || 'Infrastruktur'}</p>
                    </td>
                    <td class="px-6 py-4">
                        ${statusHtml}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="openStatusModal('${report._id}', '${report.status}')" class="text-gray-400 hover:text-safety bg-white border border-gray-200 hover:border-safety/30 hover:bg-orange-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center mx-auto" title="Ubah Status">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </td>
                </tr>
            `;

            const imgSrc = report.image_path ? `/static/${report.image_path}` : '';
            const safeReport = encodeURIComponent(JSON.stringify({
                title: report.title,
                reporter_email: report.reporter_email,
                created_at: dateStr,
                status: report.status,
                address: report.address || '-',
                description: report.description,
                image_path: imgSrc
            }));

            const laporanRow = `
                <tr class="hover:bg-gray-50/80 transition-colors group" data-report-id="${report._id}">
                    <td class="px-6 py-4 text-center">
                        <input type="checkbox" value="${report._id}" class="row-checkbox w-4 h-4 text-safety border-gray-300 rounded focus:ring-safety cursor-pointer">
                    </td>
                    <td class="px-6 py-4 font-bold text-gray-900">#RPT-${shortId}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full">
                            <div>
                                <p class="font-bold text-gray-800">${report.reporter_email}</p>
                                <p class="text-[11px] text-gray-500 font-semibold">${dateStr}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800">${report.title}</p>
                        <p class="text-xs text-gray-500 truncate max-w-[150px]">${report.category || 'Infrastruktur'}</p>
                    </td>
                    <td class="px-6 py-4">
                        ${statusHtml}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="openDetailModal('${safeReport}')" class="text-gray-400 hover:text-blue-500 bg-white border border-gray-200 hover:border-blue-500/30 hover:bg-blue-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center" title="Lihat Detail">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="openStatusModal('${report._id}', '${report.status}')" class="text-gray-400 hover:text-safety bg-white border border-gray-200 hover:border-safety/30 hover:bg-orange-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center" title="Ubah Status">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // Only show latest 5 in admin overview table
            if (adminTableBody && index < 5) {
                adminTableBody.insertAdjacentHTML('beforeend', overviewRow);
            }
            // Show all in laporan tab
            if (laporanTableBody) {
                laporanTableBody.insertAdjacentHTML('beforeend', laporanRow);
            }
        });

        initCheckboxLogic();
    };

    // Checkbox & Batch Update Logic
    const initCheckboxLogic = () => {
        const selectAllCb = document.getElementById('selectAllCheckbox');
        const rowCbs = document.querySelectorAll('.row-checkbox');
        const batchActionsBar = document.getElementById('batchActionsBar');
        const selectedCountEl = document.getElementById('selectedCount');
        const applyBatchBtn = document.getElementById('applyBatchStatusBtn');
        const batchStatusSelect = document.getElementById('batchStatusSelect');

        const updateBatchUI = () => {
            const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
            if (checkedCount > 0) {
                batchActionsBar.classList.remove('hidden');
                batchActionsBar.classList.add('flex');
                selectedCountEl.textContent = checkedCount;
            } else {
                batchActionsBar.classList.add('hidden');
                batchActionsBar.classList.remove('flex');
            }
            if(selectAllCb) selectAllCb.checked = checkedCount === rowCbs.length && rowCbs.length > 0;
        };

        if (selectAllCb) {
            selectAllCb.addEventListener('change', (e) => {
                rowCbs.forEach(cb => cb.checked = e.target.checked);
                updateBatchUI();
            });
        }

        rowCbs.forEach(cb => {
            cb.addEventListener('change', updateBatchUI);
        });

        // Batch Apply
        if (applyBatchBtn) {
            applyBatchBtn.addEventListener('click', async () => {
                const newStatus = batchStatusSelect.value;
                if (!newStatus) return alert('Silakan pilih status baru terlebih dahulu.');

                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
                if (selectedIds.length === 0) return;

                const originalText = applyBatchBtn.textContent;
                applyBatchBtn.textContent = 'Memproses...';
                applyBatchBtn.disabled = true;

                try {
                    // Update all sequentially (or use Promise.all)
                    await Promise.all(selectedIds.map(id => {
                        return window.authFetch(`http://127.0.0.1:5000/api/reports/${id}/status`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus })
                        });
                    }));
                    
                    if (selectAllCb) selectAllCb.checked = false;
                    batchStatusSelect.value = '';
                    await fetchAllReports(); // Refresh
                } catch (error) {
                    console.error(error);
                    alert('Terjadi kesalahan saat mengupdate secara batch');
                } finally {
                    applyBatchBtn.textContent = originalText;
                    applyBatchBtn.disabled = false;
                    batchActionsBar.classList.add('hidden');
                    batchActionsBar.classList.remove('flex');
                }
            });
        }
    };

    // Detail Modal Logic
    const detailModal = document.getElementById('detailModal');
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    const detailCloseBtn = document.getElementById('detailCloseBtn');

    window.openDetailModal = (encodedReport) => {
        try {
            const report = JSON.parse(decodeURIComponent(encodedReport));
            
            document.getElementById('detailTitle').textContent = report.title;
            document.getElementById('detailEmail').textContent = report.reporter_email;
            document.getElementById('detailDate').textContent = report.created_at;
            document.getElementById('detailAddress').textContent = report.address;
            document.getElementById('detailDesc').textContent = report.description;
            
            const detailStatus = document.getElementById('detailStatus');
            detailStatus.textContent = report.status;
            detailStatus.className = 'inline-block px-3 py-1 rounded-lg text-sm font-bold mb-4';
            if (report.status === 'Kritis' || report.status === 'Menunggu' || report.status === 'Menunggu Verifikasi') {
                detailStatus.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-100');
            } else if (report.status === 'Proses' || report.status === 'Sedang Diproses') {
                detailStatus.classList.add('bg-orange-50', 'text-safety', 'border', 'border-orange-100');
            } else {
                detailStatus.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-100');
            }

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
        } catch (e) {
            console.error('Failed to parse report details', e);
        }
    };

    const closeDetail = () => {
        detailModal.classList.add('hidden');
        detailModal.classList.remove('flex');
    };

    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetail);
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetail);


    // Modal Logic
    const modal = document.getElementById('statusModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const saveBtn = document.getElementById('saveStatusBtn');

    window.openStatusModal = (id, currentStatus) => {
        document.getElementById('modalReportId').value = id;
        
        // Normalize status for select
        let mappedStatus = currentStatus;
        if (currentStatus === 'Sedang Diproses' || currentStatus === 'Diproses') mappedStatus = 'Proses';
        if (currentStatus === 'Menunggu Verifikasi') mappedStatus = 'Menunggu';
        
        document.getElementById('modalStatusSelect').value = mappedStatus;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const reportId = document.getElementById('modalReportId').value;
            const newStatus = document.getElementById('modalStatusSelect').value;

            try {
                const response = await window.authFetch(`http://127.0.0.1:5000/api/reports/${reportId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response && response.ok) {
                    closeModal();
                    // Refresh data
                    fetchAllReports();
                } else {
                    alert('Gagal mengubah status');
                }
            } catch (error) {
                console.error(error);
                alert('Terjadi kesalahan jaringan');
            }
        });
    }

    fetchAllReports();
});
