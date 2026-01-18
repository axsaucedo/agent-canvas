/**
 * Demo Mode Data - KAOS-UI Documentation Screenshots
 * 
 * This showcases a realistic multi-agent software development team:
 * - Supervisor Agent: "dev-lead" orchestrates the team
 * - Worker Agents: code-writer, code-reviewer, test-runner, deployment-bot
 * - MCP Servers: github-tools, terminal-mcp  
 * - Model APIs: gpt-4o-proxy (primary LLM)
 */

import type { ModelAPI, MCPServer, Agent, Pod, Deployment, Service, K8sSecret } from '@/types/kubernetes';

export const DEMO_NAMESPACE = 'kaos-hierarchy';

// ============================================
// MODEL APIS - LLM Endpoints
// ============================================
export const demoModelAPIs: ModelAPI[] = [
  {
    apiVersion: 'kaos.tools/v1alpha1',
    kind: 'ModelAPI',
    metadata: { 
      name: 'gpt-4o-proxy', 
      namespace: DEMO_NAMESPACE, 
      uid: 'modelapi-gpt4o', 
      creationTimestamp: '2026-01-10T09:00:00Z',
      labels: { 'kaos.tools/tier': 'production' }
    },
    spec: { 
      mode: 'Proxy', 
      proxyConfig: { 
        model: 'gpt-4o', 
        apiBase: 'https://api.openai.com/v1' 
      },
    },
    status: { 
      ready: true, 
      phase: 'Ready', 
      message: 'Proxy healthy, 2/2 replicas available',
      endpoint: 'http://gpt-4o-proxy.kaos-hierarchy:4000',
      deployment: {
        replicas: 2,
        readyReplicas: 2,
        availableReplicas: 2,
      }
    },
  },
];

// ============================================
// MCP SERVERS - Tool Providers
// ============================================
export const demoMCPServers: MCPServer[] = [
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'MCPServer', 
    metadata: { 
      name: 'github-tools', 
      namespace: DEMO_NAMESPACE, 
      uid: 'mcp-github', 
      creationTimestamp: '2026-01-10T09:30:00Z',
      labels: { 'kaos.tools/category': 'version-control' }
    },
    spec: { 
      type: 'python-runtime', 
      config: { 
        tools: { fromPackage: 'mcp-server-github' },
        env: [{ name: 'GITHUB_TOKEN', valueFrom: { secretKeyRef: { name: 'github-pat', key: 'token' } } }]
      } 
    },
    status: { 
      ready: true, 
      phase: 'Ready', 
      endpoint: 'http://github-tools.kaos-hierarchy:9000',
      availableTools: ['create_issue', 'list_issues', 'create_pull_request', 'review_pr', 'merge_pr', 'get_file_contents', 'search_code'] 
    } 
  },
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'MCPServer', 
    metadata: { 
      name: 'terminal-mcp', 
      namespace: DEMO_NAMESPACE, 
      uid: 'mcp-terminal', 
      creationTimestamp: '2026-01-10T09:35:00Z',
      labels: { 'kaos.tools/category': 'execution' }
    },
    spec: { 
      type: 'python-runtime', 
      config: { 
        tools: { fromPackage: 'mcp-server-terminal' },
      } 
    },
    status: { 
      ready: true, 
      phase: 'Ready', 
      endpoint: 'http://terminal-mcp.kaos-hierarchy:9000',
      availableTools: ['run_command', 'read_file', 'write_file', 'list_directory'] 
    } 
  },
];

// ============================================
// AGENTS - AI Agent Hierarchy
// ============================================
export const demoAgents: Agent[] = [
  // SUPERVISOR AGENT
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'Agent', 
    metadata: { 
      name: 'dev-lead', 
      namespace: DEMO_NAMESPACE, 
      uid: 'agent-dev-lead', 
      creationTimestamp: '2026-01-10T10:00:00Z', 
      labels: { 
        'kaos.tools/role': 'supervisor',
        'kaos.tools/team': 'platform'
      } 
    },
    spec: { 
      modelAPI: 'gpt-4o-proxy', 
      mcpServers: ['github-tools', 'terminal-mcp'],
      agentNetwork: {
        expose: true,
        access: ['code-writer', 'code-reviewer', 'test-runner', 'deployment-bot'],
      },
      config: { 
        description: 'Development team lead - coordinates code writing, review, testing, and deployment',
        instructions: 'You are a senior development lead managing a team of specialized agents. Delegate tasks appropriately and ensure quality.',
      } 
    }, 
    status: { 
      ready: true, 
      phase: 'Running',
      endpoint: 'http://dev-lead.kaos-hierarchy:8080/.well-known/agent.json',
      deployment: {
        replicas: 1,
        readyReplicas: 1,
        availableReplicas: 1,
        conditions: [
          { type: 'Available', status: 'True' },
          { type: 'Progressing', status: 'True', reason: 'NewReplicaSetAvailable' }
        ]
      }
    } 
  },
  // WORKER AGENTS
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'Agent', 
    metadata: { 
      name: 'code-writer', 
      namespace: DEMO_NAMESPACE, 
      uid: 'agent-code-writer', 
      creationTimestamp: '2026-01-10T10:05:00Z', 
      labels: { 
        'kaos.tools/role': 'worker',
        'kaos.tools/team': 'platform',
        'kaos.tools/supervisor': 'dev-lead'
      } 
    },
    spec: { 
      modelAPI: 'gpt-4o-proxy', 
      mcpServers: ['github-tools', 'terminal-mcp'],
      agentNetwork: { expose: true },
      config: {
        description: 'Writes clean, well-documented code based on specifications',
        instructions: 'You are a skilled software developer. Write clean, efficient, well-tested code.',
      }
    }, 
    status: { 
      ready: true, 
      phase: 'Running',
      endpoint: 'http://code-writer.kaos-hierarchy:8080/.well-known/agent.json',
    } 
  },
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'Agent', 
    metadata: { 
      name: 'code-reviewer', 
      namespace: DEMO_NAMESPACE, 
      uid: 'agent-code-reviewer', 
      creationTimestamp: '2026-01-10T10:10:00Z', 
      labels: { 
        'kaos.tools/role': 'worker',
        'kaos.tools/team': 'platform',
        'kaos.tools/supervisor': 'dev-lead'
      } 
    },
    spec: { 
      modelAPI: 'gpt-4o-proxy', 
      mcpServers: ['github-tools'],
      agentNetwork: { expose: true },
      config: {
        description: 'Reviews code for quality, security, and best practices',
        instructions: 'You are a meticulous code reviewer. Focus on security, performance, and maintainability.',
      }
    }, 
    status: { ready: true, phase: 'Running' } 
  },
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'Agent', 
    metadata: { 
      name: 'test-runner', 
      namespace: DEMO_NAMESPACE, 
      uid: 'agent-test-runner', 
      creationTimestamp: '2026-01-10T10:15:00Z', 
      labels: { 
        'kaos.tools/role': 'worker',
        'kaos.tools/team': 'platform',
        'kaos.tools/supervisor': 'dev-lead'
      } 
    },
    spec: { 
      modelAPI: 'gpt-4o-proxy', 
      mcpServers: ['terminal-mcp'],
      agentNetwork: { expose: true },
      config: {
        description: 'Runs tests and reports results',
        instructions: 'You are a QA engineer. Run comprehensive tests and report findings clearly.',
      }
    }, 
    status: { ready: true, phase: 'Running' } 
  },
  { 
    apiVersion: 'kaos.tools/v1alpha1', 
    kind: 'Agent', 
    metadata: { 
      name: 'deployment-bot', 
      namespace: DEMO_NAMESPACE, 
      uid: 'agent-deployment-bot', 
      creationTimestamp: '2026-01-10T10:20:00Z', 
      labels: { 
        'kaos.tools/role': 'worker',
        'kaos.tools/team': 'platform',
        'kaos.tools/supervisor': 'dev-lead'
      } 
    },
    spec: { 
      modelAPI: 'gpt-4o-proxy', 
      mcpServers: ['terminal-mcp', 'github-tools'],
      agentNetwork: { expose: true },
      config: {
        description: 'Handles deployments and infrastructure updates',
        instructions: 'You are a DevOps engineer. Deploy safely with proper rollback procedures.',
      }
    }, 
    status: { ready: true, phase: 'Running' } 
  },
];

// ============================================
// PODS - Running Containers
// ============================================
const agentPodTemplate = (name: string, uid: string, restarts = 0): Pod => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { 
    name: `${name}-5d9f8b7c6-${uid.slice(0, 5)}`, 
    namespace: DEMO_NAMESPACE, 
    uid: `pod-${uid}`, 
    creationTimestamp: '2026-01-18T08:00:00Z', 
    labels: { 
      'app.kubernetes.io/name': name,
      'app.kubernetes.io/component': 'agent',
      'kaos.tools/resource-type': 'agent'
    },
  },
  spec: { 
    containers: [
      { name: 'agent', image: 'ghcr.io/kaos-tools/agent-runtime:v0.3.2', ports: [{ containerPort: 8080 }] }
    ],
    nodeName: 'worker-node-1'
  },
  status: { 
    phase: 'Running', 
    podIP: `10.244.0.${10 + parseInt(uid.slice(0, 2), 16) % 200}`,
    hostIP: '192.168.1.101',
    containerStatuses: [
      { name: 'agent', ready: true, restartCount: restarts, state: { running: { startedAt: '2026-01-18T08:00:10Z' } } }
    ] 
  },
});

const mcpPodTemplate = (name: string, uid: string): Pod => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { 
    name: `${name}-7c8d9e0f1-${uid.slice(0, 5)}`, 
    namespace: DEMO_NAMESPACE, 
    uid: `pod-mcp-${uid}`, 
    creationTimestamp: '2026-01-18T07:55:00Z', 
    labels: { 
      'app.kubernetes.io/name': name,
      'app.kubernetes.io/component': 'mcp-server',
      'kaos.tools/resource-type': 'mcpserver'
    },
  },
  spec: { 
    containers: [
      { name: 'mcp', image: 'ghcr.io/kaos-tools/mcp-runtime:v0.2.1' }
    ],
    nodeName: 'worker-node-2'
  },
  status: { 
    phase: 'Running', 
    podIP: `10.244.1.${20 + parseInt(uid.slice(0, 2), 16) % 200}`,
    containerStatuses: [{ name: 'mcp', ready: true, restartCount: 0 }] 
  },
});

export const demoPods: Pod[] = [
  // Agent pods
  agentPodTemplate('dev-lead', 'abc12', 0),
  agentPodTemplate('code-writer', 'def34', 1),
  agentPodTemplate('code-reviewer', 'ghi56', 0),
  agentPodTemplate('test-runner', 'jkl78', 0),
  agentPodTemplate('deployment-bot', 'mno90', 2),
  // MCP Server pods
  mcpPodTemplate('github-tools', 'pqr12'),
  mcpPodTemplate('terminal-mcp', 'stu34'),
  // ModelAPI pods (2 replicas)
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { 
      name: 'gpt-4o-proxy-8a9b0c1d2-wx1yz', 
      namespace: DEMO_NAMESPACE, 
      uid: 'pod-modelapi-1', 
      creationTimestamp: '2026-01-18T07:50:00Z',
      labels: { 'app.kubernetes.io/name': 'gpt-4o-proxy', 'kaos.tools/resource-type': 'modelapi' }
    },
    spec: { containers: [{ name: 'litellm', image: 'ghcr.io/kaos-tools/litellm-proxy:v1.0.0' }] },
    status: { phase: 'Running', podIP: '10.244.2.10', containerStatuses: [{ name: 'litellm', ready: true, restartCount: 0 }] },
  },
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { 
      name: 'gpt-4o-proxy-8a9b0c1d2-ab2cd', 
      namespace: DEMO_NAMESPACE, 
      uid: 'pod-modelapi-2', 
      creationTimestamp: '2026-01-18T07:50:00Z',
      labels: { 'app.kubernetes.io/name': 'gpt-4o-proxy', 'kaos.tools/resource-type': 'modelapi' }
    },
    spec: { containers: [{ name: 'litellm', image: 'ghcr.io/kaos-tools/litellm-proxy:v1.0.0' }] },
    status: { phase: 'Running', podIP: '10.244.2.11', containerStatuses: [{ name: 'litellm', ready: true, restartCount: 0 }] },
  },
];

// ============================================
// DEPLOYMENTS
// ============================================
const createDeployment = (name: string, uid: string, replicas = 1): Deployment => ({
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: { name, namespace: DEMO_NAMESPACE, uid: `deploy-${uid}`, creationTimestamp: '2026-01-18T07:45:00Z' },
  spec: { replicas, selector: { matchLabels: { 'app.kubernetes.io/name': name } } },
  status: { replicas, readyReplicas: replicas, availableReplicas: replicas },
});

export const demoDeployments: Deployment[] = [
  createDeployment('dev-lead', 'agent-dev-lead'),
  createDeployment('code-writer', 'agent-code-writer'),
  createDeployment('code-reviewer', 'agent-code-reviewer'),
  createDeployment('test-runner', 'agent-test-runner'),
  createDeployment('deployment-bot', 'agent-deployment-bot'),
  createDeployment('github-tools', 'mcp-github'),
  createDeployment('terminal-mcp', 'mcp-terminal'),
  createDeployment('gpt-4o-proxy', 'modelapi-gpt4o', 2),
];

// ============================================
// SERVICES
// ============================================
const createService = (name: string, uid: string, port = 8080): Service => ({
  apiVersion: 'v1',
  kind: 'Service',
  metadata: { name, namespace: DEMO_NAMESPACE, uid: `svc-${uid}`, creationTimestamp: '2026-01-18T07:45:00Z' },
  spec: { 
    type: 'ClusterIP', 
    ports: [{ port, targetPort: port, protocol: 'TCP' }], 
    selector: { 'app.kubernetes.io/name': name } 
  },
});

export const demoServices: Service[] = [
  createService('dev-lead', 'agent-dev-lead'),
  createService('code-writer', 'agent-code-writer'),
  createService('code-reviewer', 'agent-code-reviewer'),
  createService('test-runner', 'agent-test-runner'),
  createService('deployment-bot', 'agent-deployment-bot'),
  createService('github-tools', 'mcp-github', 9000),
  createService('terminal-mcp', 'mcp-terminal', 9000),
  createService('gpt-4o-proxy', 'modelapi-gpt4o', 4000),
];

// ============================================
// SECRETS
// ============================================
export const demoSecrets: K8sSecret[] = [
  { 
    apiVersion: 'v1', 
    kind: 'Secret', 
    metadata: { name: 'openai-api-key', namespace: DEMO_NAMESPACE, uid: 'secret-openai', creationTimestamp: '2026-01-08T12:00:00Z' }, 
    type: 'Opaque', 
    data: { OPENAI_API_KEY: 'c2stcHJvai0qKioqKioqKioqKioqKioqKioqKg==' } 
  },
  { 
    apiVersion: 'v1', 
    kind: 'Secret', 
    metadata: { name: 'github-pat', namespace: DEMO_NAMESPACE, uid: 'secret-github', creationTimestamp: '2026-01-08T12:05:00Z' }, 
    type: 'Opaque', 
    data: { token: 'Z2hwXyoqKioqKioqKioqKioqKioqKioqKio=' } 
  },
  { 
    apiVersion: 'v1', 
    kind: 'Secret', 
    metadata: { name: 'slack-webhook', namespace: DEMO_NAMESPACE, uid: 'secret-slack', creationTimestamp: '2026-01-08T12:10:00Z' }, 
    type: 'Opaque', 
    data: { url: 'aHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvKioq' } 
  },
];
