document.addEventListener('DOMContentLoaded', async () => {
    const userName = sessionStorage.getItem('userName');
    const userEmail = sessionStorage.getItem('userEmail');
    const userAvatar = sessionStorage.getItem('userAvatar');
    const profileStatus = sessionStorage.getItem('profileStatus');
    const escape = window.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char])));

    // --- 1. SINKRONISASI NAMA & INISIAL ---
    if (userName) {
        // Update Nama di Navbar
        const navbarName = document.getElementById('navbarName');
        if (navbarName) navbarName.textContent = userName;

        const userNames = document.querySelectorAll('.user-name');
        if (userNames) userNames.forEach(el => el.textContent = userName);

        // Update Popup Name
        const popupName = document.getElementById('popupName');
        if (popupName) popupName.textContent = userName;

        // Logika Avatar Cerdas (Mengikuti sessionStorage)
        let finalAvatarUrl;

        if (userAvatar) {
            finalAvatarUrl = userAvatar;
        } else {
            // Fallback jika tidak ada di sessionStorage
            const initials = userName.length >= 2 ? userName.substring(0, 2).toUpperCase() : userName.toUpperCase();
            finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=FF6B00&color=FFFFFF`;
        }

        // Terapkan URL ke semua elemen avatar
        const avatarImgs = document.querySelectorAll('.avatar-img');
        if (avatarImgs) avatarImgs.forEach(el => el.src = finalAvatarUrl);

        const profileAvatars = document.querySelectorAll('.profile-avatar');
        if (profileAvatars) profileAvatars.forEach(el => el.src = finalAvatarUrl);

        // Logika inisial teks (jika ada)
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = userName.length >= 2 ? userName.substring(0, 2).toUpperCase() : userName.toUpperCase();
        }
    }

    if (userEmail) {
        const popupEmail = document.getElementById('popupEmail');
        if (popupEmail) popupEmail.textContent = userEmail;
    }

    if (window.loadUserNotifications) {
        await window.loadUserNotifications();
    }


    // --- 3. FETCH RIWAYAT LAPORAN ---
    const container = document.getElementById('riwayatContainer');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;
    let userReports = [];
    let currentCsReportId = '';

    if (!userEmail) {
        window.location.replace('login.html');
        return;
    }

    try {
        const response = await fetchWithAuth('/api/reports/user');
        if (!response) return;

        const resData = await response.json();
        container.innerHTML = '';

        if (response.ok && resData.data && resData.data.length > 0) {
            if (emptyState) emptyState.style.display = 'none';
            container.style.display = 'grid';

            userReports = resData.data;
            populateCsReportSelect();

            resData.data.forEach(report => {
                const dateObj = new Date(report.created_at);
                const dateStr = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                let badgeClass = 'badge-pending';
                let iconName = 'clock';
                if (report.status === 'Sedang Diproses' || report.status === 'Proses') { badgeClass = 'badge-processing'; iconName = 'loader'; }
                if (report.status === 'Selesai') { badgeClass = 'badge-done'; iconName = 'check-circle'; }

                const safeStatus = escape(report.status || 'Menunggu');
                const safeReportId = escape(report._id || '');
                const safeTitle = escape(report.title || 'Laporan');
                const safeAddress = escape(report.address || '-');
                const safeDescription = escape(report.description || '');
                const safeCreatedAt = escape(report.created_at || '');
                const safeDateDisplay = escape(`${dateStr} - ${timeStr} WIB`);
                const imgSrc = report.image_path ? `/static/${report.image_path}` : 'https://images.unsplash.com/photo-1526481280690-9f10f80d63b2?auto=format&fit=crop&w=900&q=80';
                const safeImgSrc = escape(imgSrc);
                const safeRepairImgSrc = escape(report.repair_image_path ? `/static/${report.repair_image_path}` : '');
                const serviceNote = String(report.completion_note || report.petugas_note || report.note || '').trim();
                const defaultNote = report.status === 'Selesai'
                    ? 'Laporan telah diselesaikan oleh petugas. Catatan pengerjaan belum ditambahkan.'
                    : 'Laporan Anda telah berhasil terdaftar dan berada dalam antrean penelaahan berkas administrasi.';
                const safeServiceNote = escape(serviceNote || defaultNote);
                const safeReviewRating = escape(report.review_rating || '');
                const safeReviewText = escape(report.review_text || '');
                const affectedCount = Number(report.affected_count || 0) || ((Number(report.upvote_count || 0) || 0) + 1);
                const priorityLevel = report.priority_level || 'Normal';
                const isClusterSupport = Boolean(report.clustered_by_current_user);
                const canCurrentUserReview = report.can_review_by_current_user !== undefined
                    ? Boolean(report.can_review_by_current_user)
                    : (!isClusterSupport && report.reporter_email === userEmail);
                const evidenceCount = Number(report.cluster_evidence_count || 0) || (Array.isArray(report.cluster_evidence) ? report.cluster_evidence.length : 0);
                const currentEvidence = report.current_user_cluster_evidence || {};
                const currentEvidenceDesc = currentEvidence.description || '';
                const currentEvidenceImg = currentEvidence.image_path ? `/static/${currentEvidence.image_path}` : '';
                const crowdBadge = `
                    <div style="display:flex; flex-wrap:wrap; gap:0.45rem; margin-top:0.75rem;">
                        ${isClusterSupport ? '<span style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.32rem 0.55rem; border-radius:6px; background:#eff6ff; color:#1d4ed8; font-size:0.72rem; font-weight:800;">Laporan Gabungan</span>' : ''}
                        <span style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.32rem 0.55rem; border-radius:6px; background:#f8fafc; color:#334155; font-size:0.72rem; font-weight:800;">${affectedCount} warga terdampak</span>
                        <span style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.32rem 0.55rem; border-radius:6px; background:#fff7ed; color:#c2410c; font-size:0.72rem; font-weight:800;">Prioritas ${escape(priorityLevel)}</span>
                        ${evidenceCount ? `<span style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.32rem 0.55rem; border-radius:6px; background:#f0fdf4; color:#15803d; font-size:0.72rem; font-weight:800;">${evidenceCount} bukti tambahan</span>` : ''}
                    </div>
                `;

                const card = `
                    <article class="history-card" data-status="${safeStatus}" data-title="${safeTitle}" data-date="${safeCreatedAt}">
                        <div class="card-img-container">
                            <img src="${safeImgSrc}" alt="Foto Laporan" class="history-img">
                            <span class="badge-overlay ${badgeClass}"><i data-lucide="${iconName}"></i> ${safeStatus}</span>
                        </div>
                        <div class="history-body">
                            <div class="history-date"><i data-lucide="calendar"></i> ${safeDateDisplay}</div>
                            <h3 class="history-card-title">${safeTitle}</h3>
                            <div class="history-address"><i data-lucide="map-pin"></i> ${safeAddress}</div>
                            <p class="history-desc-text">${safeDescription}</p>
                            ${crowdBadge}
                            <div class="card-divider"></div>
                            <div class="history-actions">
                                <button class="btn btn-outline-orange detail-button" 
                                    data-id="${safeReportId}"
                                    data-title="${safeTitle}" 
                                    data-status="${safeStatus}" 
                                    data-date="${safeDateDisplay}" 
                                    data-address="${safeAddress}" 
                                    data-desc="${safeDescription}" 
                                    data-img="${safeImgSrc}"
                                    data-img-repair="${safeRepairImgSrc}"
                                    data-note="${safeServiceNote}"
                                    data-review-rating="${safeReviewRating}"
                                    data-review-text="${safeReviewText}"
                                    data-affected-count="${escape(affectedCount)}"
                                    data-priority-level="${escape(priorityLevel)}"
                                    data-cluster-support="${escape(isClusterSupport ? 'true' : 'false')}"
                                    data-can-review="${escape(canCurrentUserReview ? 'true' : 'false')}"
                                    data-evidence-count="${escape(evidenceCount)}"
                                    data-current-evidence-desc="${escape(currentEvidenceDesc)}"
                                    data-current-evidence-img="${escape(currentEvidenceImg)}"
                                >Lihat Detail</button>
                            </div>
                        </div>
                    </article>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });

            // Render ulang icon lucide untuk kartu riwayat yang baru di-inject
            if (window.lucide) window.lucide.createIcons();

            // Sembunyikan empty state dan tampilkan container
            if (emptyState) emptyState.style.display = 'none';
            container.style.display = 'grid';
        } else {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            userReports = [];
            populateCsReportSelect();
        }
    } catch (error) {
        console.error("Gagal memuat riwayat:", error);
    }

    function populateCsReportSelect() {
        const select = document.getElementById('csReportSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Pilih laporan...</option>';
        userReports.forEach(report => {
            const option = document.createElement('option');
            option.value = report._id || '';
            option.textContent = `${report.title || 'Laporan'} - ${report.status || 'Menunggu'}`;
            select.appendChild(option);
        });
    }

    const formatChatTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderCsMessages = (messages) => {
        const list = document.getElementById('csMessageList');
        if (!list) return;
        if (!messages.length) {
            list.innerHTML = '<div class="cs-message admin">Belum ada pesan. Tulis pertanyaan Anda terkait laporan ini.</div>';
            return;
        }

        list.innerHTML = messages.map(message => {
            const roleClass = message.sender_role === 'admin' ? 'admin' : 'user';
            const sender = message.sender_role === 'admin' ? 'CS SmartRoad' : 'Anda';
            return `
                <div class="cs-message ${roleClass}">
                    ${escape(message.message || '')}
                    <span class="cs-message-meta">${escape(sender)} • ${escape(formatChatTime(message.created_at))}</span>
                </div>
            `;
        }).join('');
        list.scrollTop = list.scrollHeight;
    };

    async function loadCsMessages(reportId) {
        const list = document.getElementById('csMessageList');
        const subtitle = document.getElementById('csChatSubtitle');
        if (!reportId) {
            if (list) list.innerHTML = '<div class="cs-message admin">Pilih laporan untuk melihat percakapan CS.</div>';
            if (subtitle) subtitle.textContent = 'Pilih laporan untuk mulai chat.';
            return;
        }

        currentCsReportId = reportId;
        if (list) list.innerHTML = '<div class="cs-message admin">Memuat percakapan...</div>';

        try {
            const response = await fetchWithAuth(`/api/reports/${encodeURIComponent(reportId)}/cs-messages`);
            if (!response) return;
            const data = await response.json();
            if (!response.ok) {
                if (list) list.innerHTML = `<div class="cs-message admin">${escape(data.message || 'Gagal memuat chat.')}</div>`;
                return;
            }
            if (subtitle) subtitle.textContent = data.data?.report?.title || 'Chat laporan';
            renderCsMessages(data.data?.messages || []);
        } catch (error) {
            console.error(error);
            if (list) list.innerHTML = '<div class="cs-message admin">Gagal terhubung ke server chat.</div>';
        }
    }

    const openCsChat = async (reportId = '') => {
        const modal = document.getElementById('csChatModal');
        const select = document.getElementById('csReportSelect');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        if (reportId && select) select.value = reportId;
        await loadCsMessages(reportId || select?.value || '');
    };

    const closeCsChat = () => {
        const modal = document.getElementById('csChatModal');
        modal?.classList.remove('active');
        modal?.setAttribute('aria-hidden', 'true');
    };

    document.getElementById('csFloatingBtn')?.addEventListener('click', () => openCsChat(currentCsReportId));
    document.getElementById('csChatCloseBtn')?.addEventListener('click', closeCsChat);
    document.getElementById('csReportSelect')?.addEventListener('change', (event) => loadCsMessages(event.target.value));
    document.getElementById('detailContactLink')?.addEventListener('click', () => {
        const reportId = document.getElementById('reviewReportId')?.value || currentCsReportId;
        openCsChat(reportId);
    });
    document.getElementById('csChatForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = document.getElementById('csMessageInput');
        const message = input?.value.trim() || '';
        const reportId = currentCsReportId || document.getElementById('csReportSelect')?.value;
        if (!reportId) return Swal.fire('Pilih Laporan', 'Pilih laporan terlebih dahulu sebelum mengirim pesan.', 'warning');
        if (!message) return;

        try {
            const response = await fetchWithAuth(`/api/reports/${encodeURIComponent(reportId)}/cs-messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    sender_name: sessionStorage.getItem('userName') || userName || ''
                })
            });
            if (!response) return;
            const data = await response.json();
            if (!response.ok) return Swal.fire('Gagal', data.message || 'Pesan gagal dikirim.', 'error');
            if (input) input.value = '';
            await loadCsMessages(reportId);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Gagal terhubung ke server chat.', 'error');
        }
    });

    const ratingInput = document.getElementById('reviewRating');
    const ratingStars = document.querySelectorAll('.rating-star');
    const reviewForm = document.getElementById('reviewForm');
    const reviewStatus = document.getElementById('reviewStatus');

    const setRating = (rating) => {
        const normalizedRating = Math.max(0, Math.min(5, Number(rating) || 0));
        if (ratingInput) ratingInput.value = String(normalizedRating);
        ratingStars.forEach(star => {
            const starValue = Number(star.dataset.rating || 0);
            star.classList.toggle('active', starValue <= normalizedRating);
        });
    };

    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            setRating(star.dataset.rating);
        });
    });

    reviewForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const reportId = document.getElementById('reviewReportId')?.value;
        const rating = Number(ratingInput?.value || 0);
        const reviewText = document.getElementById('reviewText')?.value.trim() || '';
        const submitReviewBtn = document.getElementById('submitReviewBtn');

        if (!reportId) {
            Swal.fire('Data Tidak Valid', 'ID laporan tidak ditemukan.', 'error');
            return;
        }
        if (rating < 1 || rating > 5) {
            Swal.fire('Rating Belum Dipilih', 'Pilih rating antara 1 sampai 5 bintang.', 'warning');
            return;
        }
        if (!reviewText) {
            Swal.fire('Ulasan Wajib Diisi', 'Tulis ulasan singkat agar dapat ditampilkan pada halaman utama.', 'warning');
            return;
        }

        const originalText = submitReviewBtn?.innerHTML;
        if (submitReviewBtn) {
            submitReviewBtn.disabled = true;
            submitReviewBtn.innerHTML = '<i data-lucide="loader"></i> Menyimpan...';
            if (window.lucide) window.lucide.createIcons();
        }

        try {
            const response = await fetchWithAuth(`/api/reports/${encodeURIComponent(reportId)}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating,
                    review_text: reviewText,
                    reviewer_name: sessionStorage.getItem('userName') || userName || ''
                })
            });
            if (!response) return;

            const data = await response.json();
            if (!response.ok) {
                Swal.fire('Gagal', data.message || 'Penilaian gagal disimpan.', 'error');
                return;
            }

            const activeButton = Array.from(container.querySelectorAll('.detail-button'))
                .find(button => button.dataset.id === reportId);
            if (activeButton) {
                activeButton.dataset.reviewRating = String(rating);
                activeButton.dataset.reviewText = reviewText;
            }

            const reviewExistingBadge = document.getElementById('reviewExistingBadge');
            if (reviewExistingBadge) reviewExistingBadge.style.display = 'inline-flex';
            if (reviewStatus) reviewStatus.textContent = 'Penilaian tersimpan dan siap ditampilkan di halaman utama.';
            Swal.fire('Berhasil', data.message || 'Penilaian berhasil disimpan.', 'success');
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
        } finally {
            if (submitReviewBtn) {
                submitReviewBtn.disabled = false;
                submitReviewBtn.innerHTML = originalText || '<i data-lucide="send"></i> Kirim';
                if (window.lucide) window.lucide.createIcons();
            }
        }
    });

    // --- 4. EVENT DELEGATION MODAL DETAIL ---
    if (container) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.detail-button');
            if (!btn) return;

            const modal = document.getElementById('detailModal');
            if (!modal) return;

            // Ambil data dari atribut tombol
            const reportId = btn.getAttribute('data-id');
            currentCsReportId = reportId || currentCsReportId;
            const title = btn.getAttribute('data-title');
            const status = btn.getAttribute('data-status');
            const date = btn.getAttribute('data-date');
            const address = btn.getAttribute('data-address');
            const desc = btn.getAttribute('data-desc');
            const img = btn.getAttribute('data-img');
            const imgRepair = btn.getAttribute('data-img-repair');
            const note = btn.getAttribute('data-note');
            const reviewRatingValue = parseInt(btn.getAttribute('data-review-rating') || '0', 10);
            const reviewTextValue = btn.getAttribute('data-review-text') || '';
            const affectedCount = btn.getAttribute('data-affected-count') || '1';
            const priorityLevel = btn.getAttribute('data-priority-level') || 'Normal';
            const isClusterSupport = btn.getAttribute('data-cluster-support') === 'true';
            const canCurrentUserReview = btn.getAttribute('data-can-review') === 'true';
            const evidenceCount = btn.getAttribute('data-evidence-count') || '0';
            const currentEvidenceDesc = btn.getAttribute('data-current-evidence-desc') || '';
            const currentEvidenceImg = btn.getAttribute('data-current-evidence-img') || '';

            // Injeksi data ke elemen modal eksisting di riwayat.html
            const detailOriginalPhoto = document.getElementById('detailOriginalPhoto');
            const detailTitle = document.getElementById('detailTitle');
            const detailDate = document.getElementById('detailDate');
            const detailLocation = document.getElementById('detailLocation');
            const detailDescription = document.getElementById('detailDescription');
            const detailStatus = document.getElementById('detailStatus');
            const detailRepairPhoto = document.getElementById('detailRepairPhoto');
            const repairNoPhoto = document.getElementById('repairNoPhoto');
            const detailNote = document.getElementById('detailNote');
            const reviewPanel = document.getElementById('reviewPanel');
            const reviewReportId = document.getElementById('reviewReportId');
            const reviewText = document.getElementById('reviewText');
            const reviewExistingBadge = document.getElementById('reviewExistingBadge');
            const submitReviewBtn = document.getElementById('submitReviewBtn');
            const reviewStatus = document.getElementById('reviewStatus');

            if (detailOriginalPhoto) detailOriginalPhoto.src = img;
            if (detailTitle) detailTitle.textContent = title;
            if (detailDate) detailDate.textContent = date;
            if (detailLocation) detailLocation.textContent = address;
            if (detailDescription) detailDescription.textContent = desc;
            if (detailNote) {
                detailNote.textContent = isClusterSupport
                    ? `Anda tercatat sebagai warga terdampak pada laporan gabungan ini. Foto dan deskripsi tambahan Anda tersimpan sebagai bukti cluster. Total ${affectedCount} warga terdampak, ${evidenceCount} bukti tambahan, prioritas ${priorityLevel}. ${currentEvidenceDesc ? 'Catatan Anda: ' + currentEvidenceDesc : ''}`
                    : (note || `Laporan Anda telah berhasil terdaftar. Saat ini tercatat ${affectedCount} warga terdampak, ${evidenceCount} bukti tambahan, prioritas ${priorityLevel}.`);
            }
            if (isClusterSupport && currentEvidenceImg && detailOriginalPhoto) {
                detailOriginalPhoto.src = currentEvidenceImg;
            }
            if (reviewReportId) reviewReportId.value = reportId || '';
            if (reviewText) reviewText.value = reviewTextValue;
            setRating(Number.isFinite(reviewRatingValue) ? reviewRatingValue : 0);

            const canReview = status === 'Selesai' && canCurrentUserReview;
            if (reviewPanel) reviewPanel.classList.toggle('active', canReview);
            if (reviewExistingBadge) reviewExistingBadge.style.display = reviewRatingValue > 0 ? 'inline-flex' : 'none';
            if (reviewStatus) {
                reviewStatus.textContent = canCurrentUserReview
                    ? (reviewRatingValue > 0
                        ? 'Anda dapat memperbarui penilaian untuk laporan ini.'
                        : 'Penilaian Anda dapat tampil di halaman utama.')
                    : 'Penilaian laporan gabungan hanya dapat diberikan oleh pelapor utama.';
            }
            if (submitReviewBtn) {
                submitReviewBtn.disabled = !canCurrentUserReview;
                submitReviewBtn.innerHTML = reviewRatingValue > 0
                    ? '<i data-lucide="send"></i> Perbarui'
                    : '<i data-lucide="send"></i> Kirim';
            }

            if (detailStatus) {
                detailStatus.textContent = status;
                detailStatus.className = 'detail-status'; // Reset class
                if (status === 'Menunggu' || status === 'Menunggu Verifikasi') detailStatus.classList.add('badge-pending');
                else if (status === 'Sedang Diproses' || status === 'Proses') detailStatus.classList.add('badge-processing');
                else if (status === 'Selesai') detailStatus.classList.add('badge-done');
            }

            // Logika Foto Perbaikan
            if (imgRepair) {
                if (detailRepairPhoto) {
                    detailRepairPhoto.src = imgRepair;
                    detailRepairPhoto.style.display = 'block';
                }
                if (repairNoPhoto) repairNoPhoto.style.display = 'none';
            } else {
                if (detailRepairPhoto) {
                    detailRepairPhoto.src = '';
                    detailRepairPhoto.style.display = 'none';
                }
                if (repairNoPhoto) repairNoPhoto.style.display = 'flex';
            }

            // Tampilkan modal (menggunakan class 'active' bawaan dari riwayat.html)
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Re-render lucide icons inside modal if needed
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // --- 5. LOGIKA TUTUP MODAL ---
    const detailModal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('detailCloseBtn');
    
    const closeModal = () => {
        if (!detailModal) return;
        detailModal.classList.remove('active');
        detailModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeModal();
        });
    }
});
window.logout = function () {
    if (window.clearAuthSession) window.clearAuthSession();
    if (window.showLogoutNotice) window.showLogoutNotice();
    else window.location.href = 'login.html';
};
