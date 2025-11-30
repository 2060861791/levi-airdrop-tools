import { defineConfig, devices } from '@playwright/test'; // 引入 Playwright 的配置方法和设备预设

export default defineConfig({
  testDir: './tests', // 指定测试用例所在的目录
  timeout: 30 * 60 * 1000, // 每个测试的超时时间为30分钟（单位：毫秒）
  retries: 1, // 测试失败时自动重试1次，提高稳定性
  workers: 4, // 并发工作线程数为4，保证测试顺序性和环境隔离

  // use 字段为所有测试用例提供全局默认设置
  use: {
    headless: false, // 以无头模式运行浏览器（不显示UI，适合CI环境）
    viewport: { width: 1920, height: 1080 }, // 设置浏览器窗口大小为1080p
    ignoreHTTPSErrors: true, // 忽略HTTPS证书错误，方便测试自签名站点
    screenshot: 'only-on-failure', // 仅在测试失败时自动截图，便于排查问题
    video: 'retain-on-failure', // 仅在测试失败时保留视频，节省存储空间
    trace: 'retain-on-failure', // 仅在失败时保存trace，便于调试定位问题
    // 注意：storageState 在 projects 里单独配置，便于多账号/多环境扩展
  },

  // projects 字段用于配置多浏览器测试，每个浏览器为一个独立项目
  projects: [
    {
      name: 'chromium', // 项目名称：Chromium 浏览器
      use: {
        ...devices['Desktop Chrome'], // 使用 Playwright 预设的桌面 Chrome 配置
        storageState: './storageState/okx.json', // 指定初始登录状态，避免重复登录
      },
    },
  ],

  // reporter 字段配置测试报告的生成方式
  reporter: [
    ['html'], // 生成可视化的HTML测试报告，便于查看测试结果
    ['json', { outputFile: 'test-results/results.json' }], // 生成JSON格式报告，便于集成和分析
  ],

  // outputDir 字段指定所有测试输出（如截图、视频、trace等）的存放目录
  outputDir: 'test-results/', // 所有测试产物统一输出到 test-results 目录下
});
