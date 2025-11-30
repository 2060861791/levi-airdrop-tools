import fs from 'fs';
import https from 'https';
import chalk from 'chalk';
import inquirer from 'inquirer';

// 读取密钥文件
function readKeysFile(batchSize = 10, startIndex = 0) {
    try {
        const content = fs.readFileSync('../三件套账号/DC账号.txt', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        const accounts = [];

        // 计算批次范围
        const endIndex = Math.min(startIndex + batchSize, lines.length);
        const batchLines = lines.slice(startIndex, endIndex);

        batchLines.forEach((line, index) => {
            const parts = line.split('----');
            if (parts.length >= 5) {
                // 解析所有字段
                const email = parts[0].trim();
                const password = parts[1].trim();
                const backupPassword = parts[2].trim();
                const keyPart = parts[3].trim();
                const token = parts[4].trim();

                // 移除空格，转换为大写
                const secretKey = keyPart.replace(/\s+/g, '').toUpperCase();

                accounts.push({
                    index: startIndex + index + 1,
                    email: email,
                    password: password,
                    backupPassword: backupPassword,
                    secretKey: secretKey,
                    token: token
                });
            }
        });

        return accounts;
    } catch (error) {
        console.error(chalk.red('❌ 读取密钥文件失败:'), error.message);
        return [];
    }
}

// 获取总账号数量
function getTotalAccountCount() {
    try {
        const content = fs.readFileSync('../三件套账号/DC账号.txt', 'utf8');
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

// 请求验证码API
function requestOTP(secretKey) {
    return new Promise((resolve, reject) => {
        const url = `https://2fa.fb.rip/api/otp/${secretKey}`;

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(new Error('解析响应数据失败: ' + error.message));
                }
            });
        }).on('error', (error) => {
            reject(new Error('请求失败: ' + error.message));
        });
    });
}

// 打印字段列表
function printFieldList(accounts, fieldName, fieldKey, color = chalk.cyan) {
    console.log(chalk.yellow('\n' + '='.repeat(60)));
    console.log(chalk.white(`${fieldName}列表 (方便复制):`));
    console.log(chalk.yellow('='.repeat(60)));

    accounts.forEach(item => {
        console.log(color(`${item[fieldKey]}`));
    });

    console.log(chalk.yellow('='.repeat(60)));
    console.log(chalk.green(`✅ 共提取到 ${accounts.length} 个${fieldName}`));
}

// 处理单个批次
async function processSingleBatch(batchNumber, batchSize) {
    const startIndex = (batchNumber - 1) * batchSize;
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`\n🔄 开始处理第${batchNumber}批 (共${totalBatches}批)`));
    console.log(chalk.gray(`处理范围: 第${startIndex + 1}-${Math.min(startIndex + batchSize, getTotalAccountCount())}个账号`));

    // 读取账号信息
    const accounts = readKeysFile(batchSize, startIndex);

    if (accounts.length === 0) {
        console.error(chalk.red('❌ 没有找到有效的账号信息'));
        return;
    }

    console.log(chalk.green(`✅ 第${batchNumber}批找到 ${accounts.length} 个账号:\n`));

    const otpResults = []; // 存储所有OTP结果

    // 为每个账号处理
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        console.log(chalk.cyan(`[${account.index}] 邮箱: ${account.email}`));
        console.log(chalk.gray(`    账户密码: ${account.password}`));
        console.log(chalk.gray(`    邮箱密码: ${account.backupPassword}`));
        console.log(chalk.yellow(`    密钥: ${account.secretKey}`));
        console.log(chalk.magenta(`    Token: ${account.token}`));

        try {
            const response = await requestOTP(account.secretKey);

            if (response.ok && response.data && response.data.otp) {
                console.log(chalk.green(`    OTP: ${response.data.otp}`));
                console.log(chalk.blue(`    剩余时间: ${response.data.timeRemaining} 秒`));

                // 保存OTP结果
                otpResults.push({
                    index: account.index,
                    email: account.email,
                    otp: response.data.otp,
                    timeRemaining: response.data.timeRemaining
                });
            } else {
                console.log(chalk.red(`    ❌ 错误: 响应格式不正确`));
            }
        } catch (error) {
            console.log(chalk.red(`    ❌ 错误: ${error.message}`));
        }

        console.log(''); // 空行分隔
    }

    // 分别打印各个字段的列表
    printFieldList(accounts, '邮箱', 'email', chalk.cyan);
    printFieldList(accounts, '账户密码', 'password', chalk.gray);
    printFieldList(accounts, '备用密码', 'backupPassword', chalk.gray);
    printFieldList(accounts, '密钥', 'secretKey', chalk.yellow);
    printFieldList(accounts, 'Token', 'token', chalk.magenta);

    // 单独打印OTP列表，方便复制
    if (otpResults.length > 0) {
        console.log(chalk.yellow('\n' + '='.repeat(60)));
        console.log(chalk.white('OTP列表 (方便复制):'));
        console.log(chalk.yellow('='.repeat(60)));

        otpResults.forEach(result => {
            console.log(chalk.green(`${result.otp}`));
        });

        console.log(chalk.yellow('='.repeat(60)));
        console.log(chalk.green(`✅ 共获取到 ${otpResults.length} 个OTP`));
    }

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
    console.log(chalk.white('📋 Discord账号提取脚本'));
    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.cyan('1. 选择批次处理'));
    console.log(chalk.cyan('2. 处理所有批次'));
    console.log(chalk.cyan('3. 退出'));
    console.log(chalk.blue('='.repeat(60)));
}

// 主函数
async function main() {
    console.log(chalk.blue('🔐 Discord账号提取脚本'));
    console.log(chalk.gray('='.repeat(60)));

    const batchSize = 10;
    const totalBatches = getTotalBatches(batchSize);
    const totalCount = getTotalAccountCount();

    console.log(chalk.green(`📊 总账号数: ${totalCount}, 总批次数: ${totalBatches}`));
    console.log(chalk.white('开始获取验证码和提取账号信息...\n'));

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