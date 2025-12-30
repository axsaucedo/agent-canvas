/**
 * Kubernetes API Integration Tests
 * 
 * These tests validate the kubernetes-client against a real Kubernetes cluster.
 * Prerequisites:
 * - kubectl proxy running on port 8001
 * - ngrok tunnel or direct access to the proxy
 * - Set K8S_API_URL environment variable (e.g., https://xxxx.ngrok-free.app)
 * 
 * Run with: npm test -- tests/integration/kubernetes-api.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// We'll create a standalone client for testing to avoid polluting the singleton
interface K8sClientConfig {
  baseUrl: string;
  namespace: string;
}

interface K8sListResponse<T> {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion: string;
  };
  items: T[];
}

class TestKubernetesClient {
  private config: K8sClientConfig;

  constructor(baseUrl: string, namespace: string = 'default') {
    this.config = { baseUrl, namespace };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: HeadersInit = {};
    
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    headers['ngrok-skip-browser-warning'] = '1';
    
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`K8s API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const result = await this.request<{ gitVersion: string }>('/version');
      return { success: true, version: result.gitVersion };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async listNamespaces(): Promise<{ metadata: { name: string } }[]> {
    const response = await this.request<K8sListResponse<{ metadata: { name: string } }>>('/api/v1/namespaces');
    return response.items;
  }

  async listPods(namespace: string): Promise<unknown[]> {
    const response = await this.request<K8sListResponse<unknown>>(`/api/v1/namespaces/${namespace}/pods`);
    return response.items;
  }

  async listDeployments(namespace: string): Promise<unknown[]> {
    const response = await this.request<K8sListResponse<unknown>>(`/apis/apps/v1/namespaces/${namespace}/deployments`);
    return response.items;
  }

  async listServices(namespace: string): Promise<unknown[]> {
    const response = await this.request<K8sListResponse<unknown>>(`/api/v1/namespaces/${namespace}/services`);
    return response.items;
  }

  async listConfigMaps(namespace: string): Promise<unknown[]> {
    const response = await this.request<K8sListResponse<unknown>>(`/api/v1/namespaces/${namespace}/configmaps`);
    return response.items;
  }

  async createConfigMap(namespace: string, name: string, data: Record<string, string>): Promise<unknown> {
    return this.request(`/api/v1/namespaces/${namespace}/configmaps`, {
      method: 'POST',
      body: JSON.stringify({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name, namespace },
        data,
      }),
    });
  }

  async deleteConfigMap(namespace: string, name: string): Promise<void> {
    await this.request(`/api/v1/namespaces/${namespace}/configmaps/${name}`, {
      method: 'DELETE',
    });
  }

  async getConfigMap(namespace: string, name: string): Promise<unknown> {
    return this.request(`/api/v1/namespaces/${namespace}/configmaps/${name}`);
  }
}

// Test configuration
const K8S_API_URL = process.env.K8S_API_URL || '';
const TEST_NAMESPACE = process.env.TEST_NAMESPACE || 'default';
const SKIP_INTEGRATION = !K8S_API_URL;

describe.skipIf(SKIP_INTEGRATION)('Kubernetes API Integration Tests', () => {
  let client: TestKubernetesClient;
  const testResourcePrefix = `lovable-test-${Date.now()}`;

  beforeAll(() => {
    if (!K8S_API_URL) {
      console.warn('⚠️ K8S_API_URL not set. Set it to run integration tests.');
      console.warn('Example: K8S_API_URL=https://xxxx.ngrok-free.app npm test');
      return;
    }
    client = new TestKubernetesClient(K8S_API_URL, TEST_NAMESPACE);
  });

  afterAll(async () => {
    // Cleanup any test resources
    if (!client) return;
    
    try {
      const configMaps = await client.listConfigMaps(TEST_NAMESPACE) as { metadata: { name: string } }[];
      for (const cm of configMaps) {
        if (cm.metadata.name.startsWith(testResourcePrefix)) {
          await client.deleteConfigMap(TEST_NAMESPACE, cm.metadata.name).catch(() => {});
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Phase 1: Connection & Basic Operations', () => {
    it('should connect to the Kubernetes API', async () => {
      const result = await client.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.version).toBeDefined();
      expect(result.version).toMatch(/^v\d+\.\d+\.\d+/);
      
      console.log(`✅ Connected to Kubernetes ${result.version}`);
    });

    it('should list namespaces', async () => {
      const namespaces = await client.listNamespaces();
      
      expect(Array.isArray(namespaces)).toBe(true);
      expect(namespaces.length).toBeGreaterThan(0);
      
      // Default namespace should always exist
      const defaultNs = namespaces.find(ns => ns.metadata.name === 'default');
      expect(defaultNs).toBeDefined();
      
      console.log(`✅ Found ${namespaces.length} namespaces`);
    });
  });

  describe('Phase 2: Standard Resource Operations', () => {
    it('should list pods in namespace', async () => {
      const pods = await client.listPods(TEST_NAMESPACE);
      
      expect(Array.isArray(pods)).toBe(true);
      console.log(`✅ Found ${pods.length} pods in ${TEST_NAMESPACE}`);
    });

    it('should list deployments in namespace', async () => {
      const deployments = await client.listDeployments(TEST_NAMESPACE);
      
      expect(Array.isArray(deployments)).toBe(true);
      console.log(`✅ Found ${deployments.length} deployments in ${TEST_NAMESPACE}`);
    });

    it('should list services in namespace', async () => {
      const services = await client.listServices(TEST_NAMESPACE);
      
      expect(Array.isArray(services)).toBe(true);
      // kubernetes service should always exist in default namespace
      if (TEST_NAMESPACE === 'default') {
        expect(services.length).toBeGreaterThan(0);
      }
      console.log(`✅ Found ${services.length} services in ${TEST_NAMESPACE}`);
    });
  });

  describe('Phase 3: CRUD Operations', () => {
    const testConfigMapName = `${testResourcePrefix}-configmap`;

    it('should create a ConfigMap', async () => {
      const created = await client.createConfigMap(TEST_NAMESPACE, testConfigMapName, {
        testKey: 'testValue',
        anotherKey: 'anotherValue',
      }) as { metadata: { name: string }; data: Record<string, string> };

      expect(created).toBeDefined();
      expect(created.metadata.name).toBe(testConfigMapName);
      expect(created.data.testKey).toBe('testValue');
      
      console.log(`✅ Created ConfigMap ${testConfigMapName}`);
    });

    it('should read the created ConfigMap', async () => {
      const configMap = await client.getConfigMap(TEST_NAMESPACE, testConfigMapName) as {
        metadata: { name: string };
        data: Record<string, string>;
      };

      expect(configMap).toBeDefined();
      expect(configMap.metadata.name).toBe(testConfigMapName);
      expect(configMap.data.testKey).toBe('testValue');
      
      console.log(`✅ Read ConfigMap ${testConfigMapName}`);
    });

    it('should delete the ConfigMap', async () => {
      await client.deleteConfigMap(TEST_NAMESPACE, testConfigMapName);
      
      // Verify it's deleted
      try {
        await client.getConfigMap(TEST_NAMESPACE, testConfigMapName);
        throw new Error('ConfigMap should have been deleted');
      } catch (error) {
        expect((error as Error).message).toContain('404');
      }
      
      console.log(`✅ Deleted ConfigMap ${testConfigMapName}`);
    });
  });

  describe('Phase 4: Error Handling', () => {
    it('should return 404 for non-existent resource', async () => {
      try {
        await client.getConfigMap(TEST_NAMESPACE, 'non-existent-resource-12345');
        throw new Error('Should have thrown 404 error');
      } catch (error) {
        expect((error as Error).message).toContain('404');
      }
      
      console.log('✅ Correctly handles 404 errors');
    });

    it('should handle invalid namespace gracefully', async () => {
      try {
        await client.listPods('non-existent-namespace-12345');
        // Some clusters return empty array, others throw 403/404
      } catch (error) {
        // Expected for some cluster configurations
        expect((error as Error).message).toMatch(/40[34]/);
      }
      
      console.log('✅ Handles invalid namespace');
    });
  });
});

// Separate test suite for CRD operations (requires CRDs to be installed)
describe.skipIf(SKIP_INTEGRATION)('CRD Integration Tests (Optional)', () => {
  let client: TestKubernetesClient;
  const CRD_NAMESPACE = process.env.CRD_NAMESPACE || 'agentic-system';

  beforeAll(() => {
    if (!K8S_API_URL) return;
    client = new TestKubernetesClient(K8S_API_URL, CRD_NAMESPACE);
  });

  it('should check if agentic CRDs are installed', async () => {
    const agenticApiGroup = 'agentic.example.com';
    const agenticApiVersion = 'v1alpha1';

    try {
      const response = await fetch(`${K8S_API_URL}/apis/${agenticApiGroup}/${agenticApiVersion}`, {
        headers: { 'ngrok-skip-browser-warning': '1' },
      });

      if (response.ok) {
        console.log('✅ Agentic CRDs are installed');
        
        // Try to list each resource type
        const resources = ['modelapis', 'mcpservers', 'agents'];
        for (const resource of resources) {
          const listResponse = await fetch(
            `${K8S_API_URL}/apis/${agenticApiGroup}/${agenticApiVersion}/namespaces/${CRD_NAMESPACE}/${resource}`,
            { headers: { 'ngrok-skip-browser-warning': '1' } }
          );
          
          if (listResponse.ok) {
            const data = await listResponse.json();
            console.log(`  - ${resource}: ${data.items?.length || 0} resources`);
          }
        }
      } else {
        console.log('ℹ️ Agentic CRDs not installed (this is optional)');
      }
    } catch (error) {
      console.log('ℹ️ Could not check CRDs:', (error as Error).message);
    }
    
    // This test always passes - CRDs are optional
    expect(true).toBe(true);
  });
});

// Test summary helper
describe.skipIf(SKIP_INTEGRATION)('Test Summary', () => {
  it('prints test configuration', () => {
    console.log('\n📋 Test Configuration:');
    console.log(`  K8S_API_URL: ${K8S_API_URL}`);
    console.log(`  TEST_NAMESPACE: ${TEST_NAMESPACE}`);
    console.log(`  CRD_NAMESPACE: ${process.env.CRD_NAMESPACE || 'agentic-system'}`);
    console.log('\n');
    expect(true).toBe(true);
  });
});
