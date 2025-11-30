import fs from 'fs';
import https from 'https';
import chalk from 'chalk';
import inquirer from 'inquirer';

// 读取TG账号文件并提取手机号
function extractPhoneNumbers(batchSize = 10, startIndex = 0) {
    try {
        const content = fs.readFileSync('../三件套账号/TG账号.txt', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        const phoneNumbers = [];

        // 计算批次范围
        const endIndex = Math.min(startIndex + batchSize, lines.length);
        const batchLines = lines.slice(startIndex, endIndex);

        batchLines.forEach((line, index) => {
            const parts = line.split('----');
            if (parts.length >= 2) {
                // 手机号在第1个位置
                const phone = parts[0].trim();
                if (phone && phone.startsWith('+')) {
                    phoneNumbers.push({
                        index: startIndex + index + 1,
                        phone: phone
                    });
                }
            }
        });

        return phoneNumbers;
    } catch (error) {
        console.error(chalk.red('❌ 读取TG账号文件失败:'), error.message);
        return [];
    }
}

// 读取TG账号文件并提取链接
function extractUrls(batchSize = 10, startIndex = 0) {
    try {
        const content = fs.readFileSync('../三件套账号/TG账号.txt', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        const urls = [];

        // 计算批次范围
        const endIndex = Math.min(startIndex + batchSize, lines.length);
        const batchLines = lines.slice(startIndex, endIndex);

        batchLines.forEach((line, index) => {
            const parts = line.split('----');
            if (parts.length >= 2) {
                const phone = parts[0].trim();
                const url = parts[1].trim();
                if (phone && url) {
                    urls.push({
                        index: startIndex + index + 1,
                        phone: phone,
                        url: url
                    });
                }
            }
        });

        return urls;
    } catch (error) {
        console.error(chalk.red('❌ 读取TG账号文件失败:'), error.message);
        return [];
    }
}

// 获取总账号数量
function getTotalAccountCount() {
    try {
        const content = fs.readFileSync('../三件套账号/TG账号.txt', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        return lines.length;
    } catch (error) {
        return 0;
    }
}

// 计算总批次数
function getTotalBatches(batchSize = 10) {
    const totalCount = getTotalAccountCount();
    return Math.ceil(totalCount / batchSize);
}

// 访问URL并提取设备验证码
function fetchDeviceCode(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    // 使用正则表达式提取设备验证码
                    const codeMatch = data.match(/value="(\d+)" readonly/);
                    if (codeMatch && codeMatch[1]) {
                        resolve(codeMatch[1]);
                    } else {
                        reject(new Error('未找到设备验证码'));
                    }
                } catch (error) {
                    reject(new Error('解析HTML失败: ' + error.message));
                }
            });
        }).on('error', (error) => {
            reject(new Error('请求失败: ' + error.message));
        });
    });
}

// 提取手机号功能
function extractPhones(batchSize = 10, startIndex = 0) {
    const batchNumber = Math.floor(startIndex / batchSize) + 1;
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`📱 提取手机号 - 第${batchNumber}批 (共${totalBatches}批)`));
    console.log(chalk.gray('='.repeat(60)));

    const phoneNumbers = extractPhoneNumbers(batchSize, startIndex);

    if (phoneNumbers.length === 0) {
        console.error(chalk.red('❌ 没有找到有效的手机号'));
        return;
    }

    console.log(chalk.green(`✅ 找到 ${phoneNumbers.length} 个手机号:\n`));

    // 显示详细信息
    phoneNumbers.forEach(item => {
        console.log(chalk.cyan(`[${item.index}] ${item.phone}`));
    });

    // 单独打印手机号列表，方便复制
    console.log(chalk.yellow('\n' + '='.repeat(50)));
    console.log(chalk.white('手机号列表 (方便复制):'));
    console.log(chalk.yellow('='.repeat(50)));

    phoneNumbers.forEach(item => {
        console.log(chalk.green(`${item.phone}`));
    });

    console.log(chalk.yellow('='.repeat(50)));
    console.log(chalk.green(`✅ 共提取到 ${phoneNumbers.length} 个手机号`));
}

// 获取设备验证码功能
async function getDeviceCodes(batchSize = 10, startIndex = 0) {
    const batchNumber = Math.floor(startIndex / batchSize) + 1;
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`🔐 获取设备验证码 - 第${batchNumber}批 (共${totalBatches}批)`));
    console.log(chalk.gray('='.repeat(60)));

    const urls = extractUrls(batchSize, startIndex);

    if (urls.length === 0) {
        console.error(chalk.red('❌ 没有找到有效的URL'));
        return;
    }

    console.log(chalk.green(`✅ 找到 ${urls.length} 个链接:\n`));

    const results = [];

    // 为每个URL获取设备验证码
    for (let i = 0; i < urls.length; i++) {
        const item = urls[i];
        console.log(chalk.cyan(`[${item.index}] 手机号: ${item.phone}`));
        console.log(chalk.gray(`    链接: ${item.url}`));

        try {
            const deviceCode = await fetchDeviceCode(item.url);
            console.log(chalk.green(`    设备验证码: ${deviceCode}`));

            results.push({
                index: item.index,
                phone: item.phone,
                deviceCode: deviceCode
            });
        } catch (error) {
            console.log(chalk.red(`    ❌ 错误: ${error.message}`));
        }

        console.log(''); // 空行分隔
    }

    // 单独打印设备验证码列表，方便复制
    if (results.length > 0) {
        console.log(chalk.yellow('='.repeat(50)));
        console.log(chalk.white('设备验证码列表 (方便复制):'));
        console.log(chalk.yellow('='.repeat(50)));

        results.forEach(result => {
            console.log(chalk.green(`${result.deviceCode}`));
        });

        console.log(chalk.yellow('='.repeat(50)));
        console.log(chalk.green(`✅ 共获取到 ${results.length} 个设备验证码`));
    }
}

// 显示批次选择菜单
function showBatchSelectionMenu(totalBatches, batchSize) {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.white('📋 请选择要处理的批次:'));
    console.log(chalk.blue('='.repeat(60)));

    const options = [];

    for (let i = 1; i <= totalBatches; i++) {
        const startIndex = (i - 1) * batchSize + 1;
        const endIndex = Math.min(i * batchSize, getTotalAccountCount());
        options.push(`${startIndex}-${endIndex}`);
    }

    options.forEach((option, index) => {
        console.log(chalk.cyan(`${index + 1}. 第${index + 1}批 (${option})`));
    });

    console.log(chalk.cyan(`${totalBatches + 1}. 处理所有批次`));
    console.log(chalk.cyan(`${totalBatches + 2}. 退出`));
    console.log(chalk.blue('='.repeat(60)));

    return options;
}

// 获取用户选择的批次
async function getUserBatchChoice(totalBatches, batchSize) {
    const options = [];

    for (let i = 1; i <= totalBatches; i++) {
        const startIndex = (i - 1) * batchSize + 1;
        const endIndex = Math.min(i * batchSize, getTotalAccountCount());
        options.push({
            name: `第${i}批 (${startIndex}-${endIndex})`,
            value: i
        });
    }

    options.push({
        name: '处理所有批次',
        value: 'all'
    });

    options.push({
        name: '退出',
        value: 'exit'
    });

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'batchChoice',
            message: '请选择要处理的批次:',
            choices: options
        }
    ]);

    return answer.batchChoice;
}

// 获取用户主菜单选择
async function getUserMainChoice() {
    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'mainChoice',
            message: '请选择操作:',
            choices: [
                { name: '选择批次处理', value: '1' },
                { name: '处理所有批次', value: '2' },
                { name: '退出', value: '3' }
            ]
        }
    ]);

    return answer.mainChoice;
}

// 询问是否继续
async function askContinue() {
    const answer = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'continue',
            message: '是否继续处理其他批次?',
            default: true
        }
    ]);

    return answer.continue;
}

// 处理单个批次
async function processSingleBatch(batchNumber, batchSize) {
    const startIndex = (batchNumber - 1) * batchSize;
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`\n🔄 开始处理第${batchNumber}批 (共${totalBatches}批)`));
    console.log(chalk.gray(`处理范围: 第${startIndex + 1}-${Math.min(startIndex + batchSize, getTotalAccountCount())}个账号`));

    // 执行提取手机号
    extractPhones(batchSize, startIndex);

    console.log('\n');

    // 执行获取设备验证码
    await getDeviceCodes(batchSize, startIndex);

    console.log(chalk.green(`\n✅ 第${batchNumber}批处理完成！`));
}

// 处理所有批次
async function processAllBatches(batchSize) {
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`\n🔄 开始处理所有${totalBatches}批`));

    for (let batchNumber = 1; batchNumber <= totalBatches; batchNumber++) {
        await processSingleBatch(batchNumber, batchSize);

        if (batchNumber < totalBatches) {
            console.log(chalk.cyan(`\n📋 还有 ${totalBatches - batchNumber} 批待处理`));
            console.log(chalk.yellow('\n' + '='.repeat(60)));
        }
    }

    console.log(chalk.green('\n🎉 所有批次处理完成！'));
}

// 主菜单
function showMenu() {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.white('📋 Telegram账号提取脚本'));
    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.cyan('1. 选择批次处理'));
    console.log(chalk.cyan('2. 处理所有批次'));
    console.log(chalk.cyan('3. 退出'));
    console.log(chalk.blue('='.repeat(60)));
}

// 主函数
async function main() {
    console.log(chalk.blue('🚀 欢迎使用Telegram账号提取脚本！\n'));

    // 检查文件是否存在
    try {
        fs.accessSync('../三件套账号/TG账号.txt', fs.constants.F_OK);
    } catch (error) {
        console.error(chalk.red('❌ 错误: 找不到 TG账号.txt 文件'));
        return;
    }

    const batchSize = 10;
    const totalBatches = getTotalBatches(batchSize);
    const totalCount = getTotalAccountCount();

    console.log(chalk.green(`📊 总账号数: ${totalCount}, 总批次数: ${totalBatches}`));

    while (true) {
        showMenu();

        const choice = await getUserMainChoice();

        if (choice === '1') {
            // 选择批次处理
            const batchChoice = await getUserBatchChoice(totalBatches, batchSize);

            if (batchChoice === 'exit') {
                console.log(chalk.blue('👋 再见！'));
                break;
            } else if (batchChoice === 'all') {
                await processAllBatches(batchSize);
            } else {
                await processSingleBatch(batchChoice, batchSize);
            }

            // 询问是否继续
            const shouldContinue = await askContinue();
            if (!shouldContinue) {
                console.log(chalk.blue('👋 再见！'));
                break;
            }

        } else if (choice === '2') {
            // 处理所有批次
            await processAllBatches(batchSize);
            console.log(chalk.blue('👋 再见！'));
            break;

        } else if (choice === '3') {
            console.log(chalk.blue('👋 再见！'));
            break;
        }
    }
}

// 运行主函数
main().catch(error => {
    console.error(chalk.red('❌ 程序执行失败:'), error.message);
}); 