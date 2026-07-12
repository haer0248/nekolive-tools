
(function () {
    'use strict';

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            text: params.get('text') || '歡迎來到直播間！[BR]記得按下追隨與訂閱[BR]感謝大家的支持',
            position: params.get('position') || 'bottom',
            font: params.get('font') || "'Noto Sans TC', sans-serif",
            size: params.get('size') || '200%',
            font_color: params.get('font_color') || '#000000',
            outline_color: params.get('outline_color') || '#ffffff',
            outline_size: params.get('outline_size') || '3',
            direction: params.get('direction') || 'up',
            align: params.get('align') || 'center',
            interval: params.get('interval') || '4',
            speed: params.get('speed') || '0.6',
            loop: params.get('loop') || '1',
            wrap: params.get('wrap') || 'false',
            obs: params.get('obs') || '0'
        };
    }

    function isOBS() {
        return navigator.userAgent.includes('OBS') || getUrlParams().obs === '1';
    }

    const alignMap = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end'
    };

    let tickerTimer = null;

    function initializeTicker() {
        const params = getUrlParams();

        const text = params.text.replace(/%5BBR%5D/g, '[BR]');
        const messages = text.split('[BR]').filter(m => m.trim() !== '');
        if (messages.length === 0) messages.push('');

        const mainBox = document.getElementById('mainBox');
        const tickerTrack = document.getElementById('tickerTrack');
        const position = params.position === 'bottom' ? 'bottom: 0;' : 'top: 0;';

        Outline.update(tickerTrack, params.outline_size, params.outline_color);

        mainBox.style.cssText = `
            background: transparent;
            margin: 0 auto;
            width: 100%;
            color: ${params.font_color};
            font-weight: bold;
            position: fixed;
            align-items: center;
            font-size: ${params.size};
            font-family: ${params.font};
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

        const justify = alignMap[params.align] || 'center';
        const isWrap = params.wrap === 'true';
        const speed = Math.max(0.1, parseFloat(params.speed) || 0.6);
        const interval = Math.max(1, parseFloat(params.interval) || 4);
        const loop = params.loop !== '0';
        const direction = params.direction === 'down' ? 'down' : 'up';

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

    function initializeForm() {
        const params = getUrlParams();

        document.getElementById('position').value = params.position;
        document.getElementById('direction').value = params.direction;
        document.getElementById('align').value = params.align;
        document.getElementById('interval').value = params.interval;
        document.getElementById('speed').value = params.speed;
        document.getElementById('loop').value = params.loop;
        document.getElementById('wrap').value = params.wrap;
        document.getElementById('font_color').value = params.font_color;
        document.getElementById('fontColorPicker').value = params.font_color;
        document.getElementById('outline_color').value = params.outline_color;
        document.getElementById('outlineColorPicker').value = params.font_color;
        document.getElementById('outline_size').value = params.outline_size;
        document.getElementById('font').value = params.font;
        document.getElementById('size').value = params.size;

        const textList = document.getElementById('text-list');
        const messages = params.text.replace(/%5BBR%5D/g, '[BR]').split('[BR]');
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

        document.getElementById('fontColorPicker').addEventListener('change', function () {
            document.getElementById('font_color').value = this.value;
        });
        document.getElementById('outlineColorPicker').addEventListener('change', function () {
            document.getElementById('outline_color').value = this.value;
        });

        let nextId = messages.length;
        document.getElementById('add-text').addEventListener('click', function () {
            const template = `
                <div class="input-group mb-1" data-id="${nextId}">
                    <input type="text" name="text-pre[]" class="form-control text-input" placeholder="文字">
                    <button class="btn btn-outline-danger del-text" type="button" data-id="${nextId}">刪除</button>
                </div>
            `;
            document.getElementById('text-list').insertAdjacentHTML('beforeend', template);
            nextId++;
        });

        document.addEventListener('click', function (e) {
            if (e.target.classList.contains('del-text')) {
                const id = e.target.getAttribute('data-id');
                document.querySelector(`div[data-id="${id}"]`).remove();
            }
        });

        document.getElementById('generatePreview').addEventListener('click', generateUrl);

        document.getElementById('preview').addEventListener('click', function () {
            this.select();
            document.execCommand('copy');
            this.classList.add('is-valid');

            setTimeout(() => {
                this.className = 'form-control';
            }, 3000);
        });

        if (params.text && params.text !== '歡迎來到直播間！[BR]記得按下追隨與訂閱[BR]感謝大家的支持') {
            generateUrl();
        }
    }

    function generateUrl() {
        let url = window.location.origin + window.location.pathname + '?';

        const textInputs = document.querySelectorAll('.text-input');
        const texts = Array.from(textInputs).map(input => input.value).filter(text => text.trim());
        const convertedString = texts.join('[BR]');

        url += `text=${encodeURIComponent(convertedString)}`;
        url += `&font=${encodeURIComponent(document.getElementById('font').value)}`;
        url += `&font_color=${encodeURIComponent(document.getElementById('font_color').value)}`;
        url += `&size=${encodeURIComponent(document.getElementById('size').value)}`;
        url += `&direction=${document.getElementById('direction').value}`;
        url += `&align=${document.getElementById('align').value}`;
        url += `&interval=${document.getElementById('interval').value}`;
        url += `&speed=${document.getElementById('speed').value}`;
        url += `&loop=${document.getElementById('loop').value}`;
        url += `&wrap=${document.getElementById('wrap').value}`;
        url += `&position=${document.getElementById('position').value}`;
        url += `&outline_color=${encodeURIComponent(document.getElementById('outline_color').value)}`;
        url += `&outline_size=${document.getElementById('outline_size').value}`;
        url += `&obs=1`;

        document.getElementById('preview').value = url;
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (isOBS()) {
            document.getElementById('content').style.display = 'none';
        } else {
            document.getElementById('content').style.display = 'block';
            const body = document.querySelector("body");
            body.setAttribute('data-bs-theme', 'dark');
            initializeForm();
        }
        initializeTicker();
    });
})();