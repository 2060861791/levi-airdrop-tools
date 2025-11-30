import { test, expect } from '@playwright/test';
import { readWalletData } from '../utils/csvReader';
import * as path from 'path';

// 添加提币地址簿，用于提出代币到100个空投地址  

test('Add wallet addresses to OKX from CSV data', async ({ page }) => {
  // Read wallet data from CSV,目前已经清洗了10个助记词的csv文件
  const csvPath = path.join(__dirname, '../待录入数据/清洗后_助记词10.csv');
  const walletData = readWalletData(csvPath);

  // Define networks and their corresponding addresses
  const networks = [
    { name: 'Bitcoin', addressKey: 'Bitcoin' },
    { name: 'Sui', addressKey: 'SUI' },
    { name: 'Aptos', addressKey: 'Aptos' },
    { name: 'Near', addressKey: 'NEAR' },
    { name: 'Solana', addressKey: 'Solana' },
  ];

  // Navigate to OKX withdrawal address page
  await page.goto('https://www.okx.com/zh-hans/balance/withdrawal-add-address');

  // Wait for page to load and verify we're on the correct page
  await expect(
    page.getByText('我的资产提币地址簿添加地址添加 地址一次最多可将 50')
  ).toBeVisible();

  // Select "通用地址" for the first time
  await page
    .getByRole('combobox')
    .filter({ hasText: '普通地址' })
    .locator('div')
    .last()
    .click();
  await expect(page.locator('.balance_okui-select-option-box')).toBeVisible();
  await page
    .getByRole('option', { name: '通用地址 支持提取该网络支持的所有币种' })
    .last()
    .click();

  await page.waitForTimeout(1000); // Wait for page elements to stabilize

  // Process each wallet from the CSV data
  for (let walletIndex = 0; walletIndex < walletData.length; walletIndex++) {
    const wallet = walletData[walletIndex];
    console.log(`Processing wallet ${walletIndex + 1}: ${wallet.账户}`);

    // For each wallet, add all network addresses
    for (let networkIndex = 0; networkIndex < networks.length; networkIndex++) {
      const network = networks[networkIndex];
      const address = wallet[
        network.addressKey as keyof typeof wallet
      ] as string;

      console.log(
        `Adding ${network.name} address for ${wallet.账户}: ${address}`
      );

      if (walletIndex === 0 && networkIndex === 0) {
        // First wallet, first network - click "选择网络"
        await page.getByText('选择网络').last().click();
        await expect(page.locator('.pc-option-scroll')).toBeVisible();
      } else {
        // Subsequent wallets or networks - click the network selector for the new row
        const currentRowIndexURL = walletIndex * networks.length + networkIndex;
        const networkSelector = page.locator(
          `.balance_okui.balance_okui-form-item-md.balance_okui-form-item.balance_okui-form-item-no-label.e2e-network-selector-${currentRowIndexURL} > .balance_okui-form-item-control > .balance_okui-form-item-control-input > .balance_okui-form-item-control-input-content > .balance_okui.balance_okui-select > .balance_okui-select-value-box > .balance_okui > .balance_okui-input-box`
        );
        await networkSelector.click();
      }

      // Special handling for Aptos network
      if (network.name === 'Aptos') {
        console.log('进入到Aptos循环');

        const current_nth = walletIndex * 5 + networkIndex;
        console.log(current_nth, '当前的nth值');

        const Reselect_address = page.getByText('通用地址').last();
        await Reselect_address.last().click();
        await page.getByText('普通地址').last().click();
        await page.waitForTimeout(1000); // 等待一秒

        await page.getByText('选择币种').last().click();
        await page.getByRole('combobox', { name: '搜索' }).last().click();
        await page.getByRole('combobox', { name: '搜索' }).last().fill('apt');
        await expect(
          page.getByRole('option', { name: 'APT Aptos' })
        ).toBeVisible();
        await page.getByRole('option', { name: 'APT Aptos' }).last().click();
        await page.waitForTimeout(1000); // 等待一秒

        await page.getByText('选择网络').last().click();
        await expect(
          page.getByRole('option', { name: 'Aptos(FA)' }).last()
        ).toBeVisible();
        await page.getByRole('option', { name: 'Aptos(FA)' }).last().click();
        await page
          .getByRole('row', { name: `${current_nth + 1}. 移除` })
          .getByPlaceholder('区块链地址')
          .last()
          .click();
        await page
          .getByRole('row', { name: `${current_nth + 1}. 移除` })
          .getByPlaceholder('区块链地址')
          .last()
          .fill(address);
        await page
          .getByRole('row', { name: `${current_nth + 1}.` })
          .getByPlaceholder('如：“我的钱包”')
          .last()
          .click();
        await page
          .getByRole('row', { name: `${current_nth + 1}.` })
          .getByPlaceholder('如：“我的钱包”')
          .last()
          .fill(wallet.账户);
        await page.getByRole('button', { name: '添加' }).last().click();
        await page.getByText('普通地址').last().click();
        await page.getByRole('listbox').getByText('通用地址').last().click();
        // 跳出当前循环，进入下一个非aptos地址的添加
        continue;
      }

      await expect(
        page.getByRole('option', { name: network.name }).last()
      ).toBeVisible();
      // Select the network
      await page
        .getByRole('option', { name: network.name, exact: true })
        .last()
        .click();

      // Fill in the address
      if (walletIndex === 0 && networkIndex === 0) {
        // First wallet, first network
        await page.getByRole('textbox', { name: '区块链地址' }).last().click();
        await page
          .getByRole('textbox', { name: '区块链地址' })
          .last()
          .fill(address);
        await page
          .getByRole('textbox', { name: '如：“我的钱包”' })
          .last()
          .click();
        await page
          .getByRole('textbox', { name: '如：“我的钱包”' })
          .last()
          .fill(wallet.账户);
      } else {
        // Subsequent wallets or networks
        const currentRowIndex =
          walletIndex * networks.length + networkIndex + 1;
        const addressInput = page
          .getByRole('row', { name: `${currentRowIndex}. 移除` })
          .getByPlaceholder('区块链地址');
        await addressInput.last().click();
        await addressInput.last().fill(address);

        const nameInput = page
          .getByRole('row', { name: `${currentRowIndex}.` })
          .getByPlaceholder('如：“我的钱包”');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.click();
        await page.waitForTimeout(500); // 等待元素稳定
        await nameInput.fill(wallet.账户);
      }

      // Click "添加" button
      await page.getByRole('button', { name: '添加' }).last().click();

      // Wait a moment for the form to update
      await page.waitForTimeout(500);
    }
  }

  console.log(
    `Successfully added ${walletData.length * networks.length} wallet addresses to OKX`
  );
  await page.pause();
});
