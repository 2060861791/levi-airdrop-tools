import fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';

// 解析单行数据
function parseLine(line) {
    const parts = line.split('----');
    if (parts.length >= 6) {
        // 解析邮箱密码和辅邮信息（第4个部分包含邮箱密码|辅邮|辅邮密码）
        const emailInfo = parts[3].split('|');

        return {
            username: parts[0].trim(),
            xPassword: parts[1].trim(),
            email: parts[2].trim(),
            emailPassword: emailInfo[0] || '',
            backupEmail: emailInfo[1] || '',
            backupEmailPassword: emailInfo[2] || '',
            twofaKey: parts[4].trim(),
            token: parts[5].trim()
        };
    }
    return null;
}

// 读取x账号文件并提取所有字段
function extractAllFields(batchSize = 10, startIndex = 0) {
    try {
        const content = fs.readFileSync('../三件套账号/x账号.txt', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        const accounts = [];

        // 计算批次范围
        const endIndex = Math.min(startIndex + batchSize, lines.length);
        const batchLines = lines.slice(startIndex, endIndex);

        batchLines.forEach((line, index) => {
            const account = parseLine(line);
            if (account) {
                accounts.push({
                    index: startIndex + index + 1,
                    ...account
                });
            }
        });

        return accounts;
    } catch (error) {
        console.error(chalk.red('❌ 读取x账号文件失败:'), error.message);
        return [];
    }
}

// 获取总账号数量
function getTotalAccountCount() {
    try {
        const content = fs.readFileSync('../三件套账号/x账号.txt', 'utf8');
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

// 显示批次信息
function showBatchInfo(currentBatch = 1, batchSize = 10) {
    const totalCount = getTotalAccountCount();
    const totalBatches = getTotalBatches(batchSize);
    const startIndex = (currentBatch - 1) * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalCount);

    console.log(chalk.yellow(`📊 批次信息: 第${currentBatch}批 (共${totalBatches}批)`));
    console.log(chalk.gray(`   处理范围: 第${startIndex + 1}-${endIndex}个账号 (共${totalCount}个)`));
    console.log(chalk.gray(`   批次大小: ${batchSize}个账号`));
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
function processSingleBatch(batchNumber, batchSize) {
    const startIndex = (batchNumber - 1) * batchSize;
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`\n🔄 开始处理第${batchNumber}批 (共${totalBatches}批)`));
    console.log(chalk.gray(`处理范围: 第${startIndex + 1}-${Math.min(startIndex + batchSize, getTotalAccountCount())}个账号`));

    const accounts = extractAllFields(batchSize, startIndex);

    if (accounts.length === 0) {
        console.error(chalk.red('❌ 没有找到有效的账号信息'));
        return;
    }

    console.log(chalk.green(`✅ 第${batchNumber}批找到 ${accounts.length} 个账号:\n`));

    // 显示详细信息
    accounts.forEach(item => {
        console.log(chalk.cyan(`[${item.index}] 用户名: ${item.username}`));
        console.log(chalk.gray(`    X密码: ${item.xPassword}`));
        console.log(chalk.blue(`    邮箱: ${item.email}`));
        console.log(chalk.gray(`    邮箱密码: ${item.emailPassword}`));
        console.log(chalk.blue(`    辅邮: ${item.backupEmail}`));
        console.log(chalk.gray(`    辅邮密码: ${item.backupEmailPassword}`));
        console.log(chalk.yellow(`    2FA密钥: ${item.twofaKey}`));
        console.log(chalk.magenta(`    Token: ${item.token}`));
        console.log('');
    });

    // 分别打印各个字段的列表
    printFieldList(accounts, '用户名', 'username', chalk.cyan);
    printFieldList(accounts, 'X账号密码', 'xPassword', chalk.gray);
    printFieldList(accounts, '邮箱', 'email', chalk.blue);
    printFieldList(accounts, '邮箱密码', 'emailPassword', chalk.gray);
    printFieldList(accounts, '辅邮', 'backupEmail', chalk.blue);
    printFieldList(accounts, '辅邮密码', 'backupEmailPassword', chalk.gray);
    printFieldList(accounts, '2FA密钥', 'twofaKey', chalk.yellow);
    printFieldList(accounts, 'Token', 'token', chalk.magenta);

    console.log(chalk.green(`\n✅ 第${batchNumber}批处理完成！`));
}

// 处理所有批次
function processAllBatches(batchSize) {
    const totalBatches = getTotalBatches(batchSize);

    console.log(chalk.blue(`\n🔄 开始处理所有${totalBatches}批`));

    for (let batchNumber = 1; batchNumber <= totalBatches; batchNumber++) {
        processSingleBatch(batchNumber, batchSize);

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
    console.log(chalk.white('📋 X账号提取脚本'));
    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.cyan('1. 选择批次处理'));
    console.log(chalk.cyan('2. 处理所有批次'));
    console.log(chalk.cyan('3. 退出'));
    console.log(chalk.blue('='.repeat(60)));
}

// 主函数
async function main() {
    console.log(chalk.blue('🐦 X账号提取脚本'));
    console.log(chalk.gray('='.repeat(60)));

    const batchSize = 10;
    const totalBatches = getTotalBatches(batchSize);
    const totalCount = getTotalAccountCount();

    console.log(chalk.green(`📊 总账号数: ${totalCount}, 总批次数: ${totalBatches}`));
    console.log(chalk.white('开始提取所有字段...\n'));

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
                processAllBatches(batchSize);
            } else {
                processSingleBatch(batchChoice, batchSize);
            }

            // 询问是否继续
            const shouldContinue = await askContinue();
            if (!shouldContinue) {
                console.log(chalk.blue('👋 再见！'));
                break;
            }

        } else if (choice === '2') {
            // 处理所有批次
            processAllBatches(batchSize);
            console.log(chalk.blue('👋 再见！'));
            break;

        } else if (choice === '3') {
            console.log(chalk.blue('👋 再见！'));
            break;
        }
    }
}

// 运行主函数
try {
    main();
} catch (error) {
    console.error(chalk.red('❌ 程序执行失败:'), error.message);
}
