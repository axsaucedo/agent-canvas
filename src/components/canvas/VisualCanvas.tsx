import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Panel,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Server, Bot, Save, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { cn } from '@/lib/utils';
import type { ModelAPI, MCPServer, Agent } from '@/types/kubernetes';

// Custom Node Components
interface NodeData {
  [key: string]: unknown;
  label: string;
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  status?: string;
  mode?: string;
  mcpType?: string;
  mcpServers?: string[];
  modelAPI?: string;
  tools?: string[];
  resource: ModelAPI | MCPServer | Agent;
}

function ModelAPINode({ data, selected }: { data: NodeData; selected: boolean }) {
  const resource = data.resource as ModelAPI;
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[200px] bg-card transition-all',
      selected ? 'border-primary shadow-glow-primary' : 'border-border hover:border-primary/50'
    )}>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-modelapi/20 flex items-center justify-center">
          <Box className="h-4 w-4 text-modelapi" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground">ModelAPI</p>
        </div>
        <Badge variant={data.status === 'Running' ? 'success' : data.status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {data.status}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Mode: <span className="text-foreground">{resource.spec.mode}</span></p>
        {resource.status?.endpoint && (
          <p className="font-mono truncate">{resource.status.endpoint}</p>
        )}
      </div>
    </div>
  );
}

function MCPServerNode({ data, selected }: { data: NodeData; selected: boolean }) {
  const resource = data.resource as MCPServer;
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[200px] bg-card transition-all',
      selected ? 'border-primary shadow-glow-primary' : 'border-border hover:border-mcpserver/50'
    )}>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-mcpserver/20 flex items-center justify-center">
          <Server className="h-4 w-4 text-mcpserver" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground">MCPServer</p>
        </div>
        <Badge variant={data.status === 'Running' ? 'success' : data.status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {data.status}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {resource.spec.type && <p>Type: <span className="text-foreground">{resource.spec.type}</span></p>}
        <p>MCP: <span className="text-foreground font-mono">{resource.spec.config?.mcp}</span></p>
        {resource.status?.availableTools && resource.status.availableTools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {resource.status.availableTools.slice(0, 3).map(tool => (
              <Badge key={tool} variant="outline" className="text-[9px]">{tool}</Badge>
            ))}
            {resource.status.availableTools.length > 3 && (
              <Badge variant="outline" className="text-[9px]">+{resource.status.availableTools.length - 3}</Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentNode({ data, selected }: { data: NodeData; selected: boolean }) {
  const resource = data.resource as Agent;
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[220px] bg-card transition-all',
      selected ? 'border-primary shadow-glow-primary' : 'border-border hover:border-agent/50'
    )}>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-agent/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-agent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground">Agent</p>
        </div>
        <Badge variant={data.status === 'Running' ? 'success' : data.status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {data.status}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Model: <Badge variant="modelapi" className="text-[9px]">{resource.spec.modelAPI}</Badge></p>
        {resource.spec.mcpServers && resource.spec.mcpServers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {resource.spec.mcpServers.map(mcp => (
              <Badge key={mcp} variant="mcpserver" className="text-[9px]">{mcp}</Badge>
            ))}
          </div>
        )}
        {resource.spec.config?.description && (
          <p className="text-muted-foreground mt-1 truncate" title={resource.spec.config.description}>
            {resource.spec.config.description}
          </p>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  modelapi: ModelAPINode,
  mcpserver: MCPServerNode,
  agent: AgentNode,
};

interface PaletteItemProps {
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  icon: React.ElementType;
  color: string;
  onDragStart: (event: React.DragEvent, type: string) => void;
}

function PaletteItem({ type, icon: Icon, color, onDragStart }: PaletteItemProps) {
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all"
      draggable
      onDragStart={(e) => onDragStart(e, type)}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-${color}/20`}
        style={{ backgroundColor: `hsl(var(--${color}-color) / 0.2)` }}>
        <Icon className="h-4 w-4" style={{ color: `hsl(var(--${color}-color))` }} />
      </div>
      <span className="text-sm font-medium">{type}</span>
    </div>
  );
}

export function VisualCanvas() {
  const { modelAPIs, mcpServers, agents } = useKubernetesStore();
  
  // Convert resources to React Flow nodes
  const initialNodes = useMemo(() => {
    const nodes: Node<NodeData>[] = [];
    
    // ModelAPIs - left column
    modelAPIs.forEach((api, index) => {
      nodes.push({
        id: `modelapi-${api.metadata.name}`,
        type: 'modelapi',
        position: { x: 50, y: 50 + index * 180 },
        data: {
          label: api.metadata.name,
          type: 'ModelAPI',
          status: api.status?.phase || 'Unknown',
          mode: api.spec.mode,
          resource: api,
        },
      });
    });
    
    // MCPServers - middle column
    mcpServers.forEach((server, index) => {
      nodes.push({
        id: `mcpserver-${server.metadata.name}`,
        type: 'mcpserver',
        position: { x: 350, y: 50 + index * 180 },
        data: {
          label: server.metadata.name,
          type: 'MCPServer',
          status: server.status?.phase || 'Unknown',
          mcpType: server.spec.type,
          tools: server.status?.availableTools,
          resource: server,
        },
      });
    });
    
    // Agents - right column
    agents.forEach((agent, index) => {
      nodes.push({
        id: `agent-${agent.metadata.name}`,
        type: 'agent',
        position: { x: 700, y: 50 + index * 200 },
        data: {
          label: agent.metadata.name,
          type: 'Agent',
          status: agent.status?.phase || 'Unknown',
          mcpServers: agent.spec.mcpServers,
          modelAPI: agent.spec.modelAPI,
          resource: agent,
        },
      });
    });
    
    return nodes;
  }, [modelAPIs, mcpServers, agents]);
  
  // Create edges based on agent connections
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    agents.forEach(agent => {
      // Connect agent to ModelAPI
      const modelAPIId = `modelapi-${agent.spec.modelAPI}`;
      edges.push({
        id: `edge-${modelAPIId}-agent-${agent.metadata.name}`,
        source: modelAPIId,
        target: `agent-${agent.metadata.name}`,
        animated: true,
        style: { stroke: 'hsl(var(--modelapi-color))', strokeWidth: 2 },
      });
      
      // Connect agent to MCP Servers
      agent.spec.mcpServers?.forEach(mcpName => {
        const mcpId = `mcpserver-${mcpName}`;
        edges.push({
          id: `edge-${mcpId}-agent-${agent.metadata.name}`,
          source: mcpId,
          target: `agent-${agent.metadata.name}`,
          animated: true,
          style: { stroke: 'hsl(var(--mcpserver-color))', strokeWidth: 2 },
        });
      });
    });
    
    return edges;
  }, [agents]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when resources change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 350,
        y: event.clientY - 100,
      };

      const timestamp = Date.now();
      const newName = `new-${type.toLowerCase()}-${timestamp}`;
      
      const newNode: Node<NodeData> = {
        id: `${type.toLowerCase()}-${newName}`,
        type: type.toLowerCase(),
        position,
        data: {
          label: newName,
          type: type as 'ModelAPI' | 'MCPServer' | 'Agent',
          status: 'Pending',
          resource: createNewResource(type, newName),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const createNewResource = (type: string, name: string): ModelAPI | MCPServer | Agent => {
    const baseMeta = {
      name,
      namespace: 'test',
      uid: `${type}-${Date.now()}`,
      creationTimestamp: new Date().toISOString(),
    };

    switch (type) {
      case 'ModelAPI':
        return {
          apiVersion: 'ethical.institute/v1alpha1',
          kind: 'ModelAPI',
          metadata: baseMeta,
          spec: { mode: 'Proxy', proxyConfig: { env: [] } },
          status: { phase: 'Pending' },
        };
      case 'MCPServer':
        return {
          apiVersion: 'ethical.institute/v1alpha1',
          kind: 'MCPServer',
          metadata: baseMeta,
          spec: { type: 'python-runtime', config: { mcp: 'mcp-server-calculator', env: [] } },
          status: { phase: 'Pending' },
        };
      default:
        return {
          apiVersion: 'ethical.institute/v1alpha1',
          kind: 'Agent',
          metadata: baseMeta,
          spec: {
            modelAPI: '',
            mcpServers: [],
            config: { description: 'New agent', instructions: '' },
          },
          status: { phase: 'Pending' },
        };
    }
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Resource Palette */}
      <div className="w-64 bg-card border-r border-border p-4 space-y-4 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
          <p className="text-xs text-muted-foreground mb-4">Drag to add to canvas</p>
          <div className="space-y-2">
            <PaletteItem type="ModelAPI" icon={Box} color="modelapi" onDragStart={onDragStart} />
            <PaletteItem type="MCPServer" icon={Server} color="mcpserver" onDragStart={onDragStart} />
            <PaletteItem type="Agent" icon={Bot} color="agent" onDragStart={onDragStart} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Actions</h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Save className="h-4 w-4" />
              Apply to Cluster
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Download className="h-4 w-4" />
              Export YAML
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Error</span>
            </div>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-canvas-bg"
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2 },
          }}
        >
          <Controls className="bg-card border border-border rounded-lg" />
          <MiniMap 
            className="bg-card border border-border rounded-lg"
            nodeColor={(node) => {
              switch (node.type) {
                case 'modelapi': return 'hsl(var(--modelapi-color))';
                case 'mcpserver': return 'hsl(var(--mcpserver-color))';
                case 'agent': return 'hsl(var(--agent-color))';
                default: return 'hsl(var(--muted))';
              }
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
          
          <Panel position="top-right" className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              {nodes.length} nodes • {edges.length} connections
            </Badge>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
