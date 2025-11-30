const fs = require('fs');
const path = require('path');

// 定义统一密码
const UNIFIED_PASSWORDS = {
    DC: '9b28wk5s17Ea',
    X: '9@HJ1SB41E5R73HGc17Ea', 
    TG: 'JCshd@H2374Ea'
};

// 读取文件内容
function readFileContent(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.trim().split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error(`读取文件失败: ${filePath}`, error);
        return [];
    }
}

// 提取DC账号数据
function extractDCData(lines) {
    const dcData = [];
    
    lines.forEach((line, index) => {
        try {
            // 移除行号前缀（如果存在）
            const cleanLine = line.replace(/^\s*\d+\|/, '');
            const parts = cleanLine.split('----');
            
            if (parts.length >= 4) {
                const email = parts[0].trim();
                const twoFA = parts[3].trim();
                
                dcData.push({
                    email: email,
                    password: UNIFIED_PASSWORDS.DC,
                    twoFA: twoFA
                });
            }
        } catch (error) {
            console.error(`处理DC账号第${index + 1}行时出错:`, error);
        }
    });
    
    return dcData;
}

// 提取X账号数据
function extractXData(lines) {
    const xData = [];
    
    lines.forEach((line, index) => {
        try {
            // 移除行号前缀（如果存在）
            const cleanLine = line.replace(/^\s*\d+\|/, '');
            const parts = cleanLine.split('----');
            
            if (parts.length >= 5) {
                const username = parts[0].trim();
                const twoFA = parts[4].trim();
                
                xData.push({
                    username: username,
                    password: UNIFIED_PASSWORDS.X,
                    twoFA: twoFA
                });
            }
        } catch (error) {
            console.error(`处理X账号第${index + 1}行时出错:`, error);
        }
    });
    
    return xData;
}

// 提取TG账号数据
function extractTGData(lines) {
    const tgData = [];
    
    lines.forEach((line, index) => {
        try {
            // 移除行号前缀（如果存在）
            const cleanLine = line.replace(/^\s*\d+\|/, '');
            const parts = cleanLine.split('----');
            
            if (parts.length >= 1) {
                const phone = parts[0].trim();
                
                tgData.push({
                    phone: phone,
                    password: UNIFIED_PASSWORDS.TG
                });
            }
        } catch (error) {
            console.error(`处理TG账号第${index + 1}行时出错:`, error);
        }
    });
    
    return tgData;
}

// 合并数据并生成CSV
function mergeDataAndCreateCSV(dcData, xData, tgData) {
    // 确定最大行数
    const maxLength = Math.max(dcData.length, xData.length, tgData.length);
    
    // CSV头部
    const headers = ['X用户名', 'X密码', 'X-2FA', 'TG电话', 'TG密码', 'DC邮箱', 'DC密码', 'DC-2FA'];
    
    // 构建CSV内容
    let csvContent = headers.join(',') + '\n';
    
    for (let i = 0; i < maxLength; i++) {
        const xRow = xData[i] || { username: '', password: '', twoFA: '' };
        const tgRow = tgData[i] || { phone: '', password: '' };
        const dcRow = dcData[i] || { email: '', password: '', twoFA: '' };
        
        const row = [
            `"${xRow.username}"`,
            `"${xRow.password}"`,
            `"${xRow.twoFA}"`,
            `"${tgRow.phone}"`,
            `"${tgRow.password}"`,
            `"${dcRow.email}"`,
            `"${dcRow.password}"`,
            `"${dcRow.twoFA}"`
        ];
        
        csvContent += row.join(',') + '\n';
    }
    
    return csvContent;
}

// 主函数
function main() {
    console.log('开始处理三件套账号数据...');
    
    // 文件路径
    const dcFilePath = path.join(__dirname, '../三件套账号/DC账号.txt');
    const xFilePath = path.join(__dirname, '../三件套账号/x账号.txt');
    const tgFilePath = path.join(__dirname, '../三件套账号/TG账号.txt');
    
    // 读取文件
    console.log('读取文件中...');
    const dcLines = readFileContent(dcFilePath);
    const xLines = readFileContent(xFilePath);
    const tgLines = readFileContent(tgFilePath);
    
    console.log(`DC账号数据行数: ${dcLines.length}`);
    console.log(`X账号数据行数: ${xLines.length}`);
    console.log(`TG账号数据行数: ${tgLines.length}`);
    
    // 提取数据
    console.log('提取数据中...');
    const dcData = extractDCData(dcLines);
    const xData = extractXData(xLines);
    const tgData = extractTGData(tgLines);
    
    console.log(`提取到DC账号: ${dcData.length}条`);
    console.log(`提取到X账号: ${xData.length}条`);
    console.log(`提取到TG账号: ${tgData.length}条`);
    
    // 合并数据并生成CSV
    console.log('合并数据并生成CSV...');
    const csvContent = mergeDataAndCreateCSV(dcData, xData, tgData);
    
    // 确保输出目录存在
    const outputDir = path.join(__dirname, '../copy_data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('创建copy_data目录');
    }
    
    // 写入CSV文件
    const outputPath = path.join(outputDir, '三件套合并数据.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    
    console.log(`CSV文件已生成: ${outputPath}`);
    console.log('数据处理完成！');
    
    // 显示前几行预览
    const lines = csvContent.split('\n');
    console.log('\n预览前3行数据:');
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        console.log(lines[i]);
    }
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = {
    extractDCData,
    extractXData,
    extractTGData,
    mergeDataAndCreateCSV
};
