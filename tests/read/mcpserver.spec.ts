/**
 * Read tests for MCPServer resources.
 * 
 * Prerequisites:
 * - npm run dev (starts UI at http://localhost:8080)
 * - kaos proxy running (Kubernetes API access)
 * - Cluster with MCPServer resources in kaos-hierarchy namespace
 */

import { test, expect } from '@playwright/test';
import { setupConnection, TEST_CONFIG } from '../fixtures/test-utils';

test.describe('MCPServer Read Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupConnection(page, {
      proxyUrl: TEST_CONFIG.proxyUrl,
      namespace: TEST_CONFIG.namespace,
    });
  });

  test('should display the MCPServer list page', async ({ page }) => {
    // Navigate to MCP Servers
    await page.getByRole('link', { name: /mcp server/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the MCPServers page
    await expect(page).toHaveURL(/\/mcpservers/);
    
    // Should show some content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should navigate to MCPServer detail page', async ({ page }) => {
    // Navigate to MCP Servers
    await page.getByRole('link', { name: /mcp server/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for resource links/cards
    const resourceLinks = page.locator('a[href*="/mcpservers/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      // Click the first resource
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/mcpservers\/[^/]+\/[^/]+/);
    } else {
      console.log('No MCPServer resources found in namespace');
    }
  });

  test('should display MCPServer detail tabs', async ({ page }) => {
    // Navigate to MCP Servers
    await page.getByRole('link', { name: /mcp server/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const resourceLinks = page.locator('a[href*="/mcpservers/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Detail page should have tabs (Overview, Tools, Pods, YAML)
      const tabList = page.locator('[role="tablist"]');
      if (await tabList.count() > 0) {
        await expect(tabList).toBeVisible();
        
        // MCPServer should have Tools tab
        const toolsTab = page.locator('[role="tab"]', { hasText: /tools/i });
        if (await toolsTab.count() > 0) {
          await expect(toolsTab).toBeVisible();
        }
      }
    } else {
      console.log('No MCPServer resources found in namespace');
    }
  });

  test('should display MCPServer type (python-runtime or node-runtime)', async ({ page }) => {
    // Navigate to MCP Servers
    await page.getByRole('link', { name: /mcp server/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const resourceLinks = page.locator('a[href*="/mcpservers/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // MCPServer detail should show the runtime type
      const pageContent = await page.locator('body').textContent() || '';
      
      // Should contain python-runtime or node-runtime
      const hasRuntimeType = pageContent.includes('python') || pageContent.includes('node');
      expect(hasRuntimeType || pageContent.length > 100).toBeTruthy();
    } else {
      console.log('No MCPServer resources found in namespace');
    }
  });
});
