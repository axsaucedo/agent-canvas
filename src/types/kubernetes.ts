// Kubernetes CRD Types for Agentic System

export type ResourceStatus = 'Running' | 'Pending' | 'Error' | 'Terminated' | 'Unknown';

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: {
      name: string;
      key: string;
    };
    configMapKeyRef?: {
      name: string;
      key: string;
    };
  };
}

export interface ResourceMetadata {
  name: string;
  namespace: string;
  uid?: string;
  creationTimestamp?: string;
  resourceVersion?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

// ModelAPI CRD
export type ModelAPIMode = 'Proxy' | 'Hosted';

export interface ProxyConfig {
  env?: EnvVar[];
}

export interface ServerConfig {
  model: string;
  env?: EnvVar[];
}

export interface ModelAPISpec {
  mode: ModelAPIMode;
  proxyConfig?: ProxyConfig;
  serverConfig?: ServerConfig;
}

export interface ModelAPI {
  apiVersion: string;
  kind: 'ModelAPI';
  metadata: ResourceMetadata;
  spec: ModelAPISpec;
  status?: {
    phase: ResourceStatus;
    endpoint?: string;
    message?: string;
  };
}

// MCPServer CRD
export type MCPServerType = 'python-runtime' | 'node-runtime';

export interface MCPServerConfig {
  mcp: string;
  env?: EnvVar[];
}

export interface MCPServerSpec {
  type: MCPServerType;
  config: MCPServerConfig;
}

export interface MCPServer {
  apiVersion: string;
  kind: 'MCPServer';
  metadata: ResourceMetadata;
  spec: MCPServerSpec;
  status?: {
    phase: string;
    ready?: boolean;
    endpoint?: string;
    availableTools?: string[];
    message?: string;
  };
}

// Agent CRD
export interface AgentNetwork {
  expose: boolean;
  access?: string[];
}

export interface AgentConfig {
  description: string;
  instructions: string;
  env?: EnvVar[];
}

export interface AgentSpec {
  modelAPI: string;
  mcpServers?: string[];
  agentNetwork?: AgentNetwork;
  config: AgentConfig;
}

export interface Agent {
  apiVersion: string;
  kind: 'Agent';
  metadata: ResourceMetadata;
  spec: AgentSpec;
  status?: {
    phase: ResourceStatus;
    connectedAgents?: string[];
    message?: string;
  };
}

// Standard Kubernetes Resources
export interface Pod {
  apiVersion: string;
  kind: 'Pod';
  metadata: ResourceMetadata;
  spec: {
    containers: {
      name: string;
      image: string;
      ports?: { containerPort: number }[];
    }[];
  };
  status?: {
    phase: ResourceStatus;
    podIP?: string;
    hostIP?: string;
    containerStatuses?: {
      name: string;
      ready: boolean;
      restartCount: number;
    }[];
  };
}

export interface Deployment {
  apiVersion: string;
  kind: 'Deployment';
  metadata: ResourceMetadata;
  spec: {
    replicas: number;
    selector: {
      matchLabels: Record<string, string>;
    };
    template?: {
      metadata?: {
        labels?: Record<string, string>;
      };
      spec?: {
        containers?: {
          name: string;
          image: string;
          ports?: { containerPort: number }[];
        }[];
      };
    };
  };
  status?: {
    replicas: number;
    readyReplicas: number;
    availableReplicas: number;
  };
}

export interface PersistentVolumeClaim {
  apiVersion: string;
  kind: 'PersistentVolumeClaim';
  metadata: ResourceMetadata;
  spec: {
    accessModes: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    storageClassName?: string;
  };
  status?: {
    phase: 'Pending' | 'Bound' | 'Lost';
    capacity?: {
      storage: string;
    };
  };
}

// Service type (new)
export interface Service {
  apiVersion: string;
  kind: 'Service';
  metadata: ResourceMetadata;
  spec: {
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
    ports: {
      port: number;
      targetPort: number | string;
      protocol: string;
      name?: string;
      nodePort?: number;
    }[];
    selector?: Record<string, string>;
    clusterIP?: string;
    externalIPs?: string[];
  };
  status?: {
    loadBalancer?: {
      ingress?: { ip?: string; hostname?: string }[];
    };
  };
}

// ConfigMap type (new)
export interface ConfigMap {
  apiVersion: string;
  kind: 'ConfigMap';
  metadata: ResourceMetadata;
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
}

// Secret reference type (new - without actual values for security)
export interface SecretRef {
  apiVersion: string;
  kind: 'Secret';
  metadata: ResourceMetadata;
  type: string;
}

// Union types for resources
export type AgenticResource = ModelAPI | MCPServer | Agent;
export type KubernetesResource = Pod | Deployment | PersistentVolumeClaim | Service;
export type Resource = AgenticResource | KubernetesResource;

// Log entry
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  resourceName?: string;
  resourceKind?: string;
}

// Canvas node for visual editor
export interface CanvasNode {
  id: string;
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  position: { x: number; y: number };
  data: AgenticResource;
  selected?: boolean;
}

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  zoom: number;
  pan: { x: number; y: number };
}
