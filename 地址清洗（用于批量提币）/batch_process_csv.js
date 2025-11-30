const fs = require('fs');
const path = require('path');

/**
 * 从清洗后的CSV文件中提取所有非Ethereum的地址
 */

// 读取CSV文件并处理
function processCSV(inputFile, outputFile) {
    try {
        // 读取原始CSV文件
        const csvContent = fs.readFileSync(inputFile, 'utf8');

        // 按行分割
        const lines = csvContent.trim().split('\n');

        // 处理每一行，去除ETH地址列
        const processedLines = lines.map(line => {
            const columns = line.split(',');

            // ETH地址列是第3列（索引为2）
            // 移除ETH地址列
            if (columns.length > 2) {
                columns.splice(2, 1); // 移除第3列（索引2）
            }

            return columns.join(',');
        });

        // 确保输出目录存在
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 写入新文件
        fs.writeFileSync(outputFile, processedLines.join('\n'), 'utf8');

        console.log(`✅ 处理完成: ${path.basename(inputFile)}`);
        console.log(`📁 输出文件: ${path.basename(outputFile)}`);
        console.log(`📊 处理了 ${lines.length} 行数据`);

    } catch (error) {
        console.error(`❌ 处理文件 ${inputFile} 时出错:`, error.message);
    }
}

// 批量处理函数
function batchProcess(inputDir, outputDir) {
    try {
        // 检查输入目录是否存在
        if (!fs.existsSync(inputDir)) {
            console.error(`❌ 找不到输入目录: ${inputDir}`);
            return;
        }

        // 读取目录中的所有CSV文件
        const files = fs.readdirSync(inputDir)
            .filter(file => file.endsWith('.csv'))
            .sort(); // 按文件名排序

        if (files.length === 0) {
            console.log('❌ 在输入目录中没有找到CSV文件');
            return;
        }

        console.log(`🚀 开始批量处理 ${files.length} 个CSV文件...`);
        console.log(`📁 输入目录: ${inputDir}`);
        console.log(`📁 输出目录: ${outputDir}`);
        console.log('─'.repeat(50));

        let successCount = 0;

        // 处理每个文件
        files.forEach((file, index) => {
            const inputFile = path.join(inputDir, file);
            const outputFile = path.join(outputDir, file);

            console.log(`\n📄 处理文件 ${index + 1}/${files.length}: ${file}`);
            processCSV(inputFile, outputFile);
            successCount++;
        });

        console.log('\n' + '─'.repeat(50));
        console.log(`🎉 批量处理完成！`);
        console.log(`✅ 成功处理: ${successCount}/${files.length} 个文件`);
        console.log(`📁 输出目录: ${outputDir}`);

    } catch (error) {
        console.error('❌ 批量处理时出错:', error.message);
    }
}

// 主函数
function main() {
    const inputDir = './清洗后数据';
    const outputDir = './去除ETH地址数据';

    console.log('🔧 CSV批量处理工具');
    console.log('🗑️ 功能: 移除所有CSV文件中的ETH地址列');
    console.log('─'.repeat(50));

    batchProcess(inputDir, outputDir);
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = { processCSV, batchProcess }; 