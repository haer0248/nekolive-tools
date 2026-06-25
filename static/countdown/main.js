/*! @license Custom Non-Commercial | (c) 2026 Nekolive.net | contact@nekolive.net */
(function () {
    let _generatedUrl = '';
    let _mode = 'year';
    let interval;

    function setMode(mode) {
        _mode = mode;
        document.getElementById('mode-year').style.display = mode === 'year' ? '' : 'none';
        document.getElementById('mode-custom').style.display = mode === 'custom' ? '' : 'none';
        document.getElementById('btn-year').classList.toggle('active', mode === 'year');
        document.getElementById('btn-custom').classList.toggle('active', mode === 'custom');
        updateUrl();
    }
    window.setMode = setMode;

    function updateUrl() {
        const p = new URLSearchParams();
        const endTime = document.getElementById('g-end-time').value;
        const title = document.getElementById('g-title').value.trim();
        const y = document.getElementById('g-y').value.trim();
        const end = document.getElementById('g-end').value.trim();
        const emoji = document.getElementById('g-emoji').value.trim();
        const hideC = document.getElementById('g-hide-copyright').checked;

        if (_mode === 'custom' && endTime) p.set('end-time', endTime.replace('T', ' ') + ':00');
        if (_mode === 'year' && y) p.set('y', y);
        if (title) p.set('title', title);
        if (end) p.set('end', end);
        if (emoji) p.set('emoji', emoji);
        if (hideC) p.set('hide-copyright', '1');
        p.set('obs', '1');

        _generatedUrl = location.origin + location.pathname + '?' + p.toString();
        document.getElementById('g-url-display').textContent = _generatedUrl;
    }

    function copyUrl() {
        navigator.clipboard.writeText(_generatedUrl).then(() => {
            const btn = document.getElementById('copy-btn');
            btn.textContent = '已複製！';
            setTimeout(() => btn.textContent = '複製連結', 1500);
        });
    }
    window.copyUrl = copyUrl;

    function openUrl() {
        window.open(_generatedUrl, '_blank');
    }
    window.openUrl = openUrl;

    const params = new URLSearchParams(location.search);

    // 無 obs → 顯示產生器
    if (!params.has('obs')) {
        document.getElementById('generator').style.display = 'flex';
        document.getElementById('card').style.display = 'none';
        ['g-end-time', 'g-title', 'g-y', 'g-end', 'g-emoji'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateUrl);
        });
        document.getElementById('g-hide-copyright').addEventListener('change', updateUrl);
        updateUrl();
        return;
    }

    let target;

    const now = new Date();
    const targetY = parseInt(params.get('y')) || (now.getFullYear() + 1);
    const titleText = params.get('title') || `距離 ${targetY} 還有`;
    const endText = params.get('end') || `${targetY} 新年快樂！`;
    const emoji = params.get('emoji') || `🎉`;
    const hideCopyright = params.get('hide-copyright') ? true : false;
    if (hideCopyright) {
        document.getElementById('copyright').style.display = 'none';
    }

    const endTime = params.get('end-time');
    if (endTime) {
        target = new Date(endTime).getTime();
    } else {
        target = new Date(targetY, 0, 1).getTime();
    }

    const totalSec = Math.floor((target - now) / 1000);

    document.getElementById('titleEl').textContent = titleText;
    document.getElementById('celebrateText').textContent = endText;
    document.getElementById('celebrateEmoji').textContent = emoji;

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
})();