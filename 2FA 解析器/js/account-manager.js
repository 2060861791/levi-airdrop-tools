// 最小化2FA解析器：左侧输入、TOTP生成、复制、示例/清空按钮（无持久化）
class TFAApp {
    constructor() {
        this.secretInput = document.getElementById('secretInput');
        this.codeList = document.getElementById('codeList');
        this.toast = document.getElementById('toast');
        this.clearBtn = document.getElementById('clearBtn');
        this.demoBtn = document.getElementById('demoBtn');
        this.serverTime = document.getElementById('serverTime');
        this.items = [];
        this.timer = null;
        this.rowMap = new Map();

        this.bindEvents();
        this.updateItems();
        this.startTicker();
    }

    bindEvents() {
        this.secretInput.addEventListener('input', () => {
            this.updateItems();
        });
        this.clearBtn.addEventListener('click', () => {
            this.secretInput.value = '';
            this.updateItems();
        });
        this.demoBtn.addEventListener('click', () => {
            const demo = [
                'JBSWY3DPEHPK3PXP',
                'otpauth://totp/Example:demo?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30'
            ].join('\n');
            this.secretInput.value = demo;
            this.updateItems();
        });
    }

    startTicker() {
        const render = async () => {
            // 显示本地时间
            const now = new Date();
            if (this.serverTime) {
                this.serverTime.textContent = [
                    now.getHours(), now.getMinutes(), now.getSeconds()
                ].map(n => String(n).padStart(2, '0')).join(':');
            }
            await this.renderCodes();
        };
        render();
        this.timer = setInterval(render, 1000);
        window.addEventListener('beforeunload', () => clearInterval(this.timer));
    }

    updateItems() {
        const lines = this.secretInput.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        this.items = lines.map(raw => ({ raw, parsed: this.parseInput(raw) }));
        this.renderCodes();
    }

    async renderCodes() {
        // 复用 DOM，避免整列表重绘导致的频闪
        const aliveKeys = new Set();
        if (this.items.length === 0) {
            // 清空所有残留节点并重置映射
            this.rowMap.forEach(({ row }) => row.remove());
            this.rowMap.clear();
            return;
        }

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const key = item.raw; // 以原始输入作为唯一键
            const p = item.parsed;
            aliveKeys.add(key);

            let cached = this.rowMap.get(key);
            if (!cached) {
                const row = document.createElement('div');
                row.className = 'tfa-item';

                const label = document.createElement('span');
                label.className = 'tfa-label';
                label.textContent = p.label || this.defaultLabel(item.raw);

                const codeSpan = document.createElement('span');
                codeSpan.className = 'tfa-code';

                row.appendChild(label);
                row.appendChild(codeSpan);
                this.codeList.appendChild(row);

                cached = { row, label, codeSpan };
                this.rowMap.set(key, cached);
            } else {
                // 如 label 变化则更新
                const nextLabel = p.label || this.defaultLabel(item.raw);
                if (cached.label.textContent !== nextLabel) {
                    cached.label.textContent = nextLabel;
                }
            }

            const result = await this.generateTOTP(p.secret, { digits: p.digits, period: p.period, algo: p.algo });
            if (result) {
                const nextText = `${result.code} (${result.timeRemaining}s)`;
                if (cached.codeSpan.textContent !== nextText) {
                    cached.codeSpan.textContent = nextText;
                }
                cached.codeSpan.title = '点击复制验证码';
                cached.codeSpan.onclick = () => this.copy(result.code);
                cached.codeSpan.style.opacity = '';
            } else {
                if (cached.codeSpan.textContent !== '无效密钥') {
                    cached.codeSpan.textContent = '无效密钥';
                }
                cached.codeSpan.style.opacity = '0.7';
            }
        }

        // 移除已不存在的条目
        this.rowMap.forEach((value, key) => {
            if (!aliveKeys.has(key)) {
                value.row.remove();
                this.rowMap.delete(key);
            }
        });
    }

    defaultLabel(raw) {
        if (raw.startsWith('otpauth://')) {
            try {
                const url = new URL(raw);
                const issuer = url.searchParams.get('issuer') || '';
                const path = decodeURIComponent(url.pathname || '').replace(/^\//, '');
                return issuer ? `${issuer} (${path})` : (path || 'TOTP');
            } catch { return 'TOTP'; }
        }
        const short = raw.replace(/\s+/g, '');
        return short.length > 6 ? `${short.slice(0,3)}...${short.slice(-3)}` : short || 'TOTP';
    }

    showToast(msg, isError = false) {
        this.toast.textContent = msg;
        this.toast.classList.toggle('error', isError);
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 1500);
    }

    async copy(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('复制成功！');
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.showToast('复制成功！');
        }
    }

    // Base32解码
    base32ToBytes(str) {
        str = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = 0, buffer = 0, out = [];
        for (const ch of str) {
            const val = alphabet.indexOf(ch);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bits += 5;
            if (bits >= 8) {
                out.push((buffer >> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }
        return new Uint8Array(out);
    }

    // 解析输入
    parseInput(input) {
        input = input.trim();
        if (input.startsWith('otpauth://')) {
            try {
                const url = new URL(input);
                const secret = (url.searchParams.get('secret') || '').trim();
                const digits = parseInt(url.searchParams.get('digits') || '6', 10);
                const period = parseInt(url.searchParams.get('period') || '30', 10);
                let algo = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase();
                if (algo === 'SHA1') algo = 'SHA-1';
                if (algo === 'SHA256') algo = 'SHA-256';
                if (algo === 'SHA512') algo = 'SHA-512';
                const label = this.defaultLabel(input);
                return { secret, digits, period, algo, label };
            } catch {
                return { secret: input, digits: 6, period: 30, algo: 'SHA-1', label: 'TOTP' };
            }
        }
        return { secret: input, digits: 6, period: 30, algo: 'SHA-1', label: this.defaultLabel(input) };
    }

    // 生成TOTP
    async generateTOTP(secretBase32, { digits = 6, period = 30, algo = 'SHA-1' } = {}) {
        const keyBytes = this.base32ToBytes((secretBase32 || '').replace(/\s+/g, ''));
        if (keyBytes.length === 0) return null;
        const nowSec = Math.floor(Date.now() / 1000);
        const counter = Math.floor(nowSec / period);
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);
        view.setUint32(0, Math.floor(counter / 0x100000000), false);
        view.setUint32(4, counter >>> 0, false);
        try {
            const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: { name: algo } }, false, ['sign']);
            const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
            const offset = hmac[hmac.length - 1] & 0x0f;
            const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | (hmac[offset + 3]);
            const mod = 10 ** digits;
            const totpCode = String(code % mod).padStart(digits, '0');
            const timeRemaining = period - (nowSec % period);
            return { code: totpCode, timeRemaining };
        } catch {
            return null;
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TFAApp();
});
