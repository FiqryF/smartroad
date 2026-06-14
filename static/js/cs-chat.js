document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('csChatModal')) return;
    if (!sessionStorage.getItem('jwtToken')) return;

    const escape = window.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char])));

    let reports = [];
    let currentReportId = '';

    const style = document.createElement('style');
    style.textContent = `
        .cs-floating-btn {
            position: fixed;
            right: 1.5rem;
            bottom: 1.5rem;
            width: 3.4rem;
            height: 3.4rem;
            border: none;
            border-radius: 50%;
            background: #FF6B00;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1040;
            box-shadow: 0 18px 35px rgba(255, 107, 0, 0.32);
            transition: 0.25s ease;
        }
        .cs-floating-btn:hover {
            transform: translateY(-3px);
            background: #E05E00;
        }
        .cs-chat-modal {
            position: fixed;
            right: 1.5rem;
            bottom: 5.5rem;
            width: min(390px, calc(100vw - 2rem));
            max-height: min(620px, calc(100vh - 7rem));
            background: #fff;
            border: 1px solid #E2E5E8;
            border-radius: 14px;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
            z-index: 1050;
            display: none;
            overflow: hidden;
        }
        .cs-chat-modal.active {
            display: flex;
            flex-direction: column;
        }
        .cs-chat-header {
            padding: 1rem;
            background: #121416;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.8rem;
        }
        .cs-chat-title {
            font-weight: 800;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .cs-chat-subtitle {
            color: #B9C2CB;
            font-size: 0.72rem;
            margin-top: 0.1rem;
        }
        .cs-chat-close {
            border: 0;
            background: transparent;
            color: #B9C2CB;
            cursor: pointer;
            font-size: 1.2rem;
        }
        .cs-report-select {
            margin: 0.85rem 1rem 0;
            width: calc(100% - 2rem);
            border: 1px solid #E2E5E8;
            border-radius: 8px;
            padding: 0.65rem 0.75rem;
            font-family: inherit;
            font-size: 0.8rem;
            outline: none;
        }
        .cs-message-list {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.7rem;
            min-height: 260px;
            max-height: 360px;
        }
        .cs-message {
            max-width: 86%;
            padding: 0.7rem 0.8rem;
            border-radius: 12px;
            font-size: 0.82rem;
            line-height: 1.45;
        }
        .cs-message.user {
            margin-left: auto;
            background: #FF6B00;
            color: #fff;
            border-bottom-right-radius: 4px;
        }
        .cs-message.admin {
            margin-right: auto;
            background: #F8F9FA;
            color: #121416;
            border-bottom-left-radius: 4px;
        }
        .cs-message-meta {
            display: block;
            font-size: 0.66rem;
            opacity: 0.72;
            margin-top: 0.3rem;
            font-weight: 700;
        }
        .cs-chat-form {
            display: flex;
            gap: 0.6rem;
            padding: 0.85rem 1rem 1rem;
            border-top: 1px solid #E2E5E8;
            background: #fff;
        }
        .cs-chat-form textarea {
            flex: 1;
            resize: none;
            min-height: 42px;
            max-height: 84px;
            border: 1px solid #E2E5E8;
            border-radius: 8px;
            padding: 0.7rem 0.75rem;
            font-family: inherit;
            font-size: 0.82rem;
            outline: none;
        }
        .cs-chat-form button {
            width: 42px;
            border: none;
            border-radius: 8px;
            background: #FF6B00;
            color: #fff;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML('beforeend', `
        <button type="button" class="cs-floating-btn" id="csFloatingBtn" aria-label="Buka chat CS">
            <i data-lucide="headphones"></i>
        </button>
        <div class="cs-chat-modal" id="csChatModal" aria-hidden="true">
            <div class="cs-chat-header">
                <div>
                    <div class="cs-chat-title">SmartRoad CS</div>
                    <div class="cs-chat-subtitle" id="csChatSubtitle">Pilih laporan untuk mulai chat.</div>
                </div>
                <button type="button" class="cs-chat-close" id="csChatCloseBtn" aria-label="Tutup chat">&times;</button>
            </div>
            <select id="csReportSelect" class="cs-report-select" aria-label="Pilih laporan">
                <option value="">Pilih laporan...</option>
            </select>
            <div class="cs-message-list" id="csMessageList">
                <div class="cs-message admin">Pilih laporan untuk melihat percakapan CS.</div>
            </div>
            <form class="cs-chat-form" id="csChatForm">
                <textarea id="csMessageInput" placeholder="Tulis pertanyaan terkait laporan..." maxlength="1000"></textarea>
                <button type="submit" aria-label="Kirim pesan"><i data-lucide="send"></i></button>
            </form>
        </div>
    `);

    const formatChatTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const populateReportSelect = () => {
        const select = document.getElementById('csReportSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Pilih laporan...</option>';
        reports.forEach(report => {
            const option = document.createElement('option');
            option.value = report._id || '';
            option.textContent = `${report.title || 'Laporan'} - ${report.status || 'Menunggu'}`;
            select.appendChild(option);
        });
    };

    const renderMessages = (messages) => {
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
                    <span class="cs-message-meta">${escape(sender)} - ${escape(formatChatTime(message.created_at))}</span>
                </div>
            `;
        }).join('');
        list.scrollTop = list.scrollHeight;
    };

    const loadMessages = async (reportId) => {
        const list = document.getElementById('csMessageList');
        const subtitle = document.getElementById('csChatSubtitle');
        if (!reportId) {
            if (list) list.innerHTML = '<div class="cs-message admin">Pilih laporan untuk melihat percakapan CS.</div>';
            if (subtitle) subtitle.textContent = 'Pilih laporan untuk mulai chat.';
            return;
        }

        currentReportId = reportId;
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
            renderMessages(data.data?.messages || []);
            if (window.loadUserNotifications) window.loadUserNotifications();
        } catch (error) {
            console.error(error);
            if (list) list.innerHTML = '<div class="cs-message admin">Gagal terhubung ke server chat.</div>';
        }
    };

    const loadReports = async () => {
        try {
            const response = await fetchWithAuth('/api/reports/user');
            if (!response) return;
            const data = await response.json();
            reports = response.ok && Array.isArray(data.data) ? data.data : [];
            populateReportSelect();
        } catch (error) {
            console.error('Gagal memuat laporan untuk chat CS:', error);
        }
    };

    const openChat = async () => {
        const modal = document.getElementById('csChatModal');
        const select = document.getElementById('csReportSelect');
        modal?.classList.add('active');
        modal?.setAttribute('aria-hidden', 'false');
        await loadMessages(currentReportId || select?.value || '');
    };

    const closeChat = () => {
        const modal = document.getElementById('csChatModal');
        modal?.classList.remove('active');
        modal?.setAttribute('aria-hidden', 'true');
    };

    document.getElementById('csFloatingBtn')?.addEventListener('click', openChat);
    document.getElementById('csChatCloseBtn')?.addEventListener('click', closeChat);
    document.getElementById('csReportSelect')?.addEventListener('change', event => loadMessages(event.target.value));
    document.getElementById('csChatForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = document.getElementById('csMessageInput');
        const message = input?.value.trim() || '';
        const reportId = currentReportId || document.getElementById('csReportSelect')?.value;
        if (!reportId) {
            alert('Pilih laporan terlebih dahulu sebelum mengirim pesan.');
            return;
        }
        if (!message) return;

        try {
            const response = await fetchWithAuth(`/api/reports/${encodeURIComponent(reportId)}/cs-messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    sender_name: sessionStorage.getItem('userName') || ''
                })
            });
            if (!response) return;
            const data = await response.json();
            if (!response.ok) {
                alert(data.message || 'Pesan gagal dikirim.');
                return;
            }
            if (input) input.value = '';
            await loadMessages(reportId);
        } catch (error) {
            console.error(error);
            alert('Gagal terhubung ke server chat.');
        }
    });

    loadReports();
    if (window.lucide) window.lucide.createIcons();
});
