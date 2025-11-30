import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.bilibili.com/');
  await page.getByText('立即登录').click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('listitem').filter({ hasText: '牧民白云硬币:934B币:0565关注143粉丝0' }).getByRole('link').nth(1).click();
  const page1 = await page1Promise;
  await page1.goto('https://space.bilibili.com/128505891?spm_id_from=333.1007.0.0');
});