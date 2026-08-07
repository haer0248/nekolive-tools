/*! @license Custom Non-Commercial | (c) 2026 Nekolive.net | contact@nekolive.net */
(function () {
    const DEFAULTS = {
        mode: 'year',
        y: '',
        title: '',
        end: '',
        emoji: '🎉',
        hideCopyright: false,
        endTime: ''
    };

    function getLegacyUrlParams() {
        const params = new URLSearchParams(location.search);
        const out = {};
        let has = false;
        if (params.has('end-time')) { out.endTime = params.get('end-time'); out.mode = 'custom'; has = true; }
        if (params.has('y')) { out.y = params.get('y'); if (!out.mode) out.mode = 'year'; has = true; }
        if (params.has('title')) { out.title = params.get('title'); has = true; }
        if (params.has('end')) { out.end = params.get('end'); has = true; }
        if (params.has('emoji')) { out.emoji = params.get('emoji'); has = true; }
        if (params.has('hide-copyright')) { out.hideCopyright = true; has = true; }
        return has ? out : null;
    }

    const sync = new NekoSync('countdown', { defaults: DEFAULTS, schemaVersion: 1 });
    let config = sync.init();
    const legacy = getLegacyUrlParams();
    if (sync.migrateFromLegacyIfEmpty(legacy)) config = sync.loadLocal();

    let _mode = config.mode || 'year';
    let interval;

    function setMode(mode) {
        _mode = mode;
        document.getElementById('mode-year').style.display = mode === 'year' ? '' : 'none';
        document.getElementById('mode-custom').style.display = mode === 'custom' ? '' : 'none';
        document.getElementById('btn-year').classList.toggle('active', mode === 'year');
        document.getElementById('btn-custom').classList.toggle('active', mode === 'custom');
        saveFromForm();
    }
    window.setMode = setMode;

    function readForm() {
        return {
            mode: _mode,
            endTime: document.getElementById('g-end-time').value ? document.getElementById('g-end-time').value.replace('T', ' ') + ':00' : '',
            title: document.getElementById('g-title').value.trim(),
            y: document.getElementById('g-y').value.trim(),
            end: document.getElementById('g-end').value.trim(),
            emoji: document.getElementById('g-emoji').value.trim(),
            hideCopyright: document.getElementById('g-hide-copyright').checked
        };
    }

    function fillForm(cfg) {
        document.getElementById('g-end-time').value = cfg.endTime ? cfg.endTime.replace(' ', 'T').slice(0, 19) : '';
        document.getElementById('g-title').value = cfg.title || '';
        document.getElementById('g-y').value = cfg.y || '';
        document.getElementById('g-end').value = cfg.end || '';
        document.getElementById('g-emoji').value = cfg.emoji || '';
        document.getElementById('g-hide-copyright').checked = !!cfg.hideCopyright;
        _mode = cfg.mode || 'year';
        document.getElementById('mode-year').style.display = _mode === 'year' ? '' : 'none';
        document.getElementById('mode-custom').style.display = _mode === 'custom' ? '' : 'none';
        document.getElementById('btn-year').classList.toggle('active', _mode === 'year');
        document.getElementById('btn-custom').classList.toggle('active', _mode === 'custom');
    }

    function buildLegacyUrl(cfg) {
        const p = new URLSearchParams();
        if (cfg.mode === 'custom' && cfg.endTime) p.set('end-time', cfg.endTime);
        if (cfg.mode === 'year' && cfg.y) p.set('y', cfg.y);
        if (cfg.title) p.set('title', cfg.title);
        if (cfg.end) p.set('end', cfg.end);
        if (cfg.emoji) p.set('emoji', cfg.emoji);
        if (cfg.hideCopyright) p.set('hide-copyright', '1');
        p.set('obs', '1');
        return location.origin + location.pathname + '?' + p.toString();
    }

    function updatePreviews() {
        const cfg = readForm();
        document.getElementById('g-url-display').textContent = buildLegacyUrl(cfg);
        document.getElementById('g-obs-url').value = sync.buildObsSourceUrl();
    }

    function saveFromForm() {
        config = sync.save(readForm());
        updatePreviews();
    }

    let saveDebounceTimer = null;
    function saveFromFormDebounced() {
        updatePreviews();
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(saveFromForm, 600);
    }

    function copyUrl() {
        navigator.clipboard.writeText(document.getElementById('g-url-display').textContent).then(() => {
            const btn = document.getElementById('copy-btn');
            btn.textContent = '已複製！';
            setTimeout(() => btn.textContent = '複製連結', 1500);
        });
    }
    window.copyUrl = copyUrl;

    function openUrl() {
        window.open(document.getElementById('g-url-display').textContent, '_blank');
    }
    window.openUrl = openUrl;

    function copyObsUrl() {
        navigator.clipboard.writeText(document.getElementById('g-obs-url').value).then(() => {
            const btn = document.getElementById('copy-obs-btn');
            btn.textContent = '已複製！';
            setTimeout(() => btn.textContent = '複製', 1500);
        });
    }
    window.copyObsUrl = copyObsUrl;

    function openObsUrl() {
        window.open(document.getElementById('g-obs-url').value, '_blank');
    }
    window.openObsUrl = openObsUrl;

    function toggleObsUrl() {
        const input = document.getElementById('g-obs-url');
        const btn = document.getElementById('obs-toggle-btn');
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.textContent = showing ? '顯示' : '隱藏';
    }
    window.toggleObsUrl = toggleObsUrl;

    const urlParams = new URLSearchParams(location.search);

    if (!urlParams.has('obs')) {
        document.getElementById('generator').style.display = 'flex';
        document.getElementById('card').style.display = 'none';

        fillForm(config);
        updatePreviews();

        ['g-end-time', 'g-title', 'g-y', 'g-end', 'g-emoji'].forEach(id => {
            document.getElementById(id).addEventListener('input', saveFromFormDebounced);
        });
        document.getElementById('g-hide-copyright').addEventListener('change', saveFromForm);

        NekoSyncPanel.mount(document.getElementById('syncPanelMount'), sync);

        sync.onChange((newConfig, source) => {
            config = newConfig;
            if (source === 'remote') {
                fillForm(config);
            }
            updatePreviews();
        });
        return;
    }

    const prevDigits = { d0: '0', d1: '0', d2: '0', h0: '0', h1: '0', m0: '0', m1: '0', s0: '0', s1: '0' };

    function pad(n, len) { return String(Math.max(0, n)).padStart(len || 2, '0'); }

    function setDigit(id, val) {
        if (prevDigits[id] === val) return;
        prevDigits[id] = val;
        const inner = document.getElementById(id);
        inner.classList.remove('flip-in', 'flip-out');
        void inner.offsetWidth;
        inner.classList.add('flip-out');
        setTimeout(() => {
            inner.textContent = val;
            inner.classList.remove('flip-out');
            inner.classList.add('flip-in');
            setTimeout(() => inner.classList.remove('flip-in'), 150);
        }, 150);
    }

    function renderTime(sec) {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;

        const daysGroup = document.getElementById('daysGroup');
        const sepD = document.getElementById('sepD');
        const d0box = document.getElementById('d0box');
        const card = document.getElementById('card');

        if (d > 0) {
            daysGroup.style.display = '';
            sepD.style.display = '';
            const has3 = d >= 100;
            d0box.style.display = has3 ? '' : 'none';
            card.classList.toggle('with-days', !has3);
            card.classList.toggle('with-days-3', has3);
            const ds = pad(d, 3);
            setDigit('d0', ds[0]);
            setDigit('d1', ds[1]);
            setDigit('d2', ds[2]);
        } else {
            daysGroup.style.display = 'none';
            sepD.style.display = 'none';
            card.classList.remove('with-days', 'with-days-3');
        }

        const hs = pad(h), ms = pad(m), ss = pad(s);
        setDigit('h0', hs[0]); setDigit('h1', hs[1]);
        setDigit('m0', ms[0]); setDigit('m1', ms[1]);
        setDigit('s0', ss[0]); setDigit('s1', ss[1]);
    }

    function showCelebration() {
        document.getElementById('countdownView').style.display = 'none';
        const cel = document.getElementById('celebrateView');
        cel.style.display = 'flex';
        document.getElementById('card').classList.remove('with-days', 'with-days-3');
    }

    let target;

    function applyConfig(cfg) {
        if (interval) clearInterval(interval);

        document.getElementById('countdownView').style.display = 'flex';
        document.getElementById('celebrateView').style.display = 'none';

        const now = new Date();
        const targetY = parseInt(cfg.y) || (now.getFullYear() + 1);
        const titleText = cfg.title || `距離 ${targetY} 還有`;
        const endText = cfg.end || `${targetY} 新年快樂！`;
        const emoji = cfg.emoji || '🎉';

        document.getElementById('copyright').style.display = cfg.hideCopyright ? 'none' : '';

        document.getElementById('titleEl').textContent = titleText;
        document.getElementById('celebrateText').textContent = endText;
        document.getElementById('celebrateEmoji').textContent = emoji;

        if (cfg.mode === 'custom' && cfg.endTime) {
            target = new Date(cfg.endTime).getTime();
        } else {
            target = new Date(targetY, 0, 1).getTime();
        }

        function tick() {
            const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
            renderTime(diff);
            if (diff <= 0) {
                clearInterval(interval);
                setTimeout(showCelebration, 800);
            }
        }

        if (Date.now() >= target) {
            showCelebration();
        } else {
            tick();
            interval = setInterval(tick, 1000);
        }
    }

    applyConfig(config);
    sync.onChange((newConfig) => {
        config = newConfig;
        applyConfig(config);
    });
})();
