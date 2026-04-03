
// ── State ──
let state = {
    sessionId: null,
    sessionName: '',
    subscribers: [],
    history: [],
    prizes: [],
    mults: {
        t1: 1,
        t2: 5,
        t3: 10,
        gift: 1,
        prime: 1,
        founder: 1
    },
    recurringOnly: false,
    excludeWinners: false
};
let conflicts = [],
    conflictIdx = 0,
    pendingNew = [];
let drawInterval = null;
let selectedPrizeId = null;
let pendingImportData = null;

const PAGE_TITLES = {
    home: '使用教學',
    sessions: '場次管理',
    import: '抽獎名單',
    settings: '加成設定',
    prizes: '獎品列表',
    draw: '開始抽獎',
    history: '抽獎紀錄',
    transfer: '匯入 / 匯出'
};

// ── localStorage ──
const LS_SESSIONS = 'lottery_sessions';
const LS_ACTIVE = 'lottery_active_session';

function getAllSessions() {
    try {
        return JSON.parse(localStorage.getItem(LS_SESSIONS)) || {};
    } catch {
        return {};
    }
}

function saveSession() {
    if (!state.sessionId) return;
    const sessions = getAllSessions();
    sessions[state.sessionId] = {
        name: state.sessionName,
        subscribers: state.subscribers,
        history: state.history,
        prizes: state.prizes,
        mults: state.mults,
        recurringOnly: state.recurringOnly,
        excludeWinners: state.excludeWinners,
        updatedAt: Date.now()
    };
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(LS_ACTIVE, state.sessionId);
}

function loadSession(id) {
    const sessions = getAllSessions();
    const s = sessions[id];
    if (!s) return false;
    state.sessionId = id;
    state.sessionName = s.name || '未命名場次';
    state.subscribers = s.subscribers || [];
    state.history = s.history || [];
    state.prizes = s.prizes || [];
    state.mults = Object.assign({
        t1: 1,
        t2: 5,
        t3: 10,
        gift: 1,
        prime: 1,
        founder: 1
    }, s.mults || {});
    state.recurringOnly = s.recurringOnly || false;
    state.excludeWinners = s.excludeWinners || false;
    return true;
}

function deleteSession(id) {
    const sessions = getAllSessions();
    delete sessions[id];
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
    if (state.sessionId === id) {
        const keys = Object.keys(sessions);
        if (keys.length) loadSession(keys[0]);
        else initDefaultSession();
    }
}

function initDefaultSession() {
    const id = 'session_' + Date.now();
    state.sessionId = id;
    state.sessionName = '預設場次';
    state.subscribers = [];
    state.history = [];
    state.prizes = [];
    state.recurringOnly = false;
    state.mults = {
        t1: 1,
        t2: 5,
        t3: 10,
        gift: 1,
        prime: 1,
        founder: 1
    };
    saveSession();
}

// ── Init ──
function init() {
    const active = localStorage.getItem(LS_ACTIVE);
    if (active && loadSession(active)) {
        /* ok */
    } else {
        const sessions = getAllSessions();
        const keys = Object.keys(sessions);
        if (keys.length) loadSession(keys[0]);
        else initDefaultSession();
    }
    applyState();
    const lastPage = localStorage.getItem('lottery_current_page');
    if (lastPage && document.getElementById('page-' + lastPage)) showPage(lastPage);
}

function applyState() {
    ['t1', 't2', 't3', 'gift', 'prime', 'founder'].forEach(k => {
        const el = document.getElementById('mult-' + k);
        if (el) el.value = state.mults[k];
    });
    applyRecurringOnlyUI();
    applyExcludeWinnersUI();
    renderTable();
    refreshDraw();
    renderHistory();
    renderSessions();
    updateSidebarSession();
    refreshExportSelect();
}

function updateSidebarSession() {
    document.getElementById('sidebar-session-name').textContent = state.sessionName || '—';
    document.getElementById('draw-session-label').textContent = state.sessionName || '—';
    document.getElementById('history-session-label').textContent = state.sessionName || '—';
    document.getElementById('mob-session-name').textContent = state.sessionName || '—';
}

// ── Mobile sidebar ──
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const ham = document.getElementById('hamburger');
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        ham.classList.remove('open');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        ham.classList.add('open');
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
}

// ── Navigation ──
function showPage(p) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === p));
    document.getElementById('page-' + p).classList.add('active');
    localStorage.setItem('lottery_current_page', p);
    document.getElementById('mob-page-title').textContent = PAGE_TITLES[p] || p;
    closeSidebar();
    if (p === 'draw') refreshDraw();
    if (p === 'settings') renderOverrides();
    if (p === 'history') renderHistory();
    if (p === 'sessions') renderSessions();
    if (p === 'prizes') renderPrizes();
    if (p === 'transfer') {
        refreshExportSelect();
        cancelImport();
    }
}

function saveMults() {
    state.mults.t1 = parseInt(document.getElementById('mult-t1').value) || 0;
    state.mults.t2 = parseInt(document.getElementById('mult-t2').value) || 0;
    state.mults.t3 = parseInt(document.getElementById('mult-t3').value) || 0;
    state.mults.gift = parseFloat(document.getElementById('mult-gift').value) || 1;
    state.mults.prime = parseFloat(document.getElementById('mult-prime').value) || 1;
    state.mults.founder = parseFloat(document.getElementById('mult-founder').value) || 1;
    saveSession();
    renderTable();
    refreshDraw();
    renderOverrides();
}

// ── Import Tabs ──
function switchImportTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('import-tab-' + tab).classList.add('active');
}

// ── Helpers ──
function tierBadge(t) {
    const map = {
        'Tier1': 'b-t1',
        'Tier2': 'b-t2',
        'Tier3': 'b-t3',
        '層級一': 'b-t1',
        '層級二': 'b-t2',
        '層級三': 'b-t3'
    };
    const label = {
        'Tier1': '層級一',
        'Tier2': '層級二',
        'Tier3': '層級三',
        '層級一': '層級一',
        '層級二': '層級二',
        '層級三': '層級三'
    };
    return `<span class="badge ${map[t] || 'b-t1'}">${label[t] || t}</span>`;
}

function typeBadge(t) {
    if (!t) return '';
    const tl = t.toLowerCase();
    if (tl === 'gift') return `<span class="badge b-gift">贈禮訂閱</span>`;
    if (tl === 'prime') return `<span class="badge b-prime">Prime 訂閱</span>`;
    if (tl === 'recurring' || tl === 'paid') return `<span class="badge b-recurring">自主訂閱</span>`;
    return `<span class="badge b-prime">${t}</span>`;
}

function normTier(t) {
    const tl = (t || '').toLowerCase().replace(/\s/g, '');
    if (tl === 'tier1' || tl === '1' || tl === '層級一') return '層級一';
    if (tl === 'tier2' || tl === '2' || tl === '層級二') return '層級二';
    if (tl === 'tier3' || tl === '3' || tl === '層級三') return '層級三';
    return '層級一';
}

function getTierBase(tier) {
    if (tier === '層級一') return state.mults.t1;
    if (tier === '層級二') return state.mults.t2;
    if (tier === '層級三') return state.mults.t3;
    return state.mults.t1;
}

function getSubMult(st) {
    const tl = (st || '').toLowerCase();
    if (state.recurringOnly && tl === 'gift') return 0;
    if (tl === 'gift') return state.mults.gift;
    if (tl === 'prime') return state.mults.prime;
    return 1;
}

function toggleRecurringOnly() {
    state.recurringOnly = !state.recurringOnly;
    applyRecurringOnlyUI();
    saveSession();
    renderTable();
    refreshDraw();
    renderOverrides();
}

function applyRecurringOnlyUI() {
    const on = state.recurringOnly;
    const toggle = document.getElementById('recurring-only-toggle');
    const knob = document.getElementById('recurring-only-knob');
    const label = document.getElementById('recurring-only-label');
    if (!toggle) return;
    toggle.style.background = on ? 'var(--accent)' : 'var(--bg4)';
    toggle.style.borderColor = on ? 'var(--accent)' : 'var(--border2)';
    knob.style.left = on ? '18px' : '2px';
    knob.style.background = on ? '#06080f' : 'var(--text3)';
    label.textContent = on ? '開啟' : '關閉';
    label.style.color = on ? 'var(--accent)' : 'var(--text3)';
    const giftInput = document.getElementById('mult-gift');
    if (giftInput) {
        giftInput.disabled = on;
        giftInput.style.opacity = on ? '0.3' : '1';
    }
}

function isFounder(s) {
    const v = (s.founder || '').toString().toLowerCase().trim();
    return v === 'true' || v === 'yes' || v === '1';
}

function getTickets(s) {
    if (s.excluded) return 0;
    const base = s.customMult !== undefined ? s.customMult : getTierBase(s.tier);
    return Math.max(0, Math.round(base * getSubMult(s.subType) * (isFounder(s) ? state.mults.founder : 1)));
}

function prizeUsedCount(prizeId) {
    if (!prizeId) return 0;
    return state.history.filter(h => h.prizeId === prizeId).length;
}

function prizeRemaining(prize) {
    return Math.max(0, prize.qty - prizeUsedCount(prize.id));
}

// ── CSV Parse ──
function parseCSVLine(line) {
    const cols = [];
    let cur = '',
        inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQ = !inQ;
            }
        } else if (ch === ',' && !inQ) {
            cols.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    cols.push(cur.trim());
    return cols;
}

function parseCSV(raw) {
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length < 2) return {
        entries: [],
        error: '至少需要標題行和一行資料'
    };
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    const find = (...keys) => {
        for (const k of keys) {
            const i = headers.findIndex(h => h.includes(k));
            if (i >= 0) return i;
        }
        return -1;
    };
    const idx = {
        username: find('username'),
        date: find('subscribe date', 'date'),
        tier: find('current tier', 'tier'),
        tenure: find('tenure'),
        streak: find('streak'),
        subtype: find('sub type', 'subtype', 'type'),
        founder: find('founder')
    };
    const entries = [];
    for (let i = 1; i < lines.length; i++) {
        const c = parseCSVLine(lines[i]);
        const e = {
            username: (c[idx.username] || '').trim(),
            date: (c[idx.date] || '').trim(),
            tier: normTier((c[idx.tier] || '').trim()),
            tenure: parseInt(c[idx.tenure] || 0) || 0,
            streak: parseInt(c[idx.streak] || 0) || 0,
            subType: (c[idx.subtype] || 'Paid').trim(),
            founder: (c[idx.founder] || 'No').trim(),
            excluded: false
        };
        if (e.username) entries.push(e);
    }
    return {
        entries,
        error: null
    };
}

function loadCSVFile(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('file-name-label').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('csv-input').value = e.target.result;
        toast('已載入：' + file.name);
    };
    reader.readAsText(file, 'UTF-8');
    input.value = '';
}

function parseData() {
    const raw = document.getElementById('csv-input').value.trim();
    if (!raw) {
        setMsg('請貼上資料');
        return;
    }
    const {
        entries,
        error
    } = parseCSV(raw);
    if (error) {
        setMsg(error);
        return;
    }
    state.subscribers = [];
    processConflicts(entries);
}

function appendData() {
    const raw = document.getElementById('csv-input').value.trim();
    if (!raw) {
        setMsg('請貼上資料');
        return;
    }
    const {
        entries,
        error
    } = parseCSV(raw);
    if (error) {
        setMsg(error);
        return;
    }
    processConflicts(entries);
}

function processConflicts(entries) {
    const seenInBatch = new Map();
    const internalDups = [];
    entries.forEach(e => {
        const key = e.username.toLowerCase();
        if (seenInBatch.has(key)) internalDups.push({
            incoming: e,
            existing: seenInBatch.get(key)
        });
        else seenInBatch.set(key, e);
    });
    const uniqueEntries = [...seenInBatch.values()];
    const externalDups = uniqueEntries.filter(e => state.subscribers.some(s => s.username.toLowerCase() === e.username.toLowerCase()));
    const allDups = [
        ...internalDups,
        ...externalDups.map(e => ({
            incoming: e,
            existing: state.subscribers.find(s => s.username.toLowerCase() === e.username.toLowerCase())
        }))
    ];
    if (allDups.length) {
        pendingNew = uniqueEntries;
        conflicts = allDups;
        conflictIdx = 0;
        showConflictModal();
    } else {
        mergeEntries(uniqueEntries);
        finishImport(uniqueEntries.length);
    }
}

function mergeEntries(entries) {
    entries.forEach(e => {
        if (!state.subscribers.find(s => s.username.toLowerCase() === e.username.toLowerCase()))
            state.subscribers.push(e);
    });
}

function finishImport(count) {
    saveSession();
    setMsg(`匯入完成，共 ${state.subscribers.length} 筆`);
    renderTable();
    refreshDraw();
    toast(`成功匯入 ${count} 筆訂閱者`);
}

function clearData() {
    if (!state.subscribers.length) return;
    if (!confirm('確定清除所有訂閱者資料？')) return;
    state.subscribers = [];
    saveSession();
    renderTable();
    refreshDraw();
    setMsg('');
    toast('資料已清除');
}

function setMsg(m) {
    document.getElementById('import-msg').textContent = m;
}

// ── Manual Entry ──
function addManualSingle() {
    const username = document.getElementById('manual-username').value.trim();
    if (!username) {
        toast('請輸入帳號名稱');
        return;
    }

    const tierRaw = document.getElementById('manual-tier').value;
    const subType = document.getElementById('manual-subtype').value;
    // const founder = document.getElementById('manual-founder').value;
    const founder = false;
    // const tenure = parseInt(document.getElementById('manual-tenure').value) || 1;
    const tenure = 1;

    const entry = {
        username,
        date: new Date().toISOString().split('T')[0],
        tier: normTier(tierRaw),
        tenure,
        streak: 0,
        subType,
        founder,
        excluded: false
    };

    const existing = state.subscribers.find(s => s.username.toLowerCase() === username.toLowerCase());
    if (existing) {
        toast(`帳號「${username}」已存在於名單中`);
        return;
    }

    state.subscribers.push(entry);
    saveSession();
    renderTable();
    refreshDraw();

    document.getElementById('manual-username').value = '';
    document.getElementById('manual-username').focus();
    toast(`已新增：${username}`);
}

function addBulkManual(append = false) {
    const raw = document.getElementById('bulk-manual-input').value.trim();
    if (!raw) {
        document.getElementById('manual-msg').textContent = '請輸入帳號資料';
        return;
    }
    const defaultType = document.getElementById('bulk-default-type').value;
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const entries = [];

    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        const username = parts[0];
        if (!username) continue;

        const tierRaw = parts[1] || 'Tier1';
        entries.push({
            username,
            date: new Date().toISOString().split('T')[0],
            tier: normTier(tierRaw),
            tenure: 1,
            streak: 0,
            subType: defaultType,
            founder: 'No',
            excluded: false
        });
    }

    if (!entries.length) {
        document.getElementById('manual-msg').textContent = '沒有有效資料';
        return;
    }

    if (!append) state.subscribers = [];
    processConflicts(entries);
    document.getElementById('manual-msg').textContent = '';
}

// ── Conflict modal ──
function showConflictModal() {
    const c = conflicts[conflictIdx];
    document.getElementById('cm-title').textContent = `重複使用者 (${conflictIdx + 1}/${conflicts.length})`;
    const isInternal = !state.subscribers.some(s => s.username.toLowerCase() === c.existing.username.toLowerCase());
    document.getElementById('cm-desc').textContent = isInternal ?
        `"${c.existing.username}" 在這份 CSV 裡出現多次（不同層級），請選擇保留哪一筆：` :
        `"${c.existing.username}" 已存在於名單中，請選擇保留哪一筆：`;
    document.getElementById('cm-choices').innerHTML = [{
        label: '現有資料',
        d: c.existing,
        cls: 'existing'
    },
    {
        label: '新匯入資料',
        d: c.incoming,
        cls: 'incoming'
    }
    ].map((opt, i) => `
                <div class="conflict-card ${i === 0 ? 'selected' : ''}" data-choice="${opt.cls}" onclick="selConflict(this)">
                    <div class="cc-name">${opt.d.username} <span style="font-size:11px;color:var(--text3)">${opt.label}</span></div>
                    <div class="cc-detail">${tierBadge(opt.d.tier)}${typeBadge(opt.d.subType)}${isFounder(opt.d) ? '<span class="badge b-founder">創建者</span>' : ''}</div>
                    <div class="cc-chips">
                        <span class="chip">訂閱日 ${opt.d.date}</span>
                        <span class="chip">資歷 ${opt.d.tenure}</span>
                        <span class="chip">連續 ${opt.d.streak}</span>
                    </div>
                </div>
            `).join('');
    document.getElementById('conflict-modal').classList.add('open');
}

function selConflict(el) {
    el.closest('#cm-choices').querySelectorAll('.conflict-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

function resolveConflict() {
    const sel = document.querySelector('#cm-choices .conflict-card.selected');
    if (!sel) return;
    const c = conflicts[conflictIdx];
    if (sel.dataset.choice === 'incoming') {
        const i = state.subscribers.findIndex(s => s.username.toLowerCase() === c.existing.username.toLowerCase());
        if (i >= 0) state.subscribers[i] = c.incoming;
        else state.subscribers.push(c.incoming);
    }
    nextConflict();
}

function resolveKeepBoth() {
    conflicts[conflictIdx].incoming.username += '_new';
    state.subscribers.push(conflicts[conflictIdx].incoming);
    nextConflict();
}

function nextConflict() {
    conflictIdx++;
    if (conflictIdx >= conflicts.length) {
        document.getElementById('conflict-modal').classList.remove('open');
        mergeEntries(pendingNew);
        finishImport(pendingNew.length);
        conflicts = [];
        pendingNew = [];
    } else showConflictModal();
}

// ── Render table ──
function renderTable() {
    const sec = document.getElementById('table-section');
    const has = state.subscribers.length > 0;
    sec.style.display = has ? 'block' : 'none';
    if (!has) return;
    const s = state.subscribers;
    const pool = s.filter(x => !x.excluded);
    const totalTickets = pool.reduce((a, x) => a + getTickets(x), 0);
    document.getElementById('stats-grid').innerHTML = [
        [s.length, '訂閱人數'],
        [s.filter(x => x.tier === '層級一').length, '層級一'],
        [s.filter(x => x.tier === '層級二').length, '層級二'],
        [s.filter(x => x.tier === '層級三').length, '層級三'],
        [s.filter(x => isFounder(x)).length, '創建者'],
        [totalTickets, '總票數'],
    ].map(([n, l]) => `<div class="stat-card"><div class="stat-n">${n}</div><div class="stat-l">${l}</div></div>`).join('');
    document.getElementById('sub-body').innerHTML = s.map((x, i) => `
                <tr class="${x.excluded ? 'excluded' : ''}" id="row-${i}">
                    <td style="color:var(--text);font-weight:600;">${x.username}</td>
                    <td style="color:var(--text3)">${x.date}</td>
                    <td>${tierBadge(x.tier)}</td>
                    <td>${x.tenure}</td><td>${x.streak}</td>
                    <td>${typeBadge(x.subType)}</td>
                    <td>${isFounder(x) ? '<span class="badge b-founder">是</span>' : '-'}</td>
                    <td><input type="number" value="${x.customMult !== undefined ? x.customMult : getTierBase(x.tier)}" min="0" max="9999" style="width:60px;text-align:center;padding:4px 6px" onchange="setCustomMult(${i},this.value)"></td>
                    <td><button class="btn btn-sm ${x.excluded ? 'btn-accent' : 'btn-danger'}" onclick="toggleExclude(${i})">${x.excluded ? '恢復' : '排除'}</button></td>
                </tr>
            `).join('');
}

function setCustomMult(i, v) {
    state.subscribers[i].customMult = Math.max(0, parseInt(v) || 0);
    saveSession();
    refreshDraw();
}

function toggleExclude(i) {
    state.subscribers[i].excluded = !state.subscribers[i].excluded;
    saveSession();
    renderTable();
    renderOverrides();
    refreshDraw();
}

// ── Overrides ──
function renderOverrides() {
    const el = document.getElementById('custom-overrides-wrap');
    if (!state.subscribers.length) {
        el.innerHTML = '<div class="empty">請先匯入訂閱者資料</div>';
        return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
                <thead><tr><th>觀眾帳號</th><th>訂閱層級</th><th>訂閱類型</th><th>創建者</th><th>自訂票數</th><th>實際票數</th><th></th></tr></thead>
                <tbody>${state.subscribers.map((s, i) => `
                <tr>
                    <td style="font-weight:600;color:var(--text)">${s.username}</td>
                    <td>${tierBadge(s.tier)}</td><td>${typeBadge(s.subType)}</td>
                    <td>${isFounder(s) ? '<span class="badge b-founder">是</span>' : '-'}</td>
                    <td><input type="number" value="${s.customMult !== undefined ? s.customMult : getTierBase(s.tier)}" min="0" max="9999" style="width:70px;text-align:center;padding:4px 6px" onchange="setCustomMult(${i},this.value)"></td>
                    <td style="${getTickets(s) > 0 ? 'color:var(--accent);font-weight:600' : ''}">${getTickets(s)}</td>
                    <td><button class="btn btn-sm ${s.excluded ? 'btn-accent' : 'btn-danger'}" onclick="toggleExclude(${i})">${s.excluded ? '恢復' : '排除'}</button></td>
                </tr>
                `).join('')}</tbody>
            </table></div>`;
}

// ── Draw ──
function refreshDraw() {
    const pool = state.subscribers.filter(s => !s.excluded);
    const has = pool.length > 0;
    document.getElementById('draw-no-data').style.display = has ? 'none' : 'block';
    document.getElementById('draw-content').style.display = has ? 'block' : 'none';
    if (!has) return;
    const winnersSet = state.excludeWinners ? new Set(state.history.map(h => h.username.toLowerCase())) : null;
    const eligible = pool.filter(s => !winnersSet || !winnersSet.has(s.username.toLowerCase()));
    const totalTickets = eligible.reduce((a, s) => a + getTickets(s), 0);
    document.getElementById('draw-stats').innerHTML = [
        [eligible.length, '可參與人數'],
        [state.subscribers.length - pool.length, '已排除'],
        [winnersSet ? winnersSet.size : 0, '已中獎'],
        [totalTickets, '總票數']
    ].map(([n, l]) => `<div class="stat-card"><div class="stat-n">${n}</div><div class="stat-l">${l}</div></div>`).join('');
    const sorted = [...eligible].sort((a, b) => getTickets(b) - getTickets(a)).slice(0, 15);
    const maxT = sorted[0] ? getTickets(sorted[0]) : 1;
    document.getElementById('pool-preview').innerHTML = sorted.map(s => {
        const t = getTickets(s),
            pct = totalTickets > 0 ? (t / totalTickets * 100).toFixed(1) : '0.0',
            w = totalTickets > 0 ? (t / maxT * 100).toFixed(1) : '0';
        return `<div class="pool-item">
                    <div class="pool-item-head">
                        <div class="pool-item-name">${tierBadge(s.tier)}<span>${s.username}</span></div>
                        <span class="pool-item-pct">${t} 票 / ${pct}%</span>
                    </div>
                    <div class="pool-bar"><div class="pool-fill" style="width:${w}%"></div></div>
                </div>`;
    }).join('');
}

function buildPool() {
    const winnersSet = state.excludeWinners ?
        new Set(state.history.map(h => h.username.toLowerCase())) : null;
    const pool = [];
    state.subscribers.filter(s => !s.excluded).forEach(s => {
        if (winnersSet && winnersSet.has(s.username.toLowerCase())) return;
        const t = getTickets(s);
        for (let i = 0; i < t; i++) pool.push(s);
    });
    return pool;
}

function toggleExcludeWinner() {
    state.excludeWinners = !state.excludeWinners;
    applyExcludeWinnersUI();
    saveSession();
    refreshDraw();
}

function applyExcludeWinnersUI() {
    const on = state.excludeWinners;
    const btn = document.getElementById('exclude-winner-btn');
    const lbl = document.getElementById('exclude-winner-label');
    if (!btn) return;
    if (on) {
        btn.classList.add('btn-accent');
        btn.style.color = 'var(--danger)';
        btn.style.borderColor = 'rgba(255,107,107,0.3)';
        btn.style.background = 'rgba(255,107,107,0.08)';
        lbl.textContent = '排除中獎者';
    } else {
        btn.className = 'btn';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.background = '';
        lbl.textContent = '中獎可重複';
    }
}

function getDrawCount() {
    if (!selectedPrizeId) return 1;
    const prize = state.prizes.find(p => p.id === selectedPrizeId);
    if (!prize) return 1;
    return Math.max(1, prizeRemaining(prize));
}

function startDraw() {
    const pool = buildPool();
    if (!pool.length) {
        toast('抽獎池為空');
        return;
    }
    if (drawInterval) clearInterval(drawInterval);
    document.getElementById('draw-btn').disabled = true;
    document.getElementById('draw-again-btn').style.display = 'none';
    const drawCount = getDrawCount();
    const stage = document.getElementById('draw-stage');
    let tick = 0;
    const total = 24 + Math.floor(Math.random() * 10);
    drawInterval = setInterval(() => {
        const r = pool[Math.floor(Math.random() * pool.length)];
        stage.innerHTML = `<div class="draw-rolling"><div class="roll-name">${r.username}</div></div>`;
        tick++;
        if (tick >= total) {
            clearInterval(drawInterval);
            const unique = [...new Map(pool.map(s => [s.username, s])).values()];
            for (let i = unique.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unique[i], unique[j]] = [unique[j], unique[i]];
            }
            const winners = unique.slice(0, Math.min(drawCount, unique.length));
            showWinner(winners, pool.length);
        }
    }, 80);
}

function showWinner(winners, poolSize) {
    const prize = selectedPrizeId ? state.prizes.find(p => p.id === selectedPrizeId) : null;
    const stage = document.getElementById('draw-stage');
    const time = new Date().toLocaleString();
    if (winners.length === 1) {
        const w = winners[0];
        const tickets = getTickets(w);
        const pct = poolSize > 0 ? (tickets / poolSize * 100).toFixed(2) : '0.00';
        stage.innerHTML = `<div class="draw-winner">
                    <div class="w-label">— 恭喜得獎 —</div>
                    <div class="w-name">${w.username}</div>
                    <div class="w-badges">${tierBadge(w.tier)}${typeBadge(w.subType)}${isFounder(w) ? '<span class="badge b-founder">創建者</span>' : ''}${prize ? `<span class="prize-tag">${prize.name}</span>` : ''}</div>
                    <div class="w-meta">${tickets} 票 &nbsp;·&nbsp; 中獎機率 ${pct}%</div>
                </div>`;
    } else {
        stage.innerHTML = `
                <div style="text-align:center;margin-bottom:10px">
                    <div style="font-size:12px;color:var(--text3);letter-spacing:0.08em">— 恭喜以下 ${winners.length} 位得獎者 —</div>
                    ${prize ? `<div style="margin-top:6px"><span class="prize-tag">${prize.name}</span></div>` : ''}
                </div>
                <div class="multi-winner-list">
                    ${winners.map((w, i) => `
                        <div class="multi-winner-item" style="animation-delay:${i * 0.06}s">
                            <div class="mw-rank">#${state.history.length + i + 1}</div>
                            <div class="mw-name">${w.username}</div>
                            <div class="mw-badges">${tierBadge(w.tier)}${typeBadge(w.subType)}${isFounder(w) ? '<span class="badge b-founder">創建者</span>' : ''}</div>
                        </div>
                    `).join('')}
                </div>`;
    }
    document.getElementById('draw-btn').disabled = false;
    document.getElementById('draw-again-btn').style.display = 'inline-flex';
    winners.forEach(w => {
        const tickets = getTickets(w);
        const pct = poolSize > 0 ? (tickets / poolSize * 100).toFixed(2) : '0.00';
        startDrawEffect();
        state.history.push({
            username: w.username,
            tier: w.tier,
            subType: w.subType,
            founder: w.founder,
            tickets,
            pct,
            prizeId: prize ? prize.id : null,
            prize: prize ? prize.name : null,
            time,
            session: state.sessionName
        });
    });
    saveSession();
    renderHistory();
    renderPrizes();
    updatePrizePickBtn();
    refreshDraw();
}

// ── History ──
function historyItemHTML(h, i) {
    return `<div class="history-item">
                <div class="hi-rank ${i === 0 ? 'first' : ''}">#${i + 1}</div>
                <div class="hi-info">
                    <div class="hi-name">${h.username}${h.prize ? ` <span class="prize-tag" style="font-size:11px;margin-left:4px">${h.prize}</span>` : ''}</div>
                    <div class="hi-meta">${tierBadge(h.tier)}${typeBadge(h.subType)}<span>${h.tickets} 票</span><span>${h.pct}% 機率</span></div>
                </div>
                <div class="hi-time">${h.time}</div>
            </div>`;
}

function renderHistory() {
    const count = state.history.length;
    const emptyHTML = '<div class="empty">尚無紀錄</div>';
    const listHTML = count ? state.history.map((h, i) => historyItemHTML(h, i)).join('') : emptyHTML;
    ['draw-history-list', 'history-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = listHTML;
    });
    const dc = document.getElementById('draw-history-count');
    if (dc) dc.textContent = count + ' 筆';
    const hc = document.getElementById('history-count');
    if (hc) hc.textContent = count + ' 筆紀錄';
}

function clearHistory() {
    if (!state.history.length) return;
    if (!confirm('確定清除本場次所有紀錄？')) return;
    state.history = [];
    saveSession();
    renderHistory();
    renderPrizes();
    updatePrizePickBtn();
    toast('紀錄已清除');
    const stage = document.getElementById('draw-stage');
    stage.innerHTML = `<div class="draw-idle">按下「開始抽獎」</div>`;
    document.getElementById('draw-again-btn').style.display = 'none';
}

// ── Sessions ──
function createSession() {
    const name = document.getElementById('new-session-input').value.trim();
    if (!name) {
        toast('請輸入場次名稱');
        return;
    }
    const id = 'session_' + Date.now();
    state.sessionId = id;
    state.sessionName = name;
    state.subscribers = [];
    state.history = [];
    state.prizes = [];
    state.recurringOnly = false;
    state.excludeWinners = false;
    state.mults = {
        t1: 1,
        t2: 5,
        t3: 10,
        gift: 1,
        prime: 1,
        founder: 1
    };
    saveSession();
    applyState();
    document.getElementById('new-session-input').value = '';
    toast('場次已建立：' + name);
    renderSessions();
}

function switchSession(id) {
    if (loadSession(id)) {
        saveSession();
        applyState();
        toast('已切換至：' + state.sessionName);
    }
}

function renderSessions() {
    const el = document.getElementById('sessions-list');
    const sessions = getAllSessions();
    const keys = Object.keys(sessions).sort((a, b) => (sessions[b].updatedAt || 0) - (sessions[a].updatedAt || 0));
    if (!keys.length) {
        el.innerHTML = '<div class="empty">尚無場次</div>';
        return;
    }
    el.innerHTML = keys.map(id => {
        const s = sessions[id];
        const isActive = id === state.sessionId;
        return `<div class="session-item">
                    <div style="flex:1">
                        <div class="si-title">${s.name || '未命名'}${isActive ? ' <span style="color:var(--accent);font-size:11px;">[目前]</span>' : ''}</div>
                        <div class="si-meta">${(s.subscribers || []).length} 位訂閱者 &nbsp;·&nbsp; ${(s.history || []).length} 筆抽獎紀錄</div>
                    </div>
                    <div class="si-actions">
                        ${!isActive ? `<button class="btn btn-sm btn-accent" onclick="switchSession('${id}')">切換</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="delSession('${id}')">刪除</button>
                    </div>
                </div>`;
    }).join('');
}

function delSession(id) {
    const sessions = getAllSessions();
    const name = sessions[id]?.name || id;
    if (!confirm(`確定刪除場次「${name}」？此操作不可復原。`)) return;
    deleteSession(id);
    renderSessions();
    renderTable();
    refreshDraw();
    renderHistory();
    updateSidebarSession();
    refreshExportSelect();
    toast('場次已刪除');
}

// ── Toast ──
let toastTimer;

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Prizes ──
function addPrize() {
    const name = document.getElementById('prize-name-input').value.trim();
    if (!name) {
        toast('請輸入獎品名稱');
        return;
    }
    const desc = document.getElementById('prize-desc-input').value.trim();
    const qty = Math.max(1, parseInt(document.getElementById('prize-qty-input').value) || 1);
    state.prizes.push({
        id: 'p_' + Date.now(),
        name,
        desc,
        qty
    });
    saveSession();
    document.getElementById('prize-name-input').value = '';
    document.getElementById('prize-desc-input').value = '';
    document.getElementById('prize-qty-input').value = '1';
    renderPrizes();
    toast('獎品已新增：' + name);
}

function deletePrize(id) {
    state.prizes = state.prizes.filter(p => p.id !== id);
    if (selectedPrizeId === id) {
        selectedPrizeId = null;
        updatePrizePickBtn();
    }
    saveSession();
    renderPrizes();
}

function movePrize(id, dir) {
    const i = state.prizes.findIndex(p => p.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= state.prizes.length) return;
    [state.prizes[i], state.prizes[j]] = [state.prizes[j], state.prizes[i]];
    saveSession();
    renderPrizes();
}

function clearPrizes() {
    if (!state.prizes.length) return;
    if (!confirm('確定清除所有獎品？')) return;
    state.prizes = [];
    selectedPrizeId = null;
    saveSession();
    renderPrizes();
    updatePrizePickBtn();
    toast('獎品已清除');
}

function renderPrizes() {
    const el = document.getElementById('prizes-list');
    if (!state.prizes.length) {
        el.innerHTML = '<div class="empty">尚無獎品，請先新增</div>';
        return;
    }
    el.innerHTML = state.prizes.map((p, i) => {
        const used = prizeUsedCount(p.id),
            remaining = Math.max(0, p.qty - used);
        const qtyLabel = p.qty > 1 ?
            `<span class="prize-qty-badge ${used > 0 ? 'prize-qty-used' : ''}">x${remaining} / ${p.qty}</span>` :
            `<span class="prize-qty-badge">x${p.qty}</span>`;
        return `<div class="prize-item">
                    <div class="prize-order ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">${i + 1}</div>
                    <div class="prize-info">
                        <div class="prize-name">${p.name} ${qtyLabel}</div>
                        ${p.desc ? `<div class="prize-desc">${p.desc}</div>` : ''}
                    </div>
                    <div class="prize-actions">
                        <button class="btn btn-sm" onclick="movePrize('${p.id}',-1)" ${i === 0 ? 'disabled' : ''}>↑</button>
                        <button class="btn btn-sm" onclick="movePrize('${p.id}',1)" ${i === state.prizes.length - 1 ? 'disabled' : ''}>↓</button>
                        <button class="btn btn-sm btn-danger" onclick="deletePrize('${p.id}')">刪除</button>
                    </div>
                </div>`;
    }).join('');
}

function openPrizeModal() {
    if (!state.prizes.length) {
        toast('請先在「獎品列表」頁面新增獎品');
        return;
    }
    document.getElementById('pm-choices').innerHTML = state.prizes.map((p, i) => {
        const remaining = prizeRemaining(p);
        const depleted = remaining <= 0;
        return `<div class="prize-select-card ${selectedPrizeId === p.id ? 'selected' : ''} ${depleted ? 'depleted' : ''}" data-pid="${p.id}" onclick="${depleted ? 'void 0' : 'selPrize(this)'}">
                    <div style="font-size:17px;font-weight:700;color:var(--text3);min-width:24px">${i + 1}</div>
                    <div style="flex:1">
                        <div class="ps-name">${p.name}
                            ${p.qty > 1 ? `<span style="font-size:11px;color:${depleted ? 'var(--danger)' : 'var(--text3)'}">剩 ${remaining} / ${p.qty}</span>` : `<span style="font-size:11px;color:var(--text3)">x${p.qty}</span>`}
                        </div>
                        ${p.desc ? `<div class="ps-desc">${p.desc}</div>` : ''}
                    </div>
                    ${depleted ? '<span style="font-size:11px;color:var(--danger)">已用完</span>' : ''}
                </div>`;
    }).join('');
    document.getElementById('prize-modal').classList.add('open');
}

function selPrize(el) {
    el.closest('#pm-choices').querySelectorAll('.prize-select-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

function confirmPrizeSelect() {
    const sel = document.querySelector('#pm-choices .prize-select-card.selected');
    selectedPrizeId = sel ? sel.dataset.pid : null;
    document.getElementById('prize-modal').classList.remove('open');
    updatePrizePickBtn();
}

function closePrizeModal(clear) {
    if (clear) {
        selectedPrizeId = null;
        updatePrizePickBtn();
    }
    document.getElementById('prize-modal').classList.remove('open');
}

function updatePrizePickBtn() {
    const prize = selectedPrizeId ? state.prizes.find(p => p.id === selectedPrizeId) : null;
    const lbl = document.getElementById('prize-pick-label');
    const btn = document.getElementById('prize-pick-btn');
    if (prize && prizeRemaining(prize) <= 0) {
        selectedPrizeId = null;
        lbl.textContent = '選擇獎品';
        btn.className = 'btn';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.background = '';
        toast('獎品已全數發出，已自動取消選擇');
        return;
    }
    if (prize) {
        const remaining = prizeRemaining(prize);
        lbl.textContent = prize.qty > 1 ? `${prize.name}（剩 ${remaining}）` : prize.name;
        btn.classList.add('btn-accent');
        btn.style.color = 'var(--t3)';
        btn.style.borderColor = 'rgba(255,208,128,0.3)';
        btn.style.background = 'rgba(255,208,128,0.08)';
    } else {
        lbl.textContent = '選擇獎品';
        btn.className = 'btn';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.background = '';
    }
}

// ── Transfer (Export / Import) ──

function refreshExportSelect() {
    const sel = document.getElementById('export-session-select');
    if (!sel) return;
    const sessions = getAllSessions();
    const keys = Object.keys(sessions).sort((a, b) => (sessions[b].updatedAt || 0) - (sessions[a].updatedAt || 0));
    sel.innerHTML = '<option value="">— 請選擇 —</option>' +
        keys.map(id => {
            const s = sessions[id];
            const isActive = id === state.sessionId;
            return `<option value="${id}" ${isActive ? 'selected' : ''}>${s.name || '未命名'}${isActive ? ' [目前]' : ''}</option>`;
        }).join('');
    sel.onchange = updateExportPreview;
    // trigger preview for current session
    updateExportPreview();
}

function updateExportPreview() {
    const sel = document.getElementById('export-session-select');
    const preview = document.getElementById('export-preview');
    if (!sel || !preview) return;
    const id = sel.value;
    if (!id) {
        preview.style.display = 'none';
        return;
    }
    const sessions = getAllSessions();
    const s = sessions[id];
    if (!s) {
        preview.style.display = 'none';
        return;
    }
    preview.style.display = 'block';
    preview.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                    <div><div style="color:var(--text3);font-size:11px;margin-bottom:2px">場次名稱</div><div style="color:var(--text);font-weight:600">${s.name || '未命名'}</div></div>
                    <div><div style="color:var(--text3);font-size:11px;margin-bottom:2px">訂閱者</div><div style="color:var(--accent);font-weight:600">${(s.subscribers || []).length} 位</div></div>
                    <div><div style="color:var(--text3);font-size:11px;margin-bottom:2px">抽獎紀錄</div><div style="color:var(--accent);font-weight:600">${(s.history || []).length} 筆</div></div>
                    <div><div style="color:var(--text3);font-size:11px;margin-bottom:2px">獎品</div><div style="color:var(--t3);font-weight:600">${(s.prizes || []).length} 項</div></div>
                    <div><div style="color:var(--text3);font-size:11px;margin-bottom:2px">最後更新</div><div>${s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'}</div></div>
                </div>`;
}

function exportSession() {
    const sel = document.getElementById('export-session-select');
    const id = sel ? sel.value : state.sessionId;
    if (!id) {
        toast('請先選擇要匯出的場次');
        return;
    }
    const sessions = getAllSessions();
    const s = sessions[id];
    if (!s) {
        toast('找不到場次資料');
        return;
    }
    const exportData = {
        _type: 'lottery_session_export',
        _version: 1,
        exportedAt: new Date().toISOString(),
        session: {
            id,
            ...s
        }
    };
    downloadJSON(exportData, `抽獎場次_${s.name || id}_${new Date().toISOString().split('T')[0]}.json`);
    toast('場次已匯出：' + (s.name || id));
}

function exportAllSessions() {
    const sessions = getAllSessions();
    const keys = Object.keys(sessions);
    if (!keys.length) {
        toast('沒有任何場次可以匯出');
        return;
    }
    const exportData = {
        _type: 'lottery_all_sessions_export',
        _version: 1,
        exportedAt: new Date().toISOString(),
        sessions: sessions
    };
    downloadJSON(exportData, `抽獎全部場次_${new Date().toISOString().split('T')[0]}.json`);
    toast(`已匯出 ${keys.length} 個場次`);
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('import-drop-zone').classList.add('drag-over');
}

function handleDragLeave(e) {
    document.getElementById('import-drop-zone').classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('import-drop-zone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processImportFile(file);
}

function loadImportFile(input) {
    const file = input.files[0];
    if (file) processImportFile(file);
    input.value = '';
}

function processImportFile(file) {
    if (!file.name.endsWith('.json')) {
        toast('請上傳 .json 格式的檔案');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            validateAndPreviewImport(data, file.name);
        } catch {
            toast('檔案格式錯誤，請確認是有效的 JSON 檔案');
        }
    };
    reader.readAsText(file, 'UTF-8');
}

function validateAndPreviewImport(data, filename) {
    let sessions = {};
    let isSingle = false;

    if (data._type === 'lottery_session_export' && data.session) {
        // Single session export
        isSingle = true;
        const s = data.session;
        sessions[s.id || ('imported_' + Date.now())] = {
            name: s.name,
            subscribers: s.subscribers || [],
            history: s.history || [],
            prizes: s.prizes || [],
            mults: s.mults || {},
            recurringOnly: s.recurringOnly || false,
            excludeWinners: s.excludeWinners || false,
            updatedAt: s.updatedAt || Date.now()
        };
    } else if (data._type === 'lottery_all_sessions_export' && data.sessions) {
        // All sessions export
        sessions = data.sessions;
    } else {
        toast('不支援的檔案格式');
        return;
    }

    pendingImportData = {
        sessions,
        filename
    };

    // Show preview
    const sessionKeys = Object.keys(sessions);
    const existing = getAllSessions();
    const conflicts = sessionKeys.filter(id => {
        const s = sessions[id];
        return Object.values(existing).some(e => e.name === s.name);
    });

    const previewEl = document.getElementById('import-preview-content');
    previewEl.innerHTML = `
                <div style="margin-bottom:8px">
                    <span style="color:var(--text);font-weight:600">檔案：</span>${filename}
                    <span style="margin-left:8px;color:var(--text3)">匯出時間：${data.exportedAt ? new Date(data.exportedAt).toLocaleString() : '未知'}</span>
                </div>
                <div style="display:grid;gap:6px">
                    ${sessionKeys.map(id => {
        const s = sessions[id];
        const hasConflict = Object.values(existing).some(e => e.name === s.name);
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:6px;border:1px solid ${hasConflict ? 'rgba(255,208,128,0.3)' : 'var(--border)'}">
                            ${hasConflict ? '<span style="color:var(--t3);font-size:11px">⚠ 衝突</span>' : '<span style="color:var(--founder);font-size:11px">✓ 新增</span>'}
                            <span style="color:var(--text);font-weight:600">${s.name || '未命名'}</span>
                            <span style="color:var(--text3);font-size:11px">${(s.subscribers || []).length} 位訂閱者 · ${(s.history || []).length} 筆紀錄 · ${(s.prizes || []).length} 項獎品</span>
                        </div>`;
    }).join('')}
                </div>
                ${conflicts.length > 0 ? `<div style="margin-top:8px;font-size:12px;color:var(--t3)">⚠ 發現 ${conflicts.length} 個場次名稱衝突，請選擇處理方式</div>` : ''}
            `;

    document.getElementById('import-drop-zone').style.display = 'none';
    document.getElementById('import-json-preview').style.display = 'block';
}

function confirmImport() {
    if (!pendingImportData) return;
    const {
        sessions
    } = pendingImportData;
    const conflictMode = document.getElementById('import-conflict-mode').value;
    const existing = getAllSessions();

    let importedCount = 0;
    let skippedCount = 0;

    for (const [id, sessionData] of Object.entries(sessions)) {
        const hasNameConflict = Object.values(existing).some(e => e.name === sessionData.name);

        if (hasNameConflict) {
            if (conflictMode === 'skip') {
                skippedCount++;
                continue;
            } else if (conflictMode === 'rename') {
                // Find existing key with same name and add suffix
                const newId = 'imported_' + Date.now() + '_' + importedCount;
                existing[newId] = {
                    ...sessionData,
                    name: sessionData.name + '_匯入'
                };
                importedCount++;
            } else {
                // overwrite: find and replace
                const existingKey = Object.keys(existing).find(k => existing[k].name === sessionData.name);
                if (existingKey) {
                    existing[existingKey] = sessionData;
                } else {
                    existing[id] = sessionData;
                }
                importedCount++;
            }
        } else {
            // No conflict, just import with new id to avoid key collision
            const newId = Object.keys(existing).includes(id) ? ('imported_' + Date.now() + '_' + importedCount) : id;
            existing[newId] = sessionData;
            importedCount++;
        }
    }

    localStorage.setItem(LS_SESSIONS, JSON.stringify(existing));

    let msg = `成功匯入 ${importedCount} 個場次`;
    if (skippedCount > 0) msg += `，略過 ${skippedCount} 個重複場次`;
    toast(msg);

    cancelImport();

    // 重新載入 state，確保 UI 完整刷新
    if (!loadSession(state.sessionId)) {
        const keys = Object.keys(getAllSessions());
        if (keys.length) loadSession(keys[0]);
        else initDefaultSession();
    }
    applyState();
    refreshExportSelect();
    renderSessions();
}

function cancelImport() {
    pendingImportData = null;
    document.getElementById('import-drop-zone').style.display = 'block';
    document.getElementById('import-json-preview').style.display = 'none';
    document.getElementById('drop-zone-sub').textContent = '支援單一場次或全部場次的匯出檔案';
}

function clearAllData() {
    if (!confirm('確定清除所有場次資料？此操作完全不可復原！')) return;
    if (!confirm('再次確認：所有場次、訂閱者、抽獎紀錄將全部刪除，確定嗎？')) return;
    localStorage.removeItem(LS_SESSIONS);
    localStorage.removeItem(LS_ACTIVE);
    initDefaultSession();
    applyState();
    toast('所有資料已清除');
}

function startDrawEffect() {
    const stage = document.getElementById("draw-stage");

    // 第一段：集中蓄力（慢一點）
    charge(stage);

    // 第二段：瞬間爆炸（驚喜點）
    setTimeout(() => explode(stage), 700);
}

// 🔋 蓄力（往中心吸）
function charge(stage) {
    for (let i = 0; i < 60; i++) {
        let c = create(stage);

        let fromLeft = i % 2 === 0;
        c.style.bottom = "0px";
        if (fromLeft) c.style.left = "0px";
        else c.style.right = "0px";

        let x = fromLeft ? stage.clientWidth * 0.5 : -stage.clientWidth * 0.5;
        let y = -stage.clientHeight * 0.5;

        c.animate([{
            transform: "translate(0,0) scale(1)"
        },
        {
            transform: `translate(${x}px, ${y}px) scale(0.3)`
        }
        ], {
            duration: 700,
            easing: "ease-in"
        });

        setTimeout(() => c.remove(), 700);
    }
}

// 💥 爆炸 + 彩帶雨
function explode(stage) {
    for (let i = 0; i < 180; i++) {
        let c = create(stage);

        c.style.left = "50%";
        c.style.top = "50%";

        // 爆炸方向
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 12 + 6;

        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed - 8; // 往上多一點

        let x = 0,
            y = 0;
        let gravity = 0.5;
        let rotate = Math.random() * 360;

        function animate() {
            vy += gravity;
            x += vx;
            y += vy;

            c.style.transform =
                `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotate}deg)`;

            rotate += 12;

            if (y > stage.clientHeight / 2 + 50) {
                c.remove();
                return;
            }

            requestAnimationFrame(animate);
        }

        animate();
    }
}

function create(stage) {
    let c = document.createElement("div");
    c.className = "confetti";
    c.style.backgroundColor = randomColor();
    stage.appendChild(c);
    return c;
}

function randomColor() {
    const colors = [
        "#ff4757", "#ff6b81", "#ffa502",
        "#eccc68", "#2ed573", "#1e90ff"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

init();