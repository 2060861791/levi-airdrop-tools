const fs = require('fs');

/**
 * 从清洗后的CSV文件中提取Ethereum地址
 */
function extractEthereumAddresses() {
    const outputData = [];
    const processedFiles = [];

    console.log('🚀 开始提取Ethereum地址...');

    // 处理所有助记词文件 (1-10)
    for (let i = 1; i <= 10; i++) {
        const filename = `清洗后_助记词${i}.csv`;

        if (!fs.existsSync(filename)) {
            console.log(`⚠️  跳过: ${filename} (文件不存在)`);
            continue;
        }

        try {
            console.log(`📁 处理文件: ${filename}`);
            const content = fs.readFileSync(filename, 'utf8');
            const lines = content.split('\n');

            if (lines.length < 2) {
                console.log(`⚠️  跳过: ${filename} (文件格式错误)`);
                continue;
            }

            // 解析标题行找到Ethereum列
            const headers = lines[0].split(',');
            const ethereumIndex = headers.findIndex(header => header.trim() === 'Ethereum');

            if (ethereumIndex === -1) {
                console.log(`⚠️  跳过: ${filename} (未找到Ethereum列)`);
                continue;
            }

            // 处理数据行
            for (let j = 1; j < lines.length; j++) {
                const line = lines[j].trim();
                if (!line) continue;

                const values = line.split(',');
                if (values.length <= ethereumIndex) continue;

                const ethereumAddress = values[ethereumIndex].trim();
                const accountName = values[0].trim();

                // 验证地址格式 (0x开头的42位地址)
                if (ethereumAddress && ethereumAddress.startsWith('0x') && ethereumAddress.length === 42) {
                    outputData.push({
                        address: ethereumAddress,
                        name: accountName
                    });
                } else if (ethereumAddress) {
                    console.log(`⚠️  跳过无效地址: ${ethereumAddress} (来自 ${accountName})`);
                }
            }

            processedFiles.push(filename);

        } catch (error) {
            console.log(`❌ 处理失败: ${filename} - ${error.message}`);
        }
    }

    // 按空投编号排序
    outputData.sort((a, b) => {
        const aNum = parseInt(a.name.replace('空投', ''));
        const bNum = parseInt(b.name.replace('空投', ''));
        return aNum - bNum;
    });

    // 生成CSV内容
    const csvLines = ['Address,AddressName(optional)'];
    outputData.forEach(item => {
        csvLines.push(`${item.address},${item.name}`);
    });

    // 写入文件
    const outputFilename = 'EVM_addresses.csv';
    fs.writeFileSync(outputFilename, csvLines.join('\n'), 'utf8');

    console.log('\n📊 处理总结:');
    console.log(`✅ 成功处理: ${processedFiles.length} 个文件`);
    console.log(`📊 提取地址: ${outputData.length} 个`);
    console.log(`📁 输出文件: ${outputFilename}`);

    // 显示前10个地址作为示例
    if (outputData.length > 0) {
        console.log('\n📋 前10个地址示例:');
        outputData.slice(0, 10).forEach(item => {
            console.log(`  ${item.address} → ${item.name}`);
        });
    }

    return {
        totalAddresses: outputData.length,
        processedFiles: processedFiles.length,
        outputFile: outputFilename
    };
}

/**
 * 验证Ethereum地址格式
 */
function isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log('📖 使用说明:');
    console.log('  node EVM_address.js                    # 提取所有Ethereum地址');
    console.log('  node EVM_address.js --help            # 显示帮助信息');
    console.log('');
    console.log('📋 功能说明:');
    console.log('  - 自动扫描清洗后_助记词1.csv 到 清洗后_助记词10.csv');
    console.log('  - 提取所有有效的Ethereum地址 (0x开头的42位地址)');
    console.log('  - 按空投编号排序 (空投1, 空投2, 空投3...)');
    console.log('  - 生成格式: Address,AddressName(optional)');
    console.log('  - 输出文件: EVM_addresses.csv');
}

/**
 * 主函数
 */
function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    // 检查是否有清洗后的文件
    let hasFiles = false;
    for (let i = 1; i <= 10; i++) {
        if (fs.existsSync(`清洗后_助记词${i}.csv`)) {
            hasFiles = true;
            break;
        }
    }

    if (!hasFiles) {
        console.error('❌ 未找到任何清洗后的文件');
        console.log('请先运行数据清洗脚本生成清洗后的文件');
        return;
    }

    const result = extractEthereumAddresses();

    if (result.totalAddresses === 0) {
        console.log('\n⚠️  警告: 未提取到任何有效的Ethereum地址');
        console.log('请检查清洗后的文件是否包含有效的Ethereum地址');
    }
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = {
    extractEthereumAddresses,
    isValidEthereumAddress
};
