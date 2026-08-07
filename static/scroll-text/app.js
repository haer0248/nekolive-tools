
(function () {
    'use strict';

    const DEFAULTS = {
        text: '歡迎來到直播間！[BR]記得按下追隨與訂閱[BR]感謝大家的支持',
        position: 'bottom',
        font: "'Noto Sans TC', sans-serif",
        size: '200%',
        font_color: '#000000',
        outline_color: '#ffffff',
        outline_size: '3',
        direction: 'up',
        align: 'center',
        interval: '4',
        speed: '0.6',
        loop: '1',
        wrap: 'false'
    };

    const LEGACY_KEYS = Object.keys(DEFAULTS);

    function getRawUrlParams() {
        return new URLSearchParams(window.location.search);
    }

    function getLegacyUrlParams() {
        const params = getRawUrlParams();
        const out = {};
        let has = false;
        LEGACY_KEYS.forEach(key => {
            if (params.has(key)) {
                out[key] = params.get(key);
                has = true;
            }
        });
        return has ? out : null;
    }

    function isOBS() {
        return navigator.userAgent.includes('OBS') || getRawUrlParams().get('obs') === '1';
    }

    const alignMap = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end'
    };

    let tickerTimer = null;

    function initializeTicker(config) {
        const text = config.text.replace(/%5BBR%5D/g, '[BR]');
        const messages = text.split('[BR]').filter(m => m.trim() !== '');
        if (messages.length === 0) messages.push('');

        const mainBox = document.getElementById('mainBox');
        const tickerTrack = document.getElementById('tickerTrack');
        const position = config.position === 'bottom' ? 'bottom: 0;' : 'top: 0;';

        Outline.update(tickerTrack, config.outline_size, config.outline_color);

        mainBox.style.cssText = `
            background: transparent;
            margin: 0 auto;
            width: 100%;
            color: ${config.font_color};
            font-weight: bold;
            position: fixed;
            align-items: center;
            font-size: ${config.size};
            font-family: ${config.font};
            padding: 10px 24px;
            box-sizing: border-box;
            ${position}
        `;

        const viewport = document.getElementById('tickerViewport');
        const track = document.getElementById('tickerTrack');
        track.innerHTML = '';
        track.style.transition = 'none';
        track.style.transform = 'translateY(0)';

        if (tickerTimer) {
            clearInterval(tickerTimer);
            tickerTimer = null;
        }

        const justify = alignMap[config.align] || 'center';
        const isWrap = config.wrap === 'true';
        const speed = Math.max(0.1, parseFloat(config.speed) || 0.6);
        const interval = Math.max(1, parseFloat(config.interval) || 4);
        const loop = config.loop !== '0';
        const direction = config.direction === 'down' ? 'down' : 'up';

        function makeLine(msg) {
            const div = document.createElement('div');
            div.className = 'ticker-line';
            div.style.justifyContent = justify;
            div.setAttribute('data-wrap', isWrap ? 'true' : 'false');
            div.innerHTML = msg;
            return div;
        }

        let index = 0;
        const first = makeLine(messages[0]);
        track.appendChild(first);

        let currentHeight = 0;

        function measureAndSetHeight() {
            currentHeight = first.getBoundingClientRect().height || currentHeight;
            if (currentHeight > 0) {
                viewport.style.height = currentHeight + 'px';
            }
        }

        requestAnimationFrame(() => {
            measureAndSetHeight();
            if (messages.length > 1) {
                tickerTimer = setInterval(advance, (interval + speed) * 1000);
            }
        });

        window.addEventListener('resize', () => {
            measureAndSetHeight();
        });

        function advance() {
            let nextIndex = index + 1;
            if (nextIndex >= messages.length) {
                if (!loop) {
                    clearInterval(tickerTimer);
                    tickerTimer = null;
                    return;
                }
                nextIndex = 0;
            }

            const nextLine = makeLine(messages[nextIndex]);
            const activeHeight = viewport.getBoundingClientRect().height || currentHeight;

            if (direction === 'up') {
                track.appendChild(nextLine);
                track.style.transition = 'none';
                track.style.transform = 'translateY(0)';
                void track.offsetHeight;
                track.style.transition = `transform ${speed}s ease-in-out`;
                track.style.transform = `translateY(-${activeHeight}px)`;
            } else {
                track.insertBefore(nextLine, track.firstChild);
                track.style.transition = 'none';
                track.style.transform = `translateY(-${activeHeight}px)`;
                void track.offsetHeight;
                track.style.transition = `transform ${speed}s ease-in-out`;
                track.style.transform = 'translateY(0)';
            }

            index = nextIndex;

            track.addEventListener('transitionend', function handler() {
                track.removeEventListener('transitionend', handler);
                track.style.transition = 'none';
                track.innerHTML = '';
                track.appendChild(nextLine);
                track.style.transform = 'translateY(0)';
                measureAndSetHeight();
            }, { once: true });
        }
    }

    function fillForm(config) {
        document.getElementById('position').value = config.position;
        document.getElementById('direction').value = config.direction;
        document.getElementById('align').value = config.align;
        document.getElementById('interval').value = config.interval;
        document.getElementById('speed').value = config.speed;
        document.getElementById('loop').value = config.loop;
        document.getElementById('wrap').value = config.wrap;
        document.getElementById('font_color').value = config.font_color;
        document.getElementById('fontColorPicker').value = config.font_color;
        document.getElementById('outline_color').value = config.outline_color;
        document.getElementById('outlineColorPicker').value = config.outline_color;
        document.getElementById('outline_size').value = config.outline_size;
        document.getElementById('font').value = config.font;
        document.getElementById('size').value = config.size;

        const textList = document.getElementById('text-list');
        const messages = config.text.replace(/%5BBR%5D/g, '[BR]').split('[BR]');
        textList.innerHTML = '';

        messages.forEach((message, index) => {
            const div = document.createElement('div');
            div.className = 'input-group mb-1';
            div.setAttribute('data-id', index);
            div.innerHTML = `
                <input type="text" name="text-pre[]" class="form-control text-input" placeholder="文字" value="${message}">
                <button class="btn btn-outline-danger del-text" type="button" data-id="${index}">刪除</button>
            `;
            textList.appendChild(div);
        });
        textList._nextId = messages.length;
    }

    function readFormConfig() {
        const textInputs = document.querySelectorAll('.text-input');
        const texts = Array.from(textInputs).map(input => input.value).filter(text => text.trim());
        return {
            text: texts.join('[BR]'),
            font: document.getElementById('font').value,
            font_color: document.getElementById('font_color').value,
            size: document.getElementById('size').value,
            direction: document.getElementById('direction').value,
            align: document.getElementById('align').value,
            interval: document.getElementById('interval').value,
            speed: document.getElementById('speed').value,
            loop: document.getElementById('loop').value,
            wrap: document.getElementById('wrap').value,
            position: document.getElementById('position').value,
            outline_color: document.getElementById('outline_color').value,
            outline_size: document.getElementById('outline_size').value
        };
    }

    function buildLegacyUrl(config) {
        let url = window.location.origin + window.location.pathname + '?';
        url += `text=${encodeURIComponent(config.text)}`;
        url += `&font=${encodeURIComponent(config.font)}`;
        url += `&font_color=${encodeURIComponent(config.font_color)}`;
        url += `&size=${encodeURIComponent(config.size)}`;
        url += `&direction=${config.direction}`;
        url += `&align=${config.align}`;
        url += `&interval=${config.interval}`;
        url += `&speed=${config.speed}`;
        url += `&loop=${config.loop}`;
        url += `&wrap=${config.wrap}`;
        url += `&position=${config.position}`;
        url += `&outline_color=${encodeURIComponent(config.outline_color)}`;
        url += `&outline_size=${config.outline_size}`;
        url += `&obs=1`;
        return url;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const sync = new NekoSync('scroll-text', { defaults: DEFAULTS, schemaVersion: 1 });

        let config = sync.init();

        const legacy = getLegacyUrlParams();
        if (sync.migrateFromLegacyIfEmpty(legacy)) {
            config = sync.loadLocal();
        }

        if (isOBS()) {
            document.getElementById('content').style.display = 'none';
        } else {
            document.getElementById('content').style.display = 'block';
            const body = document.querySelector('body');
            body.setAttribute('data-bs-theme', 'dark');

            fillForm(config);
            document.getElementById('obsUrl').value = sync.buildObsSourceUrl();
            NekoMask.attach(document.getElementById('obsUrl'), document.getElementById('toggleObsUrl'));
            document.getElementById('preview').value = buildLegacyUrl(config);

            document.getElementById('fontColorPicker').addEventListener('change', function () {
                document.getElementById('font_color').value = this.value;
            });
            document.getElementById('outlineColorPicker').addEventListener('change', function () {
                document.getElementById('outline_color').value = this.value;
            });

            document.getElementById('add-text').addEventListener('click', function () {
                const textList = document.getElementById('text-list');
                const nextId = textList._nextId || textList.querySelectorAll('[data-id]').length;
                const template = `
                    <div class="input-group mb-1" data-id="${nextId}">
                        <input type="text" name="text-pre[]" class="form-control text-input" placeholder="文字">
                        <button class="btn btn-outline-danger del-text" type="button" data-id="${nextId}">刪除</button>
                    </div>
                `;
                textList.insertAdjacentHTML('beforeend', template);
                textList._nextId = nextId + 1;
            });

            document.addEventListener('click', function (e) {
                if (e.target.classList.contains('del-text')) {
                    const id = e.target.getAttribute('data-id');
                    document.querySelector(`div[data-id="${id}"]`).remove();
                }
            });

            document.getElementById('generatePreview').addEventListener('click', function () {
                const newConfig = readFormConfig();
                sync.save(newConfig);
                document.getElementById('preview').value = buildLegacyUrl(newConfig);
            });

            document.getElementById('copyObsUrl').addEventListener('click', function () {
                const input = document.getElementById('obsUrl');
                input.select();
                try {
                    navigator.clipboard.writeText(input.value);
                } catch (e) {
                    document.execCommand('copy');
                }
                this.textContent = '已複製！';
                setTimeout(() => { this.textContent = '複製'; }, 1500);
            });

            document.getElementById('preview').addEventListener('click', function () {
                this.select();
                document.execCommand('copy');
                this.classList.add('is-valid');
                setTimeout(() => {
                    this.className = 'form-control';
                }, 3000);
            });

            NekoSyncPanel.mount(document.getElementById('syncPanelMount'), sync);
        }

        sync.onChange(function (newConfig, source) {
            config = newConfig;
            initializeTicker(config);
            if (!isOBS() && source === 'remote') {
                fillForm(config);
                document.getElementById('preview').value = buildLegacyUrl(config);
            }
        });

        initializeTicker(config);
    });
})();
