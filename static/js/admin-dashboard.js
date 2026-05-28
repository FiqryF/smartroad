document.addEventListener('DOMContentLoaded', () => {
    const adminTableBody = document.getElementById('adminTableBody');

    const fetchAllReports = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/reports/all');
            const data = await response.json();
            
            if (response.ok && data.data) {
                renderAdminTable(data.data);
            } else {
                console.error("Failed to load reports:", data.message);
            }
        } catch (error) {
            console.error('Failed to fetch all reports:', error);
        }
    };

    const renderAdminTable = (reports) => {
        if (!adminTableBody) return;
        
        adminTableBody.innerHTML = '';
        
        if (reports.length === 0) {
            adminTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        Tidak ada laporan masuk.
                    </td>
                </tr>
            `;
            return;
        }

        reports.forEach(report => {
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

            const row = `
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
                        <button class="text-gray-400 hover:text-safety bg-white border border-gray-200 hover:border-safety/30 hover:bg-orange-50 w-8 h-8 rounded-lg transition-all shadow-sm flex items-center justify-center mx-auto" title="Lihat Detail">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            adminTableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    fetchAllReports();
});
