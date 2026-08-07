(function (global) {
    'use strict';

    var STATUS_LABEL = {
        'local-only': { text: '本機模式（未設定雲端同步）', color: '#9e9e9e' },
        connecting: { text: '連線中 ...', color: '#f0ad4e' },
        online: { text: '已連線，即時同步中', color: '#4caf50' },
        offline: { text: '雲端已設定，但目前離線', color: '#f0ad4e' },
        error: { text: '連線發生錯誤', color: '#e53935' }
    };

    var STYLE_ID = 'neko-sync-panel-styles';
    var CSS = '' +
        '.neko-sync-panel, .neko-sync-panel * { box-sizing: border-box; }' +
        '.neko-sync-panel {' +
        '  all: revert;' +
        '  display: block;' +
        '  margin-top: 12px;' +
        '  padding: 14px 16px;' +
        '  border: 1px solid rgba(128,128,128,0.35);' +
        '  border-radius: 10px;' +
        '  background: rgba(128,128,128,0.08);' +
        '  color: inherit;' +
        '  font-family: -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;' +
        '  font-size: 13px;' +
        '  line-height: 1.5;' +
        '  text-align: left;' +
        '}' +
        '.neko-sync-panel .neko-sp-title {' +
        '  margin: 0 0 10px; font-size: 14px; font-weight: 600;' +
        '}' +
        '.neko-sync-panel .neko-sp-status-row {' +
        '  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;' +
        '}' +
        '.neko-sync-panel .neko-sp-dot {' +
        '  display: inline-block; width: 10px; height: 10px; border-radius: 50%;' +
        '  background: #9e9e9e; flex: 0 0 auto;' +
        '}' +
        '.neko-sync-panel .neko-sp-status-text {' +
        '  font-size: 12px; opacity: 0.8;' +
        '}' +
        '.neko-sync-panel .neko-sp-save-feedback {' +
        '  min-height: 16px; margin-bottom: 10px; font-size: 12px; font-weight: 600;' +
        '  opacity: 0; transition: opacity 0.3s ease;' +
        '}' +
        '.neko-sync-panel .neko-sp-block { margin-bottom: 10px; }' +
        '.neko-sync-panel label.neko-sp-label {' +
        '  display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.85;' +
        '}' +
        '.neko-sync-panel .neko-sp-row {' +
        '  display: flex; flex-wrap: wrap; gap: 6px;' +
        '}' +
        '.neko-sync-panel input.neko-sp-input {' +
        '  flex: 1 1 120px; min-width: 0;' +
        '  padding: 6px 8px; font-size: 13px; font-family: inherit;' +
        '  border: 1px solid rgba(128,128,128,0.45); border-radius: 6px;' +
        '  background: rgba(255,255,255,0.9); color: #111;' +
        '}' +
        '.neko-sync-panel button.neko-sp-btn {' +
        '  padding: 6px 10px; font-size: 12px; font-family: inherit;' +
        '  border: 1px solid rgba(128,128,128,0.45); border-radius: 6px;' +
        '  background: rgba(128,128,128,0.12); color: inherit; cursor: pointer;' +
        '  white-space: nowrap;' +
        '}' +
        '.neko-sync-panel button.neko-sp-btn:hover { background: rgba(128,128,128,0.22); }' +
        '.neko-sync-panel button.neko-sp-btn.neko-sp-btn-danger {' +
        '  border-color: rgba(229,57,53,0.55); color: #e53935;' +
        '}' +
        '.neko-sync-panel button.neko-sp-btn.neko-sp-btn-primary {' +
        '  border-color: rgba(76,141,255,0.55); color: #4c8dff;' +
        '}' +
        '.neko-sync-panel .neko-sp-hint {' +
        '  margin: 6px 0 0; font-size: 11px; opacity: 0.7; line-height: 1.5;' +
        '}' +
        '#neko-sync-toast {' +
        '  all: revert;' +
        '  position: fixed; left: 50%; bottom: 24px; z-index: 2147483000;' +
        '  transform: translate(-50%, 12px);' +
        '  display: inline-flex; align-items: center; gap: 8px;' +
        '  padding: 10px 16px; border-radius: 999px;' +
        '  background: rgba(20,20,24,0.94); color: #f2f2f5;' +
        '  font-family: -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;' +
        '  font-size: 13px; font-weight: 600; line-height: 1.4;' +
        '  box-shadow: 0 6px 20px rgba(0,0,0,0.35);' +
        '  opacity: 0; pointer-events: none;' +
        '  transition: opacity 0.25s ease, transform 0.25s ease;' +
        '  white-space: nowrap;' +
        '}' +
        '#neko-sync-toast.neko-toast-visible {' +
        '  opacity: 1; transform: translate(-50%, 0);' +
        '}' +
        '#neko-sync-toast .neko-toast-dot {' +
        '  display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto;' +
        '}';

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);
    }

    var toastTimer = null;
    function ensureToastEl() {
        var el = document.getElementById('neko-sync-toast');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'neko-sync-toast';
        el.innerHTML = '<span class="neko-toast-dot"></span><span class="neko-toast-text"></span>';
        document.body.appendChild(el);
        return el;
    }

    function showSaveToast(result) {
        ensureStyles();
        var el = ensureToastEl();
        var dot = el.querySelector('.neko-toast-dot');
        var text = el.querySelector('.neko-toast-text');

        var message, color;
        if (result.cloud && result.ok) {
            message = '已儲存到雲端';
            color = '#4caf50';
        } else if (result.cloud && !result.ok) {
            message = '雲端儲存失敗，僅本機生效';
            color = '#e53935';
        } else {
            message = '已儲存（本機）';
            color = '#9e9e9e';
        }
        text.textContent = message;
        dot.style.background = color;

        if (toastTimer) clearTimeout(toastTimer);
        el.classList.remove('neko-toast-visible');
        window.requestAnimationFrame(function () {
            el.classList.add('neko-toast-visible');
        });
        toastTimer = setTimeout(function () {
            el.classList.remove('neko-toast-visible');
        }, 3200);
    }

    function mount(container, sync, options) {
        options = options || {};
        if (!container || !sync) return;

        ensureStyles();

        container.innerHTML =
            '<div class="neko-sync-panel">' +
            '  <h6 class="neko-sp-title">☁️ 雲端同步與備份</h6>' +
            '  <div class="neko-sp-status-row">' +
            '    <span id="neko-sync-dot" class="neko-sp-dot"></span>' +
            '    <span id="neko-sync-status-text" class="neko-sp-status-text"></span>' +
            '  </div>' +
            '  <div id="neko-sync-save-feedback" class="neko-sp-save-feedback"></div>' +
            '  <div class="neko-sp-block">' +
            '    <label class="neko-sp-label">配對碼（同一組碼的所有頁面會即時同步設定）</label>' +
            '    <div class="neko-sp-row">' +
            '      <input type="password" class="neko-sp-input" id="neko-pair-code-input" autocomplete="off">' +
            '      <button class="neko-sp-btn" type="button" id="neko-pair-toggle">顯示</button>' +
            '      <button class="neko-sp-btn" type="button" id="neko-pair-copy">複製</button>' +
            '      <button class="neko-sp-btn" type="button" id="neko-pair-apply">套用</button>' +
            '      <button class="neko-sp-btn neko-sp-btn-danger" type="button" id="neko-pair-regen">產生新碼</button>' +
            '    </div>' +
            '    <p class="neko-sp-hint">把這組碼貼到另一個裝置/頁面（例如 OBS 停駐視窗）並按「套用」，就會連動同步。這組碼等同密碼，預設遮住是為了避免直播/截圖不小心露出，不要分享給不信任的人。</p>' +
            '  </div>' +
            '  <div class="neko-sp-block neko-sp-row" style="margin-bottom:0;">' +
            '    <button class="neko-sp-btn neko-sp-btn-primary" type="button" id="neko-export-btn">匯出設定 (JSON)</button>' +
            '    <button class="neko-sp-btn neko-sp-btn-primary" type="button" id="neko-import-btn">匯入設定</button>' +
            '    <input type="file" accept="application/json" id="neko-import-file" style="display:none">' +
            '  </div>' +
            '</div>';

        var dot = container.querySelector('#neko-sync-dot');
        var statusText = container.querySelector('#neko-sync-status-text');
        var saveFeedback = container.querySelector('#neko-sync-save-feedback');
        var pairInput = container.querySelector('#neko-pair-code-input');
        var pairToggleBtn = container.querySelector('#neko-pair-toggle');
        var pairCopyBtn = container.querySelector('#neko-pair-copy');
        var pairApplyBtn = container.querySelector('#neko-pair-apply');
        var pairRegenBtn = container.querySelector('#neko-pair-regen');
        var exportBtn = container.querySelector('#neko-export-btn');
        var importBtn = container.querySelector('#neko-import-btn');
        var importFile = container.querySelector('#neko-import-file');

        pairInput.value = sync.getPairCode();

        sync.onStatusChange(function (status) {
            var info = STATUS_LABEL[status] || { text: status, color: '#9e9e9e' };
            dot.style.background = info.color;
            statusText.textContent = info.text;
        });

        var feedbackTimer = null;
        sync.onSaveResult(function (result) {
            var message, color;
            if (result.cloud && result.ok) {
                message = '已儲存到雲端';
                color = '#4caf50';
            } else if (result.cloud && !result.ok) {
                message = '雲端儲存失敗，僅本機生效，請確認網路連線或稍後再試一次';
                color = '#e53935';
            } else {
                message = '已儲存（僅本機，尚未設定雲端同步）';
                color = '#9e9e9e';
            }
            saveFeedback.textContent = message;
            saveFeedback.style.color = color;
            saveFeedback.style.opacity = '1';
            if (feedbackTimer) clearTimeout(feedbackTimer);
            feedbackTimer = setTimeout(function () {
                saveFeedback.style.opacity = '0';
            }, 6000);

            showSaveToast(result);
        });

        pairToggleBtn.addEventListener('click', function () {
            var showing = pairInput.type === 'text';
            pairInput.type = showing ? 'password' : 'text';
            pairToggleBtn.textContent = showing ? '顯示' : '隱藏';
        });

        pairCopyBtn.addEventListener('click', function () {
            pairInput.select();
            try {
                navigator.clipboard.writeText(pairInput.value);
            } catch (e) {
                document.execCommand('copy');
            }
            pairCopyBtn.textContent = '已複製！';
            setTimeout(function () { pairCopyBtn.textContent = '複製'; }, 1500);
        });

        pairApplyBtn.addEventListener('click', function () {
            var val = pairInput.value.trim();
            if (!val) return;
            sync.setPairCode(val);
        });

        pairRegenBtn.addEventListener('click', function () {
            if (!confirm('產生新的配對碼後，與舊碼同步的其他裝置需要手動改用新碼。確定產生新碼？')) return;
            var code = sync.regeneratePairCode();
            pairInput.value = code;
        });

        exportBtn.addEventListener('click', function () {
            sync.exportToFile();
        });

        importBtn.addEventListener('click', function () {
            importFile.value = '';
            importFile.click();
        });

        importFile.addEventListener('change', function () {
            var file = importFile.files && importFile.files[0];
            if (!file) return;
            sync.importFromFile(file).catch(function (err) {
                alert('匯入失敗：檔案格式不正確。' + (err && err.message ? '\n' + err.message : ''));
            });
        });
    }

    global.NekoSyncPanel = { mount: mount };
})(window);
