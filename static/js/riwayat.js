document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');

    // Update Navbar UI (Desktop & Mobile)
    if (userName) {
        document.querySelectorAll('.user-name').forEach(el => el.textContent = userName);
        const popupName = document.getElementById('popupName');
        if (popupName) popupName.textContent = userName;
    }
    if (userEmail) {
        const popupEmail = document.getElementById('popupEmail');
        if (popupEmail) popupEmail.textContent = userEmail;
    }

    const container = document.getElementById('riwayatContainer');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    if (!userEmail) {
        window.location.replace('login.html');
        return;
    }

    try {
        // Fetch menggunakan JWT Token
        const response = await fetchWithAuth(`/api/reports/user?email=${encodeURIComponent(userEmail)}`);
        if (!response) return;

        const resData = await response.json();
        container.innerHTML = '';

        if (response.ok && resData.data && resData.data.length > 0) {
            if (emptyState) emptyState.style.display = 'none';
            container.style.display = 'grid';

            resData.data.forEach(report => {
                // Format Tanggal
                const dateObj = new Date(report.created_at);
                const dateStr = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                // Tentukan Warna & Icon Badge
                let badgeClass = 'badge-pending';
                let iconName = 'clock';
                if (report.status === 'Sedang Diproses') { badgeClass = 'badge-processing'; iconName = 'loader'; }
                if (report.status === 'Selesai') { badgeClass = 'badge-done'; iconName = 'check-circle'; }

                // Default image jika tidak ada
                const imgSrc = report.image_path ? `/static/${report.image_path}` : 'https://images.unsplash.com/photo-1526481280690-9f10f80d63b2?auto=format&fit=crop&w=900&q=80';

                // Buat Struktur Kartu Premium
                const card = `
                    <article class="history-card" data-status="${report.status}" data-title="${report.title}" data-date="${report.created_at}">
                        <div class="card-img-container">
                            <img src="${imgSrc}" alt="Foto Laporan" class="history-img">
                            <span class="badge-overlay ${badgeClass}"><i data-lucide="${iconName}"></i> ${report.status}</span>
                        </div>
                        <div class="history-body">
                            <div class="history-date"><i data-lucide="calendar"></i> ${dateStr} • ${timeStr} WIB</div>
                            <h3 class="history-card-title">${report.title}</h3>
                            <div class="history-address"><i data-lucide="map-pin"></i> ${report.address || '-'}</div>
                            <p class="history-desc-text">${report.description}</p>
                            <div class="card-divider"></div>
                            <div class="history-actions">
                                <button class="btn btn-outline-orange detail-button" onclick="alert('Fitur detail menyusul!')">Lihat Detail</button>
                            </div>
                        </div>
                    </article>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });

            // Render ulang icon Lucide setelah HTML disuntikkan
            if (window.lucide) {
                window.lucide.createIcons();
            }

        } else {
            // Jika kosong
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        }
    } catch (error) {
        console.error("Gagal memuat riwayat:", error);
        container.innerHTML = '<p style="text-align:center; color:red; grid-column: 1/-1;">Gagal terhubung ke server.</p>';
    }
});