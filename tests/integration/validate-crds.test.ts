/**
 * CRD Validation Tests
 * 
 * Tests that validate the correct CRD structure and API endpoints
 * against a live Kubernetes cluster with ethical.institute CRDs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.K8S_BASE_URL || 'http://localhost:8001';
const NAMESPACE = process.env.K8S_NAMESPACE || 'test';
const CRD_API_GROUP = 'ethical.institute';
const CRD_API_VERSION = 'v1alpha1';

interface K8sResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
    resourceVersion?: string;
  };
  spec: Record<string, unknown>;
  status?: Record<string, unknown>;
}

interface K8sListResponse<T> {
  apiVersion: string;
  kind: string;
  items: T[];
}

// Helper to make K8s API requests
async function k8sRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`K8s API error ${response.status}: ${text}`);
  }
  
  return response.json();
}

function getCrdPath(resource: string, name?: string): string {
  const basePath = `/apis/${CRD_API_GROUP}/${CRD_API_VERSION}/namespaces/${NAMESPACE}/${resource}`;
  return name ? `${basePath}/${name}` : basePath;
}

// Test resources matching user's working examples
const testModelAPI: K8sResource = {
  apiVersion: `${CRD_API_GROUP}/${CRD_API_VERSION}`,
  kind: 'ModelAPI',
  metadata: {
    name: 'test-validation-api',
    namespace: NAMESPACE,
  },
  spec: {
    mode: 'Proxy',
    proxyConfig: {
      env: [
        { name: 'OPENAI_API_KEY', value: 'sk-test' },
        { name: 'LITELLM_LOG', value: 'WARN' },
        { name: 'LITELLM_MODEL_LIST', value: 'ollama/smollm2:135m' },
        { name: 'OLLAMA_BASE_URL', value: 'http://host.docker.internal:11434' },
      ],
    },
  },
};

const testAgent: K8sResource = {
  apiVersion: `${CRD_API_GROUP}/${CRD_API_VERSION}`,
  kind: 'Agent',
  metadata: {
    name: 'test-validation-agent',
    namespace: NAMESPACE,
  },
  spec: {
    modelAPI: 'test-validation-api',
    agentNetwork: {
      expose: true,
    },
    config: {
      description: 'Test validation agent',
      instructions: 'You are a test agent for validation.',
      env: [
        { name: 'AGENT_LOG_LEVEL', value: 'INFO' },
        { name: 'MODEL_NAME', value: 'smollm2:135m' },
      ],
    },
  },
};

async function cleanupTestResources(): Promise<void> {
  try {
    await k8sRequest(getCrdPath('agents', testAgent.metadata.name), { method: 'DELETE' });
  } catch {
    // Ignore if not exists
  }
  try {
    await k8sRequest(getCrdPath('modelapis', testModelAPI.metadata.name), { method: 'DELETE' });
  } catch {
    // Ignore if not exists
  }
}

describe('CRD Validation Tests', () => {
  let connected = false;

  beforeAll(async () => {
    try {
      const result = await k8sRequest<{ gitVersion: string }>('/version');
      console.log(`Connected to Kubernetes: ${result.gitVersion}`);
      connected = true;
      await cleanupTestResources();
    } catch (error) {
      console.warn('Could not connect to Kubernetes cluster:', error);
    }
  });

  afterAll(async () => {
    if (connected) {
      await cleanupTestResources();
    }
  });

  describe('API Group Validation', () => {
    it('should use ethical.institute API group', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const path = getCrdPath('modelapis');
      expect(path).toContain('ethical.institute');
      expect(path).toContain('v1alpha1');
    });

    it('should list ModelAPIs from cluster', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('modelapis'));
      expect(response.kind).toBe('ModelAPIList');
      expect(Array.isArray(response.items)).toBe(true);
      console.log(`Found ${response.items.length} ModelAPIs`);
    });

    it('should list Agents from cluster', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('agents'));
      expect(response.kind).toBe('AgentList');
      expect(Array.isArray(response.items)).toBe(true);
      console.log(`Found ${response.items.length} Agents`);
    });

    it('should list MCPServers from cluster', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('mcpservers'));
      expect(response.kind).toBe('MCPServerList');
      expect(Array.isArray(response.items)).toBe(true);
      console.log(`Found ${response.items.length} MCPServers`);
    });
  });

  describe('ModelAPI CRUD Operations', () => {
    it('should create a ModelAPI with correct spec', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const created = await k8sRequest<K8sResource>(getCrdPath('modelapis'), {
        method: 'POST',
        body: JSON.stringify(testModelAPI),
      });

      expect(created.kind).toBe('ModelAPI');
      expect(created.metadata.name).toBe(testModelAPI.metadata.name);
      expect(created.spec.mode).toBe('Proxy');
      console.log('Created ModelAPI:', created.metadata.name);
    });

    it('should get the created ModelAPI', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const retrieved = await k8sRequest<K8sResource>(getCrdPath('modelapis', testModelAPI.metadata.name));
      expect(retrieved.metadata.name).toBe(testModelAPI.metadata.name);
    });

    it('should delete the ModelAPI', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      await k8sRequest(getCrdPath('modelapis', testModelAPI.metadata.name), { method: 'DELETE' });
      
      // Verify deletion
      try {
        await k8sRequest(getCrdPath('modelapis', testModelAPI.metadata.name));
        throw new Error('ModelAPI should have been deleted');
      } catch (error) {
        expect((error as Error).message).toContain('404');
      }
    });
  });

  describe('Agent CRUD Operations', () => {
    beforeAll(async () => {
      if (!connected) return;
      // Create ModelAPI first since Agent references it
      try {
        await k8sRequest<K8sResource>(getCrdPath('modelapis'), {
          method: 'POST',
          body: JSON.stringify(testModelAPI),
        });
      } catch {
        // Might already exist
      }
    });

    it('should create an Agent with correct spec', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const created = await k8sRequest<K8sResource>(getCrdPath('agents'), {
        method: 'POST',
        body: JSON.stringify(testAgent),
      });

      expect(created.kind).toBe('Agent');
      expect(created.metadata.name).toBe(testAgent.metadata.name);
      expect(created.spec.modelAPI).toBe('test-validation-api');
      console.log('Created Agent:', created.metadata.name);
    });

    it('should get the created Agent', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const retrieved = await k8sRequest<K8sResource>(getCrdPath('agents', testAgent.metadata.name));
      expect(retrieved.metadata.name).toBe(testAgent.metadata.name);
      expect(retrieved.spec.config).toBeDefined();
    });

    it('should delete the Agent', async () => {
      if (!connected) {
        console.log('Skipping - no cluster connection');
        return;
      }

      await k8sRequest(getCrdPath('agents', testAgent.metadata.name), { method: 'DELETE' });
      
      // Verify deletion
      try {
        await k8sRequest(getCrdPath('agents', testAgent.metadata.name));
        throw new Error('Agent should have been deleted');
      } catch (error) {
        expect((error as Error).message).toContain('404');
      }
    });
  });
});
