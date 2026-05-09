import { test, expect } from '@playwright/test';

const ADMIN_PAGES = [
  { path: '/admin', menuTitle: 'Tables (D1)', header: 'Database Management' },
  { path: '/admin/llm-keys', menuTitle: 'API Keys', header: 'API Key Management' },
  { path: '/admin/kv', menuTitle: 'KV Storage', header: 'KV Storage Management' },
  { path: '/admin/providers', menuTitle: 'Providers', header: 'Provider Models' },
  { path: '/admin/chat', menuTitle: 'Chat Test', header: 'Chat Test' },
  { path: '/admin/analytics', menuTitle: 'Analytics', header: 'API Analytics' },
  { path: '/admin/domains', menuTitle: 'Domains', header: 'Domain Query' },
  { path: '/admin/github-gists', menuTitle: 'GitHub Gists', header: 'GitHub Gists' },
] as const;

// Mock API responses so pages can render without Cloudflare backend
async function mockAdminAPIs(page: any) {
  // Mock LLM Keys API (returns 500 in dev without CF bindings)
  await page.route('**/api/admin/llm-keys', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        keys: [
          {
            id: '1',
            name: 'Test Key',
            api_key: 'sk-test-key-12345',
            expires_at: null,
            created_at: '2025-01-01T00:00:00Z',
            is_active: true,
            last_used_at: null,
          },
        ],
      }),
    });
  });

  // Mock Domains API
  await page.route('**/api/admin/domains', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            domain: 'example.com',
            status: 'ok',
            slot_type: 'standard',
            lifecycle_type: 'active',
            expires_at: '20261231',
            nameservers: ['ns1.example.com'],
          },
        ],
      }),
    });
  });

  // Mock KV API
  await page.route('**/api/admin/kv', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, keys: [], list: [] }),
    });
  });

  // Mock Analytics API
  await page.route('**/api/admin/analytics/**', (route: any) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], series: [] }) });
  });

  // Mock GitHub Gists API
  await page.route('**/api/admin/github-gists', (route: any) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, gists: [] }) });
  });

  // Mock Tables/D1 API
  await page.route('**/api/admin/tables/**', (route: any) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, tables: [] }) });
  });
}

test.describe('Admin Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAPIs(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('侧边栏显示所有 8 个菜单项', async ({ page }) => {
    for (const { menuTitle } of ADMIN_PAGES) {
      await expect(page.locator(`.ant-menu-item:has-text("${menuTitle}")`).first()).toBeVisible();
    }
  });

  test('Tables (D1) 菜单条目默认高亮', async ({ page }) => {
    const menuItem = page.locator('.ant-menu-item-selected');
    await expect(menuItem).toContainText('Tables (D1)');
  });

  test('每个菜单链接指向正确路径', async ({ page }) => {
    for (const { path, menuTitle } of ADMIN_PAGES) {
      const link = page.locator(`.ant-menu-item:has-text("${menuTitle}") a`);
      await expect(link).toHaveAttribute('href', path);
    }
  });

  test('侧边栏可折叠展开', async ({ page, isMobile }) => {
    test.skip(isMobile, '仅桌面端有侧边栏折叠');

    await page.locator('.anticon-menu-fold').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.ant-menu-inline-collapsed')).toBeVisible();

    await page.locator('.anticon-menu-unfold').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Tables (D1)').first()).toBeVisible();
  });
});

test.describe('Admin 页面直接导航渲染', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAPIs(page);
  });

  test('Admin 首页 - Tables(D1)', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'Database Management' })).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('API Keys 页面', async ({ page }) => {
    await page.goto('/admin/llm-keys', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'API Key Management' })).toBeVisible();
    // Table should render with mock data
    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.locator('text=Test Key')).toBeVisible();
  });

  test('KV Storage 页面', async ({ page }) => {
    await page.goto('/admin/kv', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'KV Storage Management' })).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('Providers 页面', async ({ page }) => {
    await page.goto('/admin/providers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.ant-tabs')).toBeVisible();
    await expect(page.locator('.ant-tabs-tab').filter({ hasText: '模型' })).toBeVisible();
    await page.locator('.ant-tabs-tab').filter({ hasText: '模型' }).click();
    await page.waitForTimeout(3000);
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('Chat Test 页面', async ({ page }) => {
    await page.goto('/admin/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'Chat Test' })).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('Analytics 页面', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'API Analytics' })).toBeVisible();
    // Analytics chart sections
    await expect(page.locator('text=Requests by Model').first()).toBeVisible();
  });

  test('Domains 页面', async ({ page }) => {
    await page.goto('/admin/domains', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'Domain Query' })).toBeVisible();
    // Table should render with mock domain data
    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.getByText('example.com', { exact: true })).toBeVisible();
  });

  test('GitHub Gists 页面', async ({ page }) => {
    await page.goto('/admin/github-gists', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: 'GitHub Gists' })).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });
});

test.describe('Admin 页面交互', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAPIs(page);
  });

  test('页面间导航 - 通过侧边栏菜单', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1500);

    // Tables -> KV (click sidebar menu)
    const kvMenuItem = page.locator('.ant-menu-item').filter({ hasText: 'KV Storage' });
    if (await kvMenuItem.isVisible()) {
      await Promise.all([page.waitForURL('**/admin/kv', { timeout: 10000 }), kvMenuItem.click()]);
    }

    // Navigate back to Tables
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });
});
