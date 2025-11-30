import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 加载配置文件
function loadConfig() {
  const configPath = path.join(__dirname, 'OKX_Recharge.config');
  const configContent = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(configContent);
}

// 使用同一个浏览器实例，所有任务共用同一页面，串行处理每个币种
test('OKX 充值地址批量添加与重命名', async ({ browser }) => {
  // 加载配置
  const config = loadConfig();

  // 所有任务共用同一浏览器实例
  const page = await browser.newPage();

  // 手动切换子账户
  await page.goto(config.urls.userAccount, {
    waitUntil: 'networkidle',
    timeout: config.timeouts.pageLoad,
  });

  // 调试暂停
  if (config.debug.enablePause) {
    await page.pause();
  }

  for (const coin of config.urls.coins) {
    console.log(`开始处理 ${coin.name} 币种...`);
    try {
      await page.goto(coin.url, {
        waitUntil: 'networkidle',
        timeout: config.timeouts.pageLoad,
      });
      await page.waitForTimeout(config.timeouts.elementWait);

      // 如果需要切换到隔离验证地址标签页
      if (coin.needsSegwitTab) {
        console.log(`[${coin.name}] 切换到隔离验证地址标签页...`);
        await page.getByRole('tab', { name: '隔离验证地址' }).click();
        await page.waitForTimeout(config.timeouts.dialogWait);
      }

      let clickCount = 0;

      // 循环添加地址直到按钮不可点击
      while (true) {
        try {
          // 检查按钮是否可点击
          const addButton = page.getByRole('button', { name: '新增地址' });
          await page.waitForTimeout(1000);

          const isEnabled = await addButton.isEnabled();
          const isVisible = await addButton.isVisible();

          if (!isEnabled || !isVisible) {
            console.log(
              `[${coin.name}] 按钮已不可点击，总共添加了 ${clickCount} 个地址`
            );
            break;
          }

          // 点击新增地址按钮
          await addButton.click();
          clickCount++;
          console.log(`[${coin.name}] 已添加第 ${clickCount} 个地址`);

          // 检查是否出现"不再展示"对话框
          const dialogVisible = await page
            .getByRole('checkbox', { name: '不再展示' })
            .isVisible();

          if (dialogVisible) {
            console.log(`[${coin.name}] 检测到"不再展示"对话框，进行处理...`);
            await page.getByRole('checkbox', { name: '不再展示' }).check();
            await page.getByTestId('okd-dialog-confirm-btn').click();
          }
        } catch (error: any) {
          console.log(
            `[${coin.name}] 点击按钮时出错，可能已达到最大地址数量: ${error.message}`
          );
          break;
        }
      }

      console.log(`[${coin.name}] 地址添加完成！`);

      // 开始修改地址名称
      console.log(`[${coin.name}] 开始修改地址名称...`);

      // 获取所有编辑地址名称的按钮
      await page.waitForTimeout(1500);

      const editButtons = page.getByLabel('编辑地址名称');
      const editButtonCount = await editButtons.count();

      console.log(`[${coin.name}] 找到 ${editButtonCount} 个编辑按钮`);

      // 按顺序修改每个地址的名称
      for (let i = 0; i < editButtonCount; i++) {
        try {
          // 获取第i个编辑按钮
          const currentEditButton = editButtons.nth(i);

          // 点击编辑按钮
          await currentEditButton.click();
          console.log(`[${coin.name}] 正在修改第 ${i + 1} 个地址名称...`);
          await page.waitForTimeout(config.timeouts.buttonClick);

          // 等待文本框出现并清空原有内容
          const textbox = page.getByRole('textbox').last();
          await textbox.waitFor({ state: 'visible' });
          await textbox.clear();
          await page.waitForTimeout(config.timeouts.buttonClick);

          // 输入新的地址名称，使用配置的命名规则
          const newName = `${config.addressNaming.prefix}${config.addressNaming.startNumber + i}`;
          await textbox.fill(newName);
          await page.waitForTimeout(config.timeouts.buttonClick);

          // 点击确认按钮
          await page.getByRole('button', { name: '确认新地址名称' }).click();
          await page.waitForTimeout(config.timeouts.buttonClick);

          console.log(
            `[${coin.name}] 第 ${i + 1} 个地址名称已修改为: ${newName}`
          );

          // 等待一下确保修改完成
        } catch (error: any) {
          console.log(
            `[${coin.name}] 修改第 ${i + 1} 个地址名称时出错: ${error.message}`
          );
          // 继续处理下一个地址
          continue;
        }
      }

      console.log(`[${coin.name}] 所有地址名称修改完成！`);

      // 导出地址列表
      console.log(`[${coin.name}] 开始导出地址列表...`);
      await exportAddresses(page, coin.name, config);
    } catch (error: any) {
      console.log(`[${coin.name}] 处理过程中出现错误: ${error.message}`);
    }
  }

  await page.close();
  console.log('所有币种处理完成！');
});

// 导出地址列表的函数
async function exportAddresses(page: any, coinName: string, config: any) {
  try {
    // 等待页面加载完成
    await page.waitForTimeout(config.timeouts.elementWait * 2);

    // 获取所有地址元素
    const addressElements = page.locator(
      '.DepositAddressTable_breakAll__m9vpZ'
    );
    const addressCount = await addressElements.count();

    console.log(`[${coinName}] 找到 ${addressCount} 个地址元素`);

    if (addressCount === 0) {
      console.log(`[${coinName}] 未找到地址元素`);
      return;
    }

    // 提取所有地址
    const addresses: string[] = [];
    for (let i = 0; i < addressCount; i++) {
      try {
        const addressText = await addressElements.nth(i).textContent();
        if (addressText && addressText.trim()) {
          addresses.push(addressText.trim());
        }
      } catch (error) {
        console.log(`[${coinName}] 提取第 ${i + 1} 个地址时出错: ${error}`);
      }
    }

    console.log(`[${coinName}] 成功提取 ${addresses.length} 个地址`);

    // 创建输出目录
    const outputDir = config.output.directory;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 分割地址列表（前10个和后10个）
    const addresses1to10 = addresses.slice(0, config.addressNaming.batchSize);
    const addresses11to20 = addresses.slice(
      config.addressNaming.batchSize,
      config.addressNaming.batchSize * 2
    );

    // 保存前10个地址
    if (addresses1to10.length > 0) {
      const fileName1 = `${coinName}（${config.fileNaming.firstBatch.suffix}）${config.output.fileExtension}`;
      const filePath1 = path.join(outputDir, fileName1);
      const content1 = addresses1to10.join('\n');
      fs.writeFileSync(filePath1, content1, 'utf8');
      console.log(`[${coinName}] 已保存前10个地址到: ${filePath1}`);
    }

    // 保存后10个地址
    if (addresses11to20.length > 0) {
      const fileName2 = `${coinName}（${config.fileNaming.secondBatch.suffix}）${config.output.fileExtension}`;
      const filePath2 = path.join(outputDir, fileName2);
      const content2 = addresses11to20.join('\n');
      fs.writeFileSync(filePath2, content2, 'utf8');
      console.log(`[${coinName}] 已保存后10个地址到: ${filePath2}`);
    }

    // 同时保存JSON格式（可选）
    if (config.output.saveJson) {
      const jsonFileName = `${coinName}_addresses.json`;
      const jsonFilePath = path.join(outputDir, jsonFileName);
      const jsonContent = {
        addresses1to10: addresses1to10,
        addresses11to20: addresses11to20,
        totalCount: addresses.length,
        exportTime: new Date().toISOString(),
      };
      fs.writeFileSync(
        jsonFilePath,
        JSON.stringify(jsonContent, null, 2),
        'utf8'
      );
      console.log(`[${coinName}] 已保存JSON格式到: ${jsonFilePath}`);
    }
  } catch (error: any) {
    console.log(`[${coinName}] 导出地址时出错: ${error.message}`);
  }
}
