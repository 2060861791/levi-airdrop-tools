class AccountManager {
    constructor() {
        this.isEditing = false;
        this.allData = []; // 存储所有导入的数据
        this.currentPage = 0; // 当前页码
        this.pageSize = 5; // 每页显示行数
        this.tfaTimers = {}; // 存储2FA倒计时定时器
        this.tfaData = {}; // 存储2FA数据
        
        this.initElements();
        this.loadData(); // 先加载数据
        this.init();
    }

    initElements() {
        this.editBtn = document.getElementById('editBtn');
        this.importBtn = document.getElementById('importBtn');
        this.fileInput = document.getElementById('fileInput');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.pageInfo = document.getElementById('pageInfo');
        this.groupLabel = document.getElementById('groupLabel');
        this.table = document.getElementById('accountTable');
        this.tableBody = document.getElementById('tableBody');
        this.toast = document.getElementById('toast');
    }

    init() {
        this.renderTable();
        this.bindEvents();
        this.updatePageInfo();
        // 初始渲染后处理验证码
        setTimeout(() => {
            this.processAllCodes();
        }, 500);
    }

    loadData() {
        const stored = localStorage.getItem('accountData');
        const storedPage = localStorage.getItem('currentPage');
        
        if (stored) {
            this.allData = JSON.parse(stored);
            this.currentPage = storedPage ? parseInt(storedPage) : 0;
        } else {
            // 默认数据 - 5行8列，第一行包含测试数据
            this.allData = Array(5).fill().map(() => Array(8).fill(''));
            this.allData[0] = ['test_user', 'test_pass', '7QVFUT3Y3Y67T4F4', '', 'test_tg_pass', 'test@example.com', 'test_dc_pass', 'nifb e22b k7c7 iwi5 gtqn u5qp nbut humh'];
            this.currentPage = 0;
        }
        
        // 设置当前页面数据
        this.data = this.getCurrentPageData();
    }

    getCurrentPageData() {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.allData.slice(start, end);
        
        // 确保总是有5行数据
        while (pageData.length < this.pageSize) {
            pageData.push(Array(8).fill(''));
        }
        
        return pageData;
    }

    saveData() {
        // 将当前页面数据保存回总数据中
        const start = this.currentPage * this.pageSize;
        
        // 确保 allData 有足够的长度来存储当前页面数据
        while (this.allData.length < start + this.pageSize) {
            this.allData.push(Array(8).fill(''));
        }
        
        for (let i = 0; i < this.pageSize; i++) {
            this.allData[start + i] = [...this.data[i]];
        }
        
        localStorage.setItem('accountData', JSON.stringify(this.allData));
        localStorage.setItem('currentPage', this.currentPage.toString());
    }

    renderTable() {
        this.tableBody.innerHTML = '';
        
        for (let i = 0; i < this.pageSize; i++) {
            const row = document.createElement('tr');
            
            for (let j = 0; j < 8; j++) {
                const cell = document.createElement('td');
                cell.textContent = this.data[i][j] || '';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // 添加账号类型样式
                if (j < 3) {
                    cell.classList.add('x-account');
                } else if (j < 5) {
                    cell.classList.add('tg-account');
                } else {
                    cell.classList.add('dc-account');
                }
                
                // 确保文本居中对齐
                cell.style.textAlign = 'center';
                
                row.appendChild(cell);
            }
            
            this.tableBody.appendChild(row);
        }
    }

    bindEvents() {
        this.editBtn.addEventListener('click', () => {
            this.toggleEditMode();
        });

        this.importBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileImport(e);
        });

        this.prevBtn.addEventListener('click', () => {
            this.previousPage();
        });

        this.nextBtn.addEventListener('click', () => {
            this.nextPage();
        });

        this.tableBody.addEventListener('click', (e) => {
            if (e.target.tagName === 'TD') {
                if (this.isEditing) {
                    this.editCell(e.target);
                } else {
                    // 检查是否点击的是包含特殊内容的列
                    const col = parseInt(e.target.dataset.col);
                    
                    // X-2FA和DC-2FA列有验证码时，不执行复制（已经有专门的点击事件）
                    if ((col === 2 || col === 7) && e.target.querySelector('.tfa-countdown')) {
                        return;
                    }
                    
                    this.copyCell(e.target);
                }
            }
        });

        this.tableBody.addEventListener('blur', (e) => {
            if (e.target.tagName === 'TD' && e.target.contentEditable === 'true') {
                this.saveCell(e.target);
            }
        }, true);

        this.tableBody.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.contentEditable === 'true') {
                e.preventDefault();
                e.target.blur();
            }
        });

        // 监听粘贴事件，强制转换为纯文本
        this.tableBody.addEventListener('paste', (e) => {
            if (e.target.tagName === 'TD' && e.target.contentEditable === 'true') {
                e.preventDefault();
                
                // 获取剪贴板中的纯文本
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                
                // 清除当前选择并插入纯文本
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    selection.deleteFromDocument();
                }
                
                // 直接设置文本内容，避免HTML格式
                document.execCommand('insertText', false, text);
            }
        });
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showToast('请选择CSV文件', true);
            return;
        }

        try {
            const text = await this.readFile(file);
            const importedData = this.parseCSV(text);
            
            if (importedData.length === 0) {
                this.showToast('CSV文件为空或格式错误', true);
                return;
            }

            // 更新数据
            this.allData = importedData;
            this.currentPage = 0;
            this.data = this.getCurrentPageData();
            
            // 重新渲染
            this.renderTable();
            this.updatePageInfo();
            this.saveData(); // 保存新的数据状态
            
            // 处理验证码
            setTimeout(() => {
                this.processAllCodes();
            }, 100);
            
            this.showToast(`成功导入 ${importedData.length} 行数据`);
        } catch (error) {
            console.error('导入文件失败:', error);
            this.showToast('导入文件失败', true);
        }

        // 清除文件输入
        event.target.value = '';
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsText(file, 'utf-8');
        });
    }

    parseCSV(text) {
        const lines = text.trim().split('\n');
        const data = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // 跳过表头行
            if (i === 0 && line.includes('X用户名')) {
                continue;
            }
            
            // 解析CSV行（处理引号包围的字段）
            const row = this.parseCSVLine(line);
            if (row.length >= 8) {
                data.push(row.slice(0, 8)); // 只取前8列
            }
        }
        
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.saveData(); // 保存当前页面数据
            this.currentPage--;
            this.data = this.getCurrentPageData();
            this.renderTable();
            this.updatePageInfo();
            this.saveData(); // 保存新的当前页面状态
            this.clearAllTimers();
            setTimeout(() => {
                this.processAllCodes();
            }, 100);
        }
    }

    nextPage() {
        const maxPage = Math.max(0, Math.ceil(this.allData.length / this.pageSize) - 1);
        if (this.currentPage < maxPage) {
            this.saveData(); // 保存当前页面数据
            this.currentPage++;
            this.data = this.getCurrentPageData();
            this.renderTable();
            this.updatePageInfo();
            this.saveData(); // 保存新的当前页面状态
            this.clearAllTimers();
            setTimeout(() => {
                this.processAllCodes();
            }, 100);
        }
    }

    updatePageInfo() {
        const totalPages = Math.max(1, Math.ceil(this.allData.length / this.pageSize));
        const currentPageDisplay = this.currentPage + 1;
        
        this.pageInfo.textContent = `第 ${currentPageDisplay} 页 / 共 ${totalPages} 页`;
        
        // 更新组别标识
        this.updateGroupLabel();
        
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage >= totalPages - 1 || this.allData.length === 0;
    }

    updateGroupLabel() {
        // 计算当前组的空投范围
        // 从空投30开始，每组5个账号
        const startNumber = 30 + (this.currentPage * this.pageSize) + 1;
        const endNumber = startNumber + this.pageSize - 1;
        
        this.groupLabel.textContent = `空投${startNumber}-空投${endNumber}`;
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        
        if (this.isEditing) {
            this.editBtn.textContent = '保存';
            this.editBtn.classList.add('editing');
            // 进入编辑模式时，清除所有2FA显示和定时器
            this.clearAllTimers();
            this.clearAllTFADisplays();
        } else {
            this.editBtn.textContent = '编辑';
            this.editBtn.classList.remove('editing');
            this.saveData();
            // 只有在退出编辑模式（保存）时才开始处理所有验证码
            this.processAllCodes();
        }

        // 更新所有单元格的可编辑状态
        const cells = this.tableBody.querySelectorAll('td');
        cells.forEach(cell => {
            if (this.isEditing) {
                cell.classList.add('editable');
                cell.contentEditable = 'true';
            } else {
                cell.classList.remove('editable');
                cell.contentEditable = 'false';
            }
        });
    }

    editCell(cell) {
        cell.focus();
    }

    saveCell(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.data[row][col] = cell.textContent.trim();
    }

    async copyCell(cell) {
        const text = cell.textContent.trim();
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('复制成功！');
        } catch (err) {
            // 备用复制方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('复制成功！');
        }
    }

    showToast(message, isError = false) {
        this.toast.textContent = message;
        this.toast.classList.toggle('error', isError);
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2000);
    }

    // Base32解码函数
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

    // 解析Secret（支持Base32和otpauth:// URI）
    parseSecret(input) {
        input = input.trim();
        if (input.startsWith('otpauth://')) {
            try {
                const url = new URL(input);
                const s = url.searchParams.get('secret') || '';
                const digits = parseInt(url.searchParams.get('digits') || '6', 10);
                const period = parseInt(url.searchParams.get('period') || '30', 10);
                let algo = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase();
                // 转换为Web Crypto API支持的算法名称
                if (algo === 'SHA1') algo = 'SHA-1';
                if (algo === 'SHA256') algo = 'SHA-256';
                if (algo === 'SHA512') algo = 'SHA-512';
                return { secret: s, digits, period, algo };
            } catch { /* fallthrough */ }
        }
        return { secret: input, digits: 6, period: 30, algo: 'SHA-1' };
    }

    // 使用Web Crypto API生成TOTP验证码
    async generateTOTP(secretBase32, { digits = 6, period = 30, algo = 'SHA-1' } = {}) {
        const keyBytes = this.base32ToBytes(secretBase32.replace(/\s+/g, ''));
        if (keyBytes.length === 0) return null;

        // counter = floor(unix / period)
        const nowSec = Math.floor(Date.now() / 1000);
        const counter = Math.floor(nowSec / period);

        // 8字节大端计数器
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);
        view.setUint32(0, Math.floor(counter / 0x100000000), false);
        view.setUint32(4, counter >>> 0, false);

        try {
            // HMAC-SHA1 (默认 TOTP 算法)
            const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: { name: algo } }, false, ['sign']);
            const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));

            // 动态截断（31位）
            const offset = hmac[hmac.length - 1] & 0x0f;
            const code =
                ((hmac[offset] & 0x7f) << 24) |
                (hmac[offset + 1] << 16) |
                (hmac[offset + 2] << 8) |
                (hmac[offset + 3]);

            const mod = 10 ** digits;
            const totpCode = String(code % mod).padStart(digits, '0');
            const timeRemaining = period - (nowSec % period);

            return { code: totpCode, timeRemaining, nowSec, period };
        } catch (error) {
            console.error('TOTP生成失败:', error);
            return null;
        }
    }

    // 处理X-2FA密钥和DC-2FA密钥
    async processAllCodes() {
        // 处理X-2FA TOTP验证码
        for (let i = 0; i < this.pageSize; i++) {
            const key = this.data[i][2]; // X-2FA列 (第3列，索引2)
            if (key && key.trim().length > 0) {
                await this.generateAndDisplayTOTP(i, key.trim(), 2); // 第3列
            }
        }
        
        // 处理DC-2FA TOTP验证码
        for (let i = 0; i < this.pageSize; i++) {
            const key = this.data[i][7]; // DC-2FA列 (第8列，索引7)
            if (key && key.trim().length > 0) {
                await this.generateAndDisplayTOTP(i, key.trim(), 7); // 第8列
            }
        }
    }

    // 生成并显示TOTP验证码
    async generateAndDisplayTOTP(rowIndex, key, colIndex = 2) {
        try {
            const { secret, digits, period, algo } = this.parseSecret(key);
            const result = await this.generateTOTP(secret, { digits, period, algo });
            
            if (result) {
                const { code, timeRemaining } = result;
                
                // 更新显示
                this.updateTFADisplay(rowIndex, code, timeRemaining, colIndex);
                
                // 存储数据 - 根据列区分
                const dataKey = `${rowIndex}_${colIndex}`;
                this.tfaData[dataKey] = { 
                    key: secret, 
                    otp: code, 
                    timeRemaining,
                    period,
                    digits,
                    algo,
                    colIndex,
                    lastUpdate: Date.now()
                };
                
                // 启动倒计时
                this.startTFACountdown(rowIndex, timeRemaining, colIndex);
            } else {
                this.showTFAError(rowIndex, '无效的Secret格式', colIndex);
            }
        } catch (error) {
            console.error('生成TOTP验证码失败:', error);
            this.showTFAError(rowIndex, 'Secret解析失败', colIndex);
        }
    }

    // 显示2FA错误信息
    showTFAError(rowIndex, message, colIndex = 2) {
        const cell = this.tableBody.querySelector(`td[data-row="${rowIndex}"][data-col="${colIndex}"]`);
        if (cell) {
            cell.innerHTML = `<span class="error-msg" style="color: #e74c3c; font-size: 9px;">${message}</span>`;
        }
    }

    // 复制2FA验证码（只复制数字，不包括倒计时）
    async copyTFACode(code) {
        // 防抖处理，避免重复点击
        if (this.copyingTFA) return;
        this.copyingTFA = true;
        
        try {
            await navigator.clipboard.writeText(code);
            this.showToast('复制成功！');
        } catch (err) {
            // 备用复制方法
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999); // 移动端兼容
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('复制成功！');
        }
        
        // 300ms后重置防抖标志
        setTimeout(() => {
            this.copyingTFA = false;
        }, 300);
    }

    // 更新2FA显示
    updateTFADisplay(rowIndex, otp, timeRemaining, colIndex = 2) {
        const cell = this.tableBody.querySelector(`td[data-row="${rowIndex}"][data-col="${colIndex}"]`);
        if (cell) {
            cell.innerHTML = `<span class="tfa-countdown" onclick="app.copyTFACode('${otp}')" title="点击复制验证码">${otp}(${timeRemaining}s)</span>`;
        }
    }

    // 启动2FA倒计时
    startTFACountdown(rowIndex, initialTime, colIndex = 2) {
        const timerKey = `${rowIndex}_${colIndex}`;
        
        // 清除之前的定时器
        if (this.tfaTimers[timerKey]) {
            clearInterval(this.tfaTimers[timerKey]);
        }

        let timeLeft = initialTime;
        
        this.tfaTimers[timerKey] = setInterval(async () => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                // 倒计时结束，重新生成TOTP
                clearInterval(this.tfaTimers[timerKey]);
                const tfaData = this.tfaData[timerKey];
                if (tfaData && tfaData.key) {
                    // 使用存储的原始密钥重新生成
                    const originalKey = this.data[rowIndex][colIndex];
                    if (originalKey && originalKey.trim().length > 0) {
                        await this.generateAndDisplayTOTP(rowIndex, originalKey.trim(), colIndex);
                    }
                }
            } else {
                // 更新倒计时显示
                const tfaData = this.tfaData[timerKey];
                if (tfaData) {
                    this.updateTFADisplay(rowIndex, tfaData.otp, timeLeft, colIndex);
                }
            }
        }, 1000);
    }

    // 清理所有定时器
    clearAllTimers() {
        Object.values(this.tfaTimers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        this.tfaTimers = {};
    }

    // 清除所有2FA显示
    clearAllTFADisplays() {
        for (let i = 0; i < this.pageSize; i++) {
            // 清除X-2FA显示
            const x2faCell = this.tableBody.querySelector(`td[data-row="${i}"][data-col="2"]`);
            if (x2faCell) {
                const originalKey = this.data[i][2] || '';
                x2faCell.innerHTML = originalKey;
                x2faCell.style.textAlign = 'center';
            }
            
            // 清除DC-2FA显示
            const dc2faCell = this.tableBody.querySelector(`td[data-row="${i}"][data-col="7"]`);
            if (dc2faCell) {
                const originalKey = this.data[i][7] || '';
                dc2faCell.innerHTML = originalKey;
                dc2faCell.style.textAlign = 'center';
            }
        }
        // 清空所有验证码数据
        this.tfaData = {};
    }
}

// 初始化应用
let app; // 全局变量，供按钮点击事件使用
document.addEventListener('DOMContentLoaded', () => {
    app = new AccountManager();
    
    // 页面卸载时清理定时器
    window.addEventListener('beforeunload', () => {
        app.clearAllTimers();
    });
});
