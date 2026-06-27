(async () => {
    const W = 1920, H = 1080;

    const app = new PIXI.Application({
        width: W, height: H,
        backgroundAlpha: 0,
        antialias: true,
        resolution: 1,
        powerPreference: 'high-performance',
    });
    document.getElementById('stage').appendChild(app.view);

    function resize() {
        const aspect = W / H;
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        let cw, ch;
        if (ww / wh > aspect) {
            ch = wh; cw = wh * aspect;
        } else {
            cw = ww; ch = ww / aspect;
        }
        app.view.style.width = cw + 'px';
        app.view.style.height = ch + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    const fogMask = PIXI.RenderTexture.create({
        width: W, height: H,
        scaleMode: PIXI.SCALE_MODES.LINEAR,
    });

    function makeCloudNoise(size, octaves) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        const data = img.data;
        const smooth = t => t * t * (3 - 2 * t);
        const makeGrid = p => {
            const g = new Float32Array(p * p);
            for (let i = 0; i < g.length; i++) g[i] = Math.random() * 2 - 1;
            return g;
        };
        const sample = (x, y, g, p) => {
            const xi = Math.floor(x) % p;
            const yi = Math.floor(y) % p;
            const xf = x - Math.floor(x);
            const yf = y - Math.floor(y);
            const tx = smooth(xf);
            const ty = smooth(yf);
            const x1 = (xi + 1) % p;
            const y1 = (yi + 1) % p;
            const a = g[yi * p + xi], b = g[yi * p + x1];
            const c = g[y1 * p + xi], d = g[y1 * p + x1];
            const ab = a + (b - a) * tx;
            const cd = c + (d - c) * tx;
            return ab + (cd - ab) * ty;
        };
        const layers = [];
        for (let o = 0; o < octaves; o++) {
            const p = 4 << o;
            layers.push({ p, g: makeGrid(p) });
        }
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let v = 0, amp = 1, total = 0;
                for (const l of layers) {
                    v += sample(x / size * l.p, y / size * l.p, l.g, l.p) * amp;
                    total += amp;
                    amp *= 0.5;
                }
                v = (v / total + 1) / 2;
                v = Math.pow(v, 1.4);
                const idx = (y * size + x) * 4;
                data[idx] = data[idx + 1] = data[idx + 2] = 255;
                data[idx + 3] = Math.round(v * 255);
            }
        }
        ctx.putImageData(img, 0, 0);
        return PIXI.Texture.from(canvas);
    }

    const noiseTex = makeCloudNoise(512, 5);
    
    const fogBase = new PIXI.Graphics();
    fogBase.beginFill(0xeaf2ff, 1);
    fogBase.drawRect(0, 0, W, H);
    fogBase.endFill();

    const fogNoise = new PIXI.TilingSprite(noiseTex, W, H);
    fogNoise.tint = 0xeaf2ff;
    fogNoise.tileScale.set(3);

    const fogContainer = new PIXI.Container();
    fogContainer.addChild(fogBase);
    fogContainer.addChild(fogNoise);

    const maskSprite = new PIXI.Sprite(fogMask);
    maskSprite.renderable = false;
    app.stage.addChild(maskSprite);
    fogContainer.mask = maskSprite;
    app.stage.addChild(fogContainer);

    function applyDensity() {
        const d = settings.density / 100;
        fogBase.alpha = d * d * 0.9;
        fogNoise.alpha = d * 0.85;
    }

    const SPEED_K = 0.012;
    app.ticker.add(d => {
        if (settings.speed <= 0) return;
        const ang = settings.direction * Math.PI / 180;
        const v = settings.speed * SPEED_K;
        fogNoise.tilePosition.x += Math.cos(ang) * v * d;
        fogNoise.tilePosition.y += Math.sin(ang) * v * d;
    });

    const cursorRing = new PIXI.Graphics();
    cursorRing.visible = false;
    app.stage.addChild(cursorRing);
    let cursorX = 0, cursorY = 0;

    function drawCursor() {
        cursorRing.clear();
        if (!cursorRing.visible) return;
        const r = settings.size;
        cursorRing.lineStyle(3, 0x000000, 0.55);
        cursorRing.drawCircle(cursorX, cursorY, r);
        cursorRing.lineStyle(1.5, 0xffffff, 0.95);
        cursorRing.drawCircle(cursorX, cursorY, r);
        const h = settings.hardness / 100;
        const innerR = r * (1 - (1 - h) * 0.85);
        if (innerR > 4 && innerR < r - 2) {
            cursorRing.lineStyle(1, 0xffffff, 0.35);
            cursorRing.drawCircle(cursorX, cursorY, innerR);
        }
        cursorRing.lineStyle(0);
        cursorRing.beginFill(0xffffff, 0.9);
        cursorRing.drawCircle(cursorX, cursorY, 2);
        cursorRing.endFill();
    }

    const fillRect = new PIXI.Graphics();
    function fillMask(alpha, clear) {
        fillRect.clear();
        fillRect.beginFill(0xffffff, alpha);
        fillRect.drawRect(0, 0, W, H);
        fillRect.endFill();
        app.renderer.render(fillRect, { renderTexture: fogMask, clear: !!clear });
    }

    fillMask(1, true);

    const brush = new PIXI.Sprite(PIXI.Texture.WHITE);
    brush.anchor.set(0.5);
    brush.blendMode = PIXI.BLEND_MODES.ERASE;

    let currentBrushTexture = null;
    function rebuildBrush() {
        const radius = Math.max(5, settings.size);
        const h = settings.hardness / 100;
        const blurPx = (1 - h) * radius * 0.85;
        const innerR = Math.max(1, radius - blurPx);
        const pad = Math.ceil(blurPx * 2.5) + 2;
        const sz = Math.ceil((radius + pad) * 2);
        const c = document.createElement('canvas');
        c.width = c.height = sz;
        const g = c.getContext('2d');
        const cx = sz / 2, cy = sz / 2;
        if (blurPx > 0.5) g.filter = `blur(${blurPx}px)`;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(cx, cy, innerR, 0, Math.PI * 2);
        g.fill();
        g.filter = 'none';

        const tex = PIXI.Texture.from(c);
        brush.texture = tex;
        if (currentBrushTexture) currentBrushTexture.destroy(true);
        currentBrushTexture = tex;
    }

    function eraseAt(x, y) {
        brush.position.set(x, y);
        app.renderer.render(brush, { renderTexture: fogMask, clear: false });
    }

    const settings = {
        size: 120,
        hardness: 50,
        density: 50,
        direction: 22,
        speed: 25,
        recover: 0,
    };
    rebuildBrush();
    applyDensity();

    const canvas = app.view;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'none';

    let lastPos = null;
    let lastStamp = null;
    let isDown = false;
    let panelInteracting = false;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = W / rect.width;
        const sy = H / rect.height;
        return {
            x: (e.clientX - rect.left) * sx,
            y: (e.clientY - rect.top) * sy,
        };
    }

    function getStepFactor() {
        return 0.25 + (1 - settings.hardness / 100) * 0.35;
    }

    function stampMaybe(x, y) {
        const minDist = settings.size * getStepFactor();
        if (lastStamp) {
            const dd = Math.hypot(x - lastStamp.x, y - lastStamp.y);
            if (dd < minDist) return;
        }
        eraseAt(x, y);
        lastStamp = { x, y };
    }

    function strokeTo(p) {
        if (lastPos) {
            const dx = p.x - lastPos.x, dy = p.y - lastPos.y;
            const dist = Math.hypot(dx, dy);
            const step = Math.max(2, settings.size * getStepFactor());
            const steps = Math.max(1, Math.ceil(dist / step));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                stampMaybe(lastPos.x + dx * t, lastPos.y + dy * t);
            }
        } else {
            stampMaybe(p.x, p.y);
        }
        lastPos = p;
    }

    canvas.addEventListener('pointerdown', e => {
        if (panelInteracting) return;
        isDown = true;
        lastPos = null;
        lastStamp = null;
        try { canvas.setPointerCapture(e.pointerId); } catch { }
        strokeTo(getPos(e));
    });

    canvas.addEventListener('pointermove', e => {
        const p = getPos(e);
        cursorX = p.x; cursorY = p.y;
        if (!panelInteracting) {
            cursorRing.visible = true;
            drawCursor();
        }
        if (!isDown || panelInteracting) return;
        strokeTo(p);
    });

    function endStroke(e) {
        isDown = false;
        lastPos = null;
        lastStamp = null;
        if (e) { try { canvas.releasePointerCapture(e.pointerId); } catch { } }
    }

    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
    canvas.addEventListener('pointerenter', e => {
        if (panelInteracting) return;
        const p = getPos(e);
        cursorX = p.x; cursorY = p.y;
        cursorRing.visible = true;
        drawCursor();
    });

    canvas.addEventListener('pointerleave', () => {
        lastPos = null;
        cursorRing.visible = false;
        drawCursor();
    });

    const recoverPerSec = [0, 0.035, 0.13, 0.45];
    const FLUSH_THRESHOLD = 0.01; 
    let recoverAccum = 0;
    app.ticker.add((delta) => {
        if (isDown) { recoverAccum = 0; return; }
        const r = recoverPerSec[settings.recover];
        if (r <= 0) { recoverAccum = 0; return; }
        recoverAccum += r * (delta / 60);
        if (recoverAccum >= FLUSH_THRESHOLD) {
            fillMask(Math.min(recoverAccum, 1), false);
            recoverAccum = 0;
        }
    });

    const $ = id => document.getElementById(id);

    $('size').addEventListener('input', e => {
        settings.size = +e.target.value;
        $('vSize').textContent = settings.size;
        rebuildBrush();
        drawCursor();
    });

    $('hard').addEventListener('input', e => {
        settings.hardness = +e.target.value;
        $('vHard').textContent = settings.hardness;
        rebuildBrush();
        drawCursor();
    });

    $('density').addEventListener('input', e => {
        settings.density = +e.target.value;
        $('vDensity').textContent = settings.density;
        applyDensity();
    });
    $('dir').addEventListener('input', e => {
        settings.direction = +e.target.value;
        $('vDir').textContent = settings.direction;
    });
    $('speed').addEventListener('input', e => {
        settings.speed = +e.target.value;
        $('vSpeed').textContent = settings.speed;
    });
    document.querySelectorAll('#recover button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#recover button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            settings.recover = +btn.dataset.value;
        });
    });
    $('reset').addEventListener('click', () => {
        fillMask(1, true);
    });
    $('clear').addEventListener('click', () => {
        fillMask(0, true);
    });

    const panel = $('panel');
    const header = $('panelHeader');

    let dragging = false, dragOff = { x: 0, y: 0 };
    header.addEventListener('pointerdown', e => {
        dragging = true;
        panelInteracting = true;
        const r = panel.getBoundingClientRect();
        dragOff.x = e.clientX - r.left;
        dragOff.y = e.clientY - r.top;
        panel.style.right = 'auto';
        panel.style.left = r.left + 'px';
        panel.style.top = r.top + 'px';
        header.setPointerCapture(e.pointerId);
    });
    header.addEventListener('pointermove', e => {
        if (!dragging) return;
        const x = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - dragOff.x));
        const y = Math.max(0, Math.min(window.innerHeight - 30, e.clientY - dragOff.y));
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
    });
    header.addEventListener('pointerup', e => {
        dragging = false;
        panelInteracting = false;
        try { header.releasePointerCapture(e.pointerId); } catch { }
    });

    panel.addEventListener('pointerenter', () => { panelInteracting = true; });
    panel.addEventListener('pointerleave', () => { if (!dragging) panelInteracting = false; });

    const showPanelBtn = $('showPanel');
    const hideBtn = $('hidePanel');
    let panelHidden = false;
    let ctrlDown = false;
    function syncShowBtn() {
        showPanelBtn.style.display = (panelHidden && ctrlDown) ? 'flex' : 'none';
    }
    
    hideBtn.addEventListener('pointerdown', e => { e.stopPropagation(); });
    hideBtn.addEventListener('click', e => {
        e.stopPropagation();
        panel.style.display = 'none';
        panelHidden = true;
        panelInteracting = false;
        syncShowBtn();
    });

    showPanelBtn.addEventListener('click', () => {
        panel.style.display = 'flex';
        panelHidden = false;
        syncShowBtn();
    });

    window.addEventListener('keydown', e => {
        if (e.key === 'Control' && !ctrlDown) {
            ctrlDown = true;
            syncShowBtn();
        }
    });

    window.addEventListener('keyup', e => {
        if (e.key === 'Control') {
            ctrlDown = false;
            syncShowBtn();
        }
    });

    window.addEventListener('blur', () => {
        if (ctrlDown) { ctrlDown = false; syncShowBtn(); }
    });

    const BASE_W = 300;
    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            const w = entry.contentRect.width;
            const scale = Math.max(0.6, Math.min(3, w / BASE_W));
            panel.style.setProperty('--ui-scale', scale);
        }
    });
    ro.observe(panel);

})();