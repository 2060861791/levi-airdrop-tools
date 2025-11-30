const fs = require('fs');
const path = require('path');

const CONFIG = {
    CHAINS_TO_KEEP: {
        'Bitcoin': 'Bitcoin',
        'Ethereum': 'Ethereum',
        'SUI': 'SUI',
        'Aptos': 'Aptos',
        'NEAR': 'NEAR',
        'Solana': 'Solana'
    },
    TOTAL_MNEMONICS: 10
};

function calculateAirdropNumber(accountNumber, mnemonicNumber) {
    return accountNumber * 10 - (10 - mnemonicNumber);
}

function cleanCsvData(inputFile, outputFile, mnemonicNumber) {
    try {
        const csvContent = fs.readFileSync(inputFile, 'utf8');
        const lines = csvContent.split('\n');

        if (lines.length < 2) {
            throw new Error('CSV文件格式错误');
        }

        const headers = lines[0].split(',');
        const chainIndexes = {};

        Object.keys(CONFIG.CHAINS_TO_KEEP).forEach(chainName => {
            const index = headers.findIndex(header => header.trim() === chainName);
            if (index !== -1) {
                chainIndexes[chainName] = index;
            }
        });

        const newHeaders = ['账户'].concat(Object.keys(CONFIG.CHAINS_TO_KEEP));
        const newLines = [newHeaders.join(',')];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',');
            if (values.length < 2) continue;

            const accountName = values[0];
            const accountMatch = accountName.match(/账户\s*(\d+)/);
            if (!accountMatch) continue;

            const accountNumber = parseInt(accountMatch[1]);
            const airdropNumber = calculateAirdropNumber(accountNumber, mnemonicNumber);
            const newAccountName = `空投${airdropNumber}`;

            const newValues = [newAccountName];

            Object.keys(CONFIG.CHAINS_TO_KEEP).forEach(chainName => {
                const index = chainIndexes[chainName];
                if (index !== undefined && index < values.length) {
                    newValues.push(values[index]);
                } else {
                    newValues.push('');
                }
            });

            newLines.push(newValues.join(','));
        }

        fs.writeFileSync(outputFile, newLines.join('\n'), 'utf8');

        return {
            success: true,
            processedAccounts: newLines.length - 1,
            mnemonicNumber,
            airdropRange: `${calculateAirdropNumber(1, mnemonicNumber)}-${calculateAirdropNumber(10, mnemonicNumber)}`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function batchProcess() {
    console.log('🚀 开始批量数据清洗...');

    const results = [];
    let totalProcessed = 0;

    // 定义输入和输出目录
    const inputDir = '原始数据';
    const outputDir = '清洗后数据';

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 创建输出目录: ${outputDir}`);
    }

    for (let i = 1; i <= CONFIG.TOTAL_MNEMONICS; i++) {
        const inputFile = path.join(inputDir, `助记词${i}.csv`);
        const outputFile = path.join(outputDir, `清洗后_助记词${i}.csv`);

        if (fs.existsSync(inputFile)) {
            console.log(`📁 处理文件: ${inputFile}`);
            const result = cleanCsvData(inputFile, outputFile, i);

            if (result.success) {
                console.log(`✅ 完成: ${outputFile} (${result.processedAccounts}个账户, 空投${result.airdropRange})`);
                totalProcessed += result.processedAccounts;
                results.push(result);
            } else {
                console.log(`❌ 失败: ${inputFile} - ${result.error}`);
            }
        } else {
            console.log(`⚠️  跳过: ${inputFile} (文件不存在)`);
        }
    }

    console.log('\n📊 处理总结:');
    console.log(`✅ 成功处理: ${results.length} 个文件`);
    console.log(`📊 总账户数: ${totalProcessed}`);

    if (results.length > 0) {
        console.log('\n📋 空投编号范围:');
        results.forEach(result => {
            console.log(`   助记词${result.mnemonicNumber}: 空投${result.airdropRange}`);
        });
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log('📖 使用说明:');
        console.log('  node batch-cleaner.js                    # 批量处理所有助记词文件');
        console.log('  node batch-cleaner.js --single 1        # 处理单个助记词文件');
        return;
    }

    if (args.includes('--single')) {
        const mnemonicIndex = args.indexOf('--single') + 1;
        const mnemonicNumber = parseInt(args[mnemonicIndex]);

        if (!mnemonicNumber || mnemonicNumber < 1 || mnemonicNumber > CONFIG.TOTAL_MNEMONICS) {
            console.error(`❌ 无效的助记词编号: ${args[mnemonicIndex]}`);
            return;
        }

        // 定义输入和输出目录
        const inputDir = '原始数据';
        const outputDir = '清洗后数据';

        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 创建输出目录: ${outputDir}`);
        }

        const inputFile = path.join(inputDir, `助记词${mnemonicNumber}.csv`);
        const outputFile = path.join(outputDir, `清洗后_助记词${mnemonicNumber}.csv`);

        if (!fs.existsSync(inputFile)) {
            console.error(`❌ 文件不存在: ${inputFile}`);
            return;
        }

        console.log(`🚀 处理单个文件: ${inputFile}`);
        const result = cleanCsvData(inputFile, outputFile, mnemonicNumber);

        if (result.success) {
            console.log(`✅ 完成: ${outputFile}`);
            console.log(`📊 处理了 ${result.processedAccounts} 个账户`);
            console.log(`📋 空投编号范围: ${result.airdropRange}`);
        } else {
            console.log(`❌ 失败: ${result.error}`);
        }
        return;
    }

    batchProcess();
}

if (require.main === module) {
    main();
}

module.exports = {
    cleanCsvData,
    calculateAirdropNumber,
    batchProcess,
    CONFIG
}; 