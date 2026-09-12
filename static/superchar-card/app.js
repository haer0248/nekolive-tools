
(function () {
    'use strict';

    const STORAGE_KEY = 'nekolive-superchat-card';
    const FONT = '"Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const LH = 1.4;

    function gr(angle, stops) { return { angle: angle, stops: stops.map(s => ({ pos: s[0], color: s[1] })) }; }
    function g65(a, b) { return gr(65, [[0, a], [1, b]]); }
    function solid(c) { return gr(0, [[0, c], [1, c]]); }

    const YOUTUBE_TIERS = [
        { key: 'yt-blue', name: '藍', head: solid('#1565C0'), body: solid('#1E88E5'), text: '#FFFFFF', outline: '#000000', min: { twd: 15, usd: 1, jpy: 100 } },
        { key: 'yt-cyan', name: '水藍', head: solid('#00B8D4'), body: solid('#00E5FF'), text: '#000000', outline: '#FFFFFF', min: { twd: 30, usd: 2, jpy: 200 } },
        { key: 'yt-green', name: '綠', head: solid('#00BFA5'), body: solid('#1DE9B6'), text: '#000000', outline: '#FFFFFF', min: { twd: 75, usd: 5, jpy: 500 } },
        { key: 'yt-yellow', name: '黃', head: solid('#FFB300'), body: solid('#FFCA28'), text: '#000000DF', outline: '#FFFFFF', min: { twd: 150, usd: 10, jpy: 1000 } },
        { key: 'yt-orange', name: '橘', head: solid('#E65100'), body: solid('#F57C00'), text: '#FFFFFFDF', outline: '#000000', min: { twd: 300, usd: 20, jpy: 2000 } },
        { key: 'yt-magenta', name: '桃紅', head: solid('#C2185B'), body: solid('#E91E63'), text: '#FFFFFF', outline: '#000000', min: { twd: 750, usd: 50, jpy: 5000 } },
        { key: 'yt-red', name: '紅', head: solid('#D00000'), body: solid('#E62117'), text: '#FFFFFF', outline: '#000000', min: { twd: 1500, usd: 100, jpy: 10000 } }
    ];

    const PLATFORM_TIERS = [
        { key: 'scrank0', name: '藍', head: g65('#85AFDE', '#1565C0'), text: '#000000', outline: '#FFFFFF', min: null },
        { key: 'scrank1', name: '天藍', head: g65('#9CE1EC', '#00B8D4'), text: '#000000', outline: '#FFFFFF', min: { twd: 0 } },
        { key: 'scrank2', name: '青綠', head: g65('#92DFD5', '#00BFA5'), text: '#000000', outline: '#FFFFFF', min: { twd: 75 } },
        { key: 'scrank3', name: '黃', head: g65('#FEE4A8', '#FFB300'), text: '#000000', outline: '#FFFFFF', min: { twd: 150 } },
        { key: 'scrank4', name: '橘', head: g65('#E8A079', '#E65100'), text: '#000000', outline: '#FFFFFF', min: { twd: 300 } },
        { key: 'scrank5', name: '桃紅', head: g65('#E48AAD', '#C2185B'), text: '#000000', outline: '#FFFFFF', min: { twd: 750 } },
        { key: 'scrank6', name: '紅', head: g65('#E07676', '#D00000'), text: '#000000', outline: '#FFFFFF', min: { twd: 1500 } },
        {
            key: 'scrank7', name: '彩虹', text: '#000000', outline: '#FFFFFF', min: { twd: 5000 },
            head: gr(90, [[0, '#FF4A4A'], [0.16, '#FB8F59'], [0.34, '#E4E452'], [0.51, '#3DFF3D'], [0.69, '#4AC7FF'], [0.84, '#4C82FF'], [1, '#FF4CFF']])
        },
        {
            key: 'scrank8', name: '金', text: '#000000', outline: '#FFFFFF', min: { twd: 10000 },
            head: gr(90, [[0, '#BF953F'], [0.25, '#FCF6BA'], [0.5, '#B38728'], [0.75, '#FBF5B7'], [1, '#AA771C']])
        }
    ];
    PLATFORM_TIERS.forEach(t => { if (!t.body) t.body = t.head; });

    const SOURCES = {
        youtube: { tiers: YOUTUBE_TIERS, bases: true },
        platform: { tiers: PLATFORM_TIERS, bases: false }
    };

    const BASE_LABEL = { twd: 'NT$', usd: '$', jpy: '¥' };

    function baseFor(source, base) { return SOURCES[source].bases ? base : 'twd'; }

    function tierByKey(source, key) {
        const list = SOURCES[source].tiers;
        return list.find(t => t.key === key) || list[0];
    }

    function ladderOf(source, base) {
        const k = baseFor(source, base);
        return SOURCES[source].tiers.filter(t => t.min && t.min[k] != null);
    }

    function autoTier(amount, source, base) {
        const k = baseFor(source, base);
        const list = ladderOf(source, base);
        const n = Number(amount) || 0;
        let sel = list[0];
        for (const t of list) {
            if (n >= t.min[k]) sel = t;
        }
        return sel;
    }

    function fmt(n) { return Number(n).toLocaleString('en-US'); }

    function tierRange(tier, source, base) {
        const k = baseFor(source, base);
        if (!tier.min || tier.min[k] == null) return '手動指定';
        const list = ladderOf(source, base);
        const idx = list.indexOf(tier);
        const unit = BASE_LABEL[k];
        if (idx === list.length - 1) return unit + fmt(tier.min[k]) + ' 以上';
        return unit + fmt(tier.min[k]) + ' ~ ' + fmt(list[idx + 1].min[k] - 1);
    }

    const el = id => document.getElementById(id);
    const canvas = el('preview');
    const ctx = canvas.getContext('2d');

    let avatarImage = null;

    const DEFAULTS = {
        style: '1',
        name: '路過的一位觀眾',
        amount: '150',
        currency: 'NT$',
        comment: '這是一筆贊助測試。',
        avatarMode: 'default',
        showName: true,
        showAmount: true,
        comma: true,
        autoWidth: true,
        width: 440,
        radius: 4,
        source: 'youtube',
        base: 'twd',
        colorMode: 'auto',
        tierKey: 'yt-yellow',
        head1: '#FFB300',
        head2: '#FFB300',
        body1: '#FFCA28',
        body2: '#FFCA28',
        text: '#000000',
        outline: '#FFFFFF',
        useOutline: false,
        scale: '2',
        bgMode: 'transparent',
        bgColor: '#27262B',
        padding: 0
    };

    let state = Object.assign({}, DEFAULTS);

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

    function readForm() {
        return {
            style: el('fStyle').value,
            name: el('fName').value,
            amount: el('fAmount').value,
            currency: el('fCurrency').value,
            comment: el('fComment').value,
            avatarMode: el('fAvatarMode').value,
            showName: el('fShowName').checked,
            showAmount: el('fShowAmount').checked,
            comma: el('fComma').checked,
            autoWidth: el('fAutoWidth').checked,
            width: clamp(Number(el('fWidth').value) || 440, 200, 1600),
            radius: clamp(Number(el('fRadius').value) || 0, 0, 60),
            source: el('fSource').value,
            base: el('fBase').value,
            colorMode: document.querySelector('input[name="colorMode"]:checked').value,
            tierKey: state.tierKey,
            head1: el('fHead1').value,
            head2: el('fHead2').value,
            body1: el('fBody1').value,
            body2: el('fBody2').value,
            text: el('fText').value,
            outline: el('fOutline').value,
            useOutline: el('fUseOutline').checked,
            scale: el('fScale').value,
            bgMode: el('fBgMode').value,
            bgColor: el('fBgColor').value,
            padding: clamp(Number(el('fPadding').value) || 0, 0, 200)
        };
    }

    function writeForm(s) {
        el('fStyle').value = s.style;
        el('fName').value = s.name;
        el('fAmount').value = s.amount;
        el('fCurrency').value = s.currency;
        el('fComment').value = s.comment;
        el('fAvatarMode').value = s.avatarMode === 'upload' ? 'default' : s.avatarMode;
        el('fShowName').checked = s.showName;
        el('fShowAmount').checked = s.showAmount;
        el('fComma').checked = s.comma;
        el('fAutoWidth').checked = s.autoWidth;
        el('fWidth').value = s.width;
        el('fRadius').value = s.radius;
        el('fSource').value = s.source;
        el('fBase').value = s.base;
        document.querySelectorAll('input[name="colorMode"]').forEach(r => { r.checked = (r.value === s.colorMode); });
        el('fHead1').value = s.head1;
        el('fHead2').value = s.head2;
        el('fBody1').value = s.body1;
        el('fBody2').value = s.body2;
        el('fText').value = s.text;
        el('fOutline').value = s.outline;
        el('fUseOutline').checked = s.useOutline;
        el('fScale').value = s.scale;
        el('fBgMode').value = s.bgMode;
        el('fBgColor').value = s.bgColor;
        el('fPadding').value = s.padding;
    }

    function currentPalette(s) {
        if (s.colorMode === 'tier') return tierByKey(s.source, s.tierKey);
        if (s.colorMode === 'custom') {
            return {
                key: 'custom',
                name: '自訂',
                head: g65(s.head1, s.head2),
                body: g65(s.body1, s.body2),
                text: s.text,
                outline: s.outline
            };
        }
        return autoTier(s.amount, s.source, s.base);
    }

    function makeFill(c, fill, x, y, w, h) {
        const stops = fill.stops;
        if (stops.length === 2 && stops[0].color === stops[1].color) return stops[0].color;
        const a = fill.angle * Math.PI / 180;
        const dx = Math.sin(a), dy = -Math.cos(a);
        const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
        const cx = x + w / 2, cy = y + h / 2;
        const grad = c.createLinearGradient(
            cx - dx * len / 2, cy - dy * len / 2,
            cx + dx * len / 2, cy + dy * len / 2
        );
        stops.forEach(s => grad.addColorStop(clamp(s.pos, 0, 1), s.color));
        return grad;
    }

    function cssFill(fill) {
        if (fill.stops.length === 2 && fill.stops[0].color === fill.stops[1].color) return fill.stops[0].color;
        return 'linear-gradient(' + fill.angle + 'deg, ' +
            fill.stops.map(s => s.color + ' ' + (s.pos * 100) + '%').join(', ') + ')';
    }

    function roundRect(c, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        c.beginPath();
        if (typeof c.roundRect === 'function') {
            c.roundRect(x, y, w, h, rr);
            return;
        }
        c.moveTo(x + rr, y);
        c.lineTo(x + w - rr, y);
        c.quadraticCurveTo(x + w, y, x + w, y + rr);
        c.lineTo(x + w, y + h - rr);
        c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        c.lineTo(x + rr, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - rr);
        c.lineTo(x, y + rr);
        c.quadraticCurveTo(x, y, x + rr, y);
        c.closePath();
    }

    function font(weight, size) {
        return weight + ' ' + size + 'px ' + FONT;
    }

    const WORD_RE = /[0-9A-Za-z@#$%&'’*+\-./:=?^_~]/;

    function wrapLine(c, text, maxWidth) {
        const tokens = [];
        let buf = '';
        for (const ch of text) {
            if (WORD_RE.test(ch)) {
                buf += ch;
            } else {
                if (buf) { tokens.push(buf); buf = ''; }
                tokens.push(ch);
            }
        }
        if (buf) tokens.push(buf);

        const lines = [];
        let cur = '';
        const pushHardBreaks = () => {
            while (c.measureText(cur).width > maxWidth && Array.from(cur).length > 1) {
                const chars = Array.from(cur);
                let cut = chars.length - 1;
                while (cut > 1 && c.measureText(chars.slice(0, cut).join('')).width > maxWidth) cut--;
                lines.push(chars.slice(0, cut).join(''));
                cur = chars.slice(cut).join('');
            }
        };

        for (const t of tokens) {
            if (t === ' ' && cur === '') continue;
            const test = cur + t;
            if (cur !== '' && c.measureText(test).width > maxWidth) {
                lines.push(cur.replace(/\s+$/, ''));
                cur = (t === ' ') ? '' : t;
                pushHardBreaks();
            } else {
                cur = test;
            }
        }
        if (cur !== '') { pushHardBreaks(); lines.push(cur); }
        return lines.length ? lines : [''];
    }

    function wrapText(c, text, maxWidth) {
        const out = [];
        text.split('\n').forEach(para => {
            wrapLine(c, para, maxWidth).forEach(l => out.push(l));
        });
        return out;
    }

    function drawText(c, text, x, centerY, opts) {
        c.font = opts.font;
        c.textBaseline = 'middle';
        c.textAlign = 'left';
        if (opts.outline) {
            c.lineWidth = 4;
            c.lineJoin = 'round';
            c.miterLimit = 2;
            c.strokeStyle = opts.outline;
            c.strokeText(text, x, centerY);
        }
        c.fillStyle = opts.fill;
        c.fillText(text, x, centerY);
    }

    function drawDefaultAvatar(c, x, y, size) {
        c.save();
        c.beginPath();
        c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        c.closePath();
        c.clip();
        c.fillStyle = '#FFFFFF';
        c.fillRect(x, y, size, size);
        c.fillStyle = '#B4B4C2';
        c.beginPath();
        c.arc(x + size / 2, y + size * 0.38, size * 0.19, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(x + size / 2, y + size * 0.92, size * 0.32, Math.PI, Math.PI * 2);
        c.fill();
        c.fillRect(x + size * 0.18, y + size * 0.92, size * 0.64, size * 0.2);
        c.restore();
    }

    function drawAvatar(c, x, y, size) {
        if (!avatarImage) { drawDefaultAvatar(c, x, y, size); return; }
        c.save();
        c.beginPath();
        c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        c.closePath();
        c.clip();
        c.fillStyle = '#FFFFFF';
        c.fillRect(x, y, size, size);
        const iw = avatarImage.naturalWidth || avatarImage.width;
        const ih = avatarImage.naturalHeight || avatarImage.height;
        if (iw && ih) {
            const ratio = Math.min(size / iw, size / ih);
            const dw = iw * ratio, dh = ih * ratio;
            c.drawImage(avatarImage, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
        }
        c.restore();
    }

    const M = {
        avatar: 40,
        headPadX: 16,
        headPadY: 8,
        headGap: 8,
        contentPadX: 16,
        contentPadY: 8,
        headMinH: 20,
        amountGap: 5
    };

    function buildModel(s) {
        const style2 = s.style === '2';
        const pal = currentPalette(s);

        const nameSize = style2 ? 15 : 14;
        const amountSize = 15;
        const msgSize = 15;

        const nameFont = font(900, nameSize);
        const amountFont = font(400, amountSize);
        const msgFont = font(400, msgSize);

        const nameText = (s.name || '').trim() === '' ? '匿名' : s.name.trim();
        let amountText;
        const rawAmount = String(s.amount).trim();
        if (rawAmount !== '') {
            const n = Number(rawAmount);
            amountText = (s.comma && isFinite(n)) ? n.toLocaleString('en-US') : rawAmount;
        } else {
            amountText = s.comma ? (0).toLocaleString('en-US') : '0';
        }
        amountText = (s.currency || '') + amountText;

        const showName = s.showName;
        const showAmount = s.showAmount;
        const showAvatar = s.avatarMode !== 'none';
        const comment = s.comment.replace(/\r\n/g, '\n').replace(/\s+$/, '');
        const hasComment = comment.trim() !== '';

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.font = nameFont;
        const nameW = showName ? ctx.measureText(nameText).width : 0;
        ctx.font = amountFont;
        const amountW = showAmount ? ctx.measureText(amountText).width : 0;

        const headTextLeft = M.headPadX + (showAvatar ? M.avatar + M.headGap : 0);
        const headTextRightPad = (showAvatar ? M.headGap : 0) + M.headPadX;

        let headTextW;
        if (style2) {
            headTextW = nameW + ((showName && showAmount) ? M.amountGap : 0) + amountW;
        } else {
            headTextW = Math.max(nameW, amountW);
        }
        const headerNeeded = headTextLeft + headTextW + headTextRightPad;

        let cardW;
        if (s.autoWidth) {
            ctx.font = msgFont;
            let msgNeeded = 0;
            if (hasComment) {
                comment.split('\n').forEach(p => {
                    msgNeeded = Math.max(msgNeeded, ctx.measureText(p).width);
                });
                msgNeeded += M.contentPadX * 2;
            }
            cardW = Math.max(200, Math.ceil(Math.max(headerNeeded, msgNeeded)));
            cardW = Math.min(cardW, s.width);
        } else {
            cardW = s.width;
        }
        cardW = Math.max(200, Math.round(cardW));

        const nameLH = Math.round(nameSize * LH);
        const amountLH = Math.round(amountSize * LH);
        const msgLH = Math.round(msgSize * LH);

        let headInnerH;
        if (style2) {
            headInnerH = (showName || showAmount) ? Math.max(nameLH, amountLH) : 0;
        } else {
            headInnerH = (showName ? nameLH : 0) + (showAmount ? amountLH : 0);
        }
        const headBoxH = Math.max(M.headMinH, showAvatar ? M.avatar : 0, headInnerH);
        const headerH = headBoxH + M.headPadY * 2;

        let lines = [];
        let contentH = 0;
        if (hasComment) {
            ctx.font = msgFont;
            lines = wrapText(ctx, comment, cardW - M.contentPadX * 2);
            contentH = lines.length * msgLH + M.contentPadY * 2;
        }
        ctx.restore();

        return {
            style2, pal, cardW, headerH, contentH,
            cardH: headerH + contentH,
            nameFont, amountFont, msgFont,
            nameText, amountText, showName, showAmount, showAvatar,
            nameLH, amountLH, msgLH,
            headTextLeft, headInnerH, headBoxH, lines,
            outline: s.useOutline ? pal.outline : null,
            radius: s.radius
        };
    }

    function render(target, s, scale) {
        const m = buildModel(s);
        const pad = s.padding;
        const totalW = m.cardW + pad * 2;
        const totalH = m.cardH + pad * 2;

        target.width = Math.round(totalW * scale);
        target.height = Math.round(totalH * scale);
        target.style.width = totalW + 'px';

        const c = target.getContext('2d');
        c.setTransform(scale, 0, 0, scale, 0, 0);
        c.clearRect(0, 0, totalW, totalH);

        if (s.bgMode === 'color') {
            c.fillStyle = s.bgColor;
            c.fillRect(0, 0, totalW, totalH);
        }

        c.save();
        c.translate(pad, pad);

        roundRect(c, 0, 0, m.cardW, m.cardH, m.radius);
        c.save();
        c.clip();

        if (m.style2) {
            c.fillStyle = makeFill(c, m.pal.head, 0, 0, m.cardW, m.cardH);
            c.fillRect(0, 0, m.cardW, m.cardH);
        } else {
            c.fillStyle = makeFill(c, m.pal.head, 0, 0, m.cardW, m.headerH);
            c.fillRect(0, 0, m.cardW, m.headerH);
            if (m.contentH > 0) {
                c.fillStyle = makeFill(c, m.pal.body, 0, m.headerH, m.cardW, m.contentH);
                c.fillRect(0, m.headerH, m.cardW, m.contentH);
            }
        }

        const headTop = M.headPadY;
        if (m.showAvatar) {
            drawAvatar(c, M.headPadX, headTop + (m.headBoxH - M.avatar) / 2, M.avatar);
        }

        const innerTop = headTop + (m.headBoxH - m.headInnerH) / 2;
        const opts = { fill: m.pal.text, outline: m.outline };

        if (m.style2) {
            const centerY = innerTop + m.headInnerH / 2;
            let x = m.headTextLeft;
            if (m.showName) {
                drawText(c, m.nameText, x, centerY, Object.assign({ font: m.nameFont }, opts));
                c.font = m.nameFont;
                x += c.measureText(m.nameText).width + (m.showAmount ? M.amountGap : 0);
            }
            if (m.showAmount) {
                drawText(c, m.amountText, x, centerY, Object.assign({ font: m.amountFont }, opts));
            }
        } else {
            let y = innerTop;
            if (m.showName) {
                drawText(c, m.nameText, m.headTextLeft, y + m.nameLH / 2, Object.assign({ font: m.nameFont }, opts));
                y += m.nameLH;
            }
            if (m.showAmount) {
                drawText(c, m.amountText, m.headTextLeft, y + m.amountLH / 2, Object.assign({ font: m.amountFont }, opts));
            }
        }

        if (m.contentH > 0) {
            const bodyOpts = { fill: m.pal.text, outline: m.outline, font: m.msgFont };
            let y = m.headerH + M.contentPadY;
            m.lines.forEach(line => {
                drawText(c, line, M.contentPadX, y + m.msgLH / 2, bodyOpts);
                y += m.msgLH;
            });
        }

        c.restore();
        c.restore();
    }

    let toastTimer = null;
    function toast(msg) {
        el('toast').textContent = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el('toast').textContent = ''; }, 3000);
    }

    function paintSwatch(node, tier) {
        const halves = node.querySelectorAll('span');
        halves[0].style.background = cssFill(tier.head);
        halves[1].style.background = cssFill(tier.body);
    }

    function buildTierGrid(source, base) {
        const grid = el('tierGrid');
        grid.textContent = '';
        SOURCES[source].tiers.forEach(t => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sc-tier';
            btn.dataset.key = t.key;

            const bar = document.createElement('span');
            bar.className = 'sc-swatch';
            bar.appendChild(document.createElement('span'));
            bar.appendChild(document.createElement('span'));
            paintSwatch(bar, t);

            const text = document.createElement('span');
            text.className = 'sc-tier-text';
            const b = document.createElement('b');
            b.textContent = t.name;
            text.appendChild(b);
            text.appendChild(document.createTextNode(tierRange(t, source, base)));

            btn.appendChild(bar);
            btn.appendChild(text);
            btn.addEventListener('click', () => {
                state.tierKey = t.key;
                el('fHead1').value = t.head.stops[0].color;
                el('fHead2').value = t.head.stops[t.head.stops.length - 1].color;
                el('fBody1').value = t.body.stops[0].color;
                el('fBody2').value = t.body.stops[t.body.stops.length - 1].color;
                update();
            });
            grid.appendChild(btn);
        });
    }

    let gridSource = null;
    let gridBase = null;

    function syncVisibility(s) {
        el('autoBox').classList.toggle('hidden', s.colorMode !== 'auto');
        el('tierBox').classList.toggle('hidden', s.colorMode !== 'tier');
        el('customBox').classList.toggle('hidden', s.colorMode !== 'custom');
        el('bodyColorRow').classList.toggle('hidden', s.style === '2');
        el('baseBox').classList.toggle('hidden', !SOURCES[s.source].bases);
        el('fAvatarFile').classList.toggle('hidden', s.avatarMode !== 'upload');
        el('widthLabel').textContent = s.autoWidth ? '最大寬度 (px)' : '卡片寬度 (px)';
        el('widthHint').textContent = s.autoWidth
            ? '卡片會依內容長度自己撐開，最寬不超過這個數字，超過就換行。'
            : '固定用這個寬度，不隨內容變動。最窄 200px。';

        const base = baseFor(s.source, s.base);
        if (gridSource !== s.source || gridBase !== base) {
            gridSource = s.source;
            gridBase = base;
            if (!SOURCES[s.source].tiers.some(t => t.key === state.tierKey)) {
                state.tierKey = autoTier(s.amount, s.source, s.base).key;
            }
            buildTierGrid(s.source, s.base);
        }

        if (s.colorMode === 'auto') {
            const t = autoTier(s.amount, s.source, s.base);
            paintSwatch(el('autoChip'), t);
            el('autoText').textContent = '目前色階：' + t.name + '（' + tierRange(t, s.source, s.base) + '）';
            el('autoHint').textContent = s.source === 'youtube'
                ? 'YouTube 超級留言的原始配色，深色是標題底、淺色是留言底。台幣級距是美金的 15 倍。'
                : '平台 ChatList 小工具內建的漸層色階，門檻以新台幣為準。最低階是天藍，藍色小工具不會自動套用，要用請切到「指定色階」。';
        }
        document.querySelectorAll('.sc-tier').forEach(b => {
            b.classList.toggle('selected', b.dataset.key === s.tierKey);
        });
    }

    function update(save) {
        state = readForm();
        syncVisibility(state);
        render(canvas, state, Number(state.scale));
        el('metaSize').textContent = canvas.width + ' × ' + canvas.height + ' px（' + state.scale + 'x）';
        const pal = currentPalette(state);
        el('metaTier').textContent = pal.key === 'custom' ? '自訂' : pal.name + '／' + pal.key;
        if (save !== false) persist();
    }

    function persist() {
        try {
            const copy = Object.assign({}, state);
            copy.avatarMode = copy.avatarMode === 'upload' ? 'default' : copy.avatarMode;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
        } catch (e) { /* 無痕模式等情況直接略過 */ }
    }

    function restore() {
        let saved = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) saved = JSON.parse(raw);
        } catch (e) { saved = null; }
        state = Object.assign({}, DEFAULTS, saved || {});
        if (!SOURCES[state.source]) state.source = DEFAULTS.source;
        if (!BASE_LABEL[state.base]) state.base = DEFAULTS.base;
        if (!SOURCES[state.source].tiers.some(t => t.key === state.tierKey)) {
            state.tierKey = SOURCES[state.source].tiers[0].key;
        }
        writeForm(state);
    }

    function fileName() {
        const name = (state.name || '匿名').replace(/[\\/:*?"<>|]/g, '_').slice(0, 20);
        return 'superchat-' + name + '-' + String(state.amount || '0') + '.png';
    }

    function exportCanvas() {
        const off = document.createElement('canvas');
        render(off, state, Number(state.scale));
        return off;
    }

    el('btnDownload').addEventListener('click', () => {
        exportCanvas().toBlob(blob => {
            if (!blob) { toast('圖片產生失敗，請再試一次。'); return; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName();
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast('已下載 ' + fileName());
        }, 'image/png');
    });

    el('btnCopy').addEventListener('click', async () => {
        if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
            toast('這個瀏覽器不支援複製圖片，請改用下載。');
            return;
        }
        try {
            const off = exportCanvas();
            const blob = await new Promise(res => off.toBlob(res, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast('已複製到剪貼簿。');
        } catch (e) {
            toast('複製失敗：' + e.message);
        }
    });

    el('btnReset').addEventListener('click', () => {
        if (!confirm('要把所有設定回復成預設值嗎？')) return;
        avatarImage = null;
        el('fAvatarFile').value = '';
        state = Object.assign({}, DEFAULTS);
        writeForm(state);
        update();
        toast('已重設。');
    });

    el('fAvatarFile').addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => { avatarImage = img; update(); };
            img.onerror = () => { toast('這張圖片讀不起來，換一張試試。'); };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    el('fAvatarMode').addEventListener('change', () => {
        if (el('fAvatarMode').value !== 'upload') {
            avatarImage = null;
            el('fAvatarFile').value = '';
        }
        update();
    });

    el('fStyle').addEventListener('change', () => {
        el('fRadius').value = el('fStyle').value === '2' ? 12 : 4;
        update();
    });

    ['fName', 'fAmount', 'fCurrency', 'fComment', 'fWidth', 'fRadius', 'fPadding'].forEach(id => {
        el(id).addEventListener('input', () => update());
    });
    ['fShowName', 'fShowAmount', 'fComma', 'fUseOutline', 'fAutoWidth', 'fScale', 'fBgMode', 'fBgColor',
        'fSource', 'fBase', 'fHead1', 'fHead2', 'fBody1', 'fBody2', 'fText', 'fOutline'].forEach(id => {
            el(id).addEventListener('input', () => update());
            el(id).addEventListener('change', () => update());
        });
    document.querySelectorAll('input[name="colorMode"]').forEach(r => {
        r.addEventListener('change', () => update());
    });

    restore();
    update(false);

    const needed = ['400 15px "Noto Sans TC"', '900 15px "Noto Sans TC"', '900 14px "Noto Sans TC"'];
    Promise.all(needed.map(f => document.fonts.load(f).catch(() => null)))
        .then(() => document.fonts.ready)
        .catch(() => null)
        .then(() => update(false));
})();