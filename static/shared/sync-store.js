(function (global) {
    'use strict';

    var STORE_PREFIX = 'nekolive:';
    var PAIR_CODE_KEY = STORE_PREFIX + 'pairCode';
    var HISTORY_LIMIT = 20;

    function randomPairCode() {
        var cryptoObj = global.crypto || global.msCrypto;
        var bytes = new Uint8Array(10);
        if (cryptoObj && cryptoObj.getRandomValues) {
            cryptoObj.getRandomValues(bytes);
        } else {
            for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        var out = '';
        for (var j = 0; j < bytes.length; j++) {
            out += bytes[j].toString(36).padStart(2, '0');
        }
        return out;
    }

    function getPairCode() {
        var code = null;
        try { code = localStorage.getItem(PAIR_CODE_KEY); } catch (e) {}
        if (!code) {
            code = randomPairCode();
            try { localStorage.setItem(PAIR_CODE_KEY, code); } catch (e) {}
        }
        return code;
    }

    function setPairCode(code) {
        code = (code || '').trim();
        if (!code) return false;
        try { localStorage.setItem(PAIR_CODE_KEY, code); } catch (e) { return false; }
        return true;
    }

    function syncServerConfigured() {
        var cfg = global.__NEKO_SYNC_SERVER__;
        return !!(cfg && cfg.apiBase && cfg.apiBase.indexOf('YOUR_') !== 0 &&
            typeof global.fetch === 'function' && typeof global.EventSource === 'function');
    }

    function apiBase() {
        var cfg = global.__NEKO_SYNC_SERVER__;
        return cfg && cfg.apiBase ? cfg.apiBase.replace(/\/+$/, '') : '';
    }

    function apiUrl(pairCode, widgetId, suffix) {
        return apiBase() + '/api/' + suffix + '/' + encodeURIComponent(pairCode) + '/' + encodeURIComponent(widgetId);
    }

    function NekoSync(widgetId, options) {
        options = options || {};
        this.widgetId = widgetId;
        this.localKey = STORE_PREFIX + widgetId + ':config';
        this.historyKey = STORE_PREFIX + widgetId + ':history';
        this.defaults = options.defaults || {};
        this.schemaVersion = options.schemaVersion || 1;
        this._changeCallbacks = [];
        this._statusCallbacks = [];
        this._saveResultCallbacks = [];
        this._eventSource = null;
        this._suppressNextRemote = false;
        this._status = 'local-only';
    }

    NekoSync.prototype.getPairCode = getPairCode;

    NekoSync.prototype.setPairCode = function (code) {
        var ok = setPairCode(code);
        if (ok) this.connect();
        return ok;
    };

    NekoSync.prototype.regeneratePairCode = function () {
        var code = randomPairCode();
        setPairCode(code);
        this.connect();
        return code;
    };

    NekoSync.prototype.isCloudConfigured = function () {
        return syncServerConfigured();
    };

    NekoSync.prototype.getStatus = function () {
        return this._status;
    };

    NekoSync.prototype._setStatus = function (s) {
        if (this._status === s) return;
        this._status = s;
        for (var i = 0; i < this._statusCallbacks.length; i++) {
            try { this._statusCallbacks[i](s); } catch (e) {}
        }
    };

    NekoSync.prototype.onStatusChange = function (cb) {
        this._statusCallbacks.push(cb);
        cb(this._status);
    };

    NekoSync.prototype.onSaveResult = function (cb) {
        this._saveResultCallbacks.push(cb);
    };

    NekoSync.prototype._fireSaveResult = function (result) {
        for (var i = 0; i < this._saveResultCallbacks.length; i++) {
            try { this._saveResultCallbacks[i](result); } catch (e) {}
        }
    };

    NekoSync.prototype.hasLocalData = function () {
        try { return localStorage.getItem(this.localKey) !== null; } catch (e) { return false; }
    };

    NekoSync.prototype.loadLocal = function () {
        try {
            var raw = localStorage.getItem(this.localKey);
            if (raw) {
                var parsed = JSON.parse(raw);
                var merged = {};
                for (var k in this.defaults) merged[k] = this.defaults[k];
                for (var k2 in parsed) merged[k2] = parsed[k2];
                return merged;
            }
        } catch (e) {
            console.warn('[NekoSync] 讀取本機設定失敗', e);
        }
        var out = {};
        for (var k3 in this.defaults) out[k3] = this.defaults[k3];
        return out;
    };

    NekoSync.prototype.saveLocal = function (data) {
        try {
            localStorage.setItem(this.localKey, JSON.stringify(data));
        } catch (e) {
            console.warn('[NekoSync] 寫入本機設定失敗（可能是無痕模式或空間不足）', e);
        }
    };

    NekoSync.prototype.save = function (data, opts) {
        opts = opts || {};
        var payload = {};
        for (var k in this.defaults) payload[k] = this.defaults[k];
        for (var k2 in data) payload[k2] = data[k2];

        this.saveLocal(payload);
        if (!opts.skipHistory) this._pushHistoryLocal(payload);

        if (!opts.silent) {
            for (var i = 0; i < this._changeCallbacks.length; i++) {
                try { this._changeCallbacks[i](payload, 'local'); } catch (e) {}
            }
        }

        var self = this;
        if (syncServerConfigured()) {
            this._suppressNextRemote = true;
            var code = getPairCode();
            global.fetch(apiUrl(code, this.widgetId, 'config'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: payload,
                    version: this.schemaVersion,
                    skipHistory: !!opts.skipHistory
                })
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                if (!opts.silentResult) self._fireSaveResult({ ok: true, cloud: true });
            }).catch(function (err) {
                console.warn('[NekoSync] 雲端寫入失敗（將維持本機設定）', err);
                self._suppressNextRemote = false;
                if (!opts.silentResult) self._fireSaveResult({ ok: false, cloud: true, error: err });
            });
        } else {
            if (!opts.silentResult) this._fireSaveResult({ ok: true, cloud: false });
        }

        return payload;
    };

    NekoSync.prototype._pushHistoryLocal = function (data) {
        try {
            var raw = localStorage.getItem(this.historyKey);
            var list = raw ? JSON.parse(raw) : [];
            list.push({ data: data, savedAt: Date.now() });
            while (list.length > HISTORY_LIMIT) list.shift();
            localStorage.setItem(this.historyKey, JSON.stringify(list));
        } catch (e) {}
    };

    NekoSync.prototype.listLocalHistory = function () {
        try {
            var raw = localStorage.getItem(this.historyKey);
            var list = raw ? JSON.parse(raw) : [];
            return list.slice().reverse();
        } catch (e) { return []; }
    };

    NekoSync.prototype.listRemoteHistory = function () {
        if (!syncServerConfigured()) return Promise.resolve([]);
        var code = getPairCode();
        return global.fetch(apiUrl(code, this.widgetId, 'history'))
            .then(function (res) { return res.ok ? res.json() : []; })
            .catch(function () { return []; });
    };

    NekoSync.prototype.restore = function (data) {
        return this.save(data);
    };

    NekoSync.prototype.onChange = function (cb) {
        this._changeCallbacks.push(cb);
    };

    NekoSync.prototype.connect = function () {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }

        if (!syncServerConfigured()) {
            this._setStatus('local-only');
            return;
        }

        var code = getPairCode();
        var self = this;

        this._setStatus('connecting');

        var es;
        try {
            es = new global.EventSource(apiUrl(code, this.widgetId, 'stream'));
        } catch (e) {
            console.warn('[NekoSync] 無法建立 SSE 連線', e);
            this._setStatus('error');
            return;
        }
        this._eventSource = es;

        es.addEventListener('open', function () {
            self._setStatus('online');
        });

        es.addEventListener('update', function (evt) {
            self._setStatus('online');
            var val;
            try { val = JSON.parse(evt.data); } catch (e) { return; }
            if (!val || !val.data) return;
            if (self._suppressNextRemote) {
                self._suppressNextRemote = false;
                return;
            }
            var merged = {};
            for (var k in self.defaults) merged[k] = self.defaults[k];
            for (var k2 in val.data) merged[k2] = val.data[k2];
            self.saveLocal(merged);
            for (var i = 0; i < self._changeCallbacks.length; i++) {
                try { self._changeCallbacks[i](merged, 'remote'); } catch (e) {}
            }
        });

        es.addEventListener('error', function () {
            self._setStatus(es.readyState === global.EventSource.CONNECTING ? 'offline' : 'error');
        });
    };

    NekoSync.prototype._applyUrlPairCodeIfPresent = function () {
        try {
            var params = new URLSearchParams(window.location.search);
            var fromUrl = params.get('pair');
            if (fromUrl && fromUrl.trim()) {
                setPairCode(fromUrl.trim());
            }
        } catch (e) {}
    };

    NekoSync.prototype.init = function () {
        this._applyUrlPairCodeIfPresent();
        this.connect();
        return this.loadLocal();
    };

    NekoSync.prototype.buildObsSourceUrl = function (extraParams) {
        var url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('obs', '1');
        url.searchParams.set('pair', this.getPairCode());
        if (extraParams) {
            for (var k in extraParams) url.searchParams.set(k, extraParams[k]);
        }
        return url.toString();
    };

    NekoSync.prototype.migrateFromLegacyIfEmpty = function (legacyData) {
        if (!legacyData) return false;
        var hasAny = false;
        for (var k in legacyData) { hasAny = true; break; }
        if (!hasAny) return false;
        if (!this.hasLocalData()) {
            this.save(legacyData, { skipHistory: true, silentResult: true });
            return true;
        }
        return false;
    };

    NekoSync.prototype.exportToFile = function () {
        var data = this.loadLocal();
        var payload = {
            widget: this.widgetId,
            version: this.schemaVersion,
            exportedAt: new Date().toISOString(),
            data: data
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = this.widgetId + '-settings-' + Date.now() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };

    NekoSync.prototype.importFromFile = function (file) {
        var self = this;
        return file.text().then(function (text) {
            var parsed = JSON.parse(text);
            if (parsed.widget && parsed.widget !== self.widgetId) {
                console.warn('[NekoSync] 匯入的設定檔是給「' + parsed.widget + '」用的，目前小工具是「' + self.widgetId + '」，仍會嘗試套用共同欄位。');
            }
            var data = parsed.data || parsed;
            return self.save(data);
        });
    };

    global.NekoSync = NekoSync;

    global.NekoMask = {
        attach: function (inputEl, toggleBtn) {
            if (!inputEl || !toggleBtn) return;
            inputEl.type = 'password';
            inputEl.setAttribute('autocomplete', 'off');
            toggleBtn.textContent = '顯示';
            toggleBtn.addEventListener('click', function () {
                var showing = inputEl.type === 'text';
                inputEl.type = showing ? 'password' : 'text';
                toggleBtn.textContent = showing ? '顯示' : '隱藏';
            });
        }
    };
})(window);
