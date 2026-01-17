import React from 'react';
import { Server, Package, Code, Globe, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { MCPServer } from '@/types/kubernetes';

interface MCPServerOverviewProps {
  mcpServer: MCPServer;
}

export function MCPServerOverview({ mcpServer }: MCPServerOverviewProps) {
  const getStatusVariant = (phase?: string) => {
    switch (phase) {
      case 'Running':
      case 'Ready': return 'success';
      case 'Pending': return 'warning';
      case 'Error':
      case 'Failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const toolsConfig = mcpServer.spec.config.tools;
  const hasPackage = toolsConfig?.fromPackage;
  const hasString = toolsConfig?.fromString;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* General Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-mcpserver" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-mono font-medium">{mcpServer.metadata.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Namespace</span>
              <p className="font-mono font-medium">{mcpServer.metadata.namespace || 'default'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p>
                <Badge variant="secondary">{mcpServer.spec.type}</Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p>
                <Badge variant={getStatusVariant(mcpServer.status?.phase)}>
                  {mcpServer.status?.phase || 'Unknown'}
                </Badge>
              </p>
            </div>
          </div>
          
          {mcpServer.metadata.creationTimestamp && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {new Date(mcpServer.metadata.creationTimestamp).toLocaleString()}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-mcpserver" />
            Status Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ready</span>
              <p>
                <Badge variant={mcpServer.status?.ready ? 'success' : 'secondary'}>
                  {mcpServer.status?.ready ? 'Yes' : 'No'}
                </Badge>
              </p>
            </div>
            {mcpServer.status?.availableTools && (
              <div>
                <span className="text-muted-foreground">Tools Count</span>
                <p className="font-medium">{mcpServer.status.availableTools.length}</p>
              </div>
            )}
          </div>
          
          {mcpServer.status?.endpoint && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Endpoint
                </span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1 block overflow-auto">
                  {mcpServer.status.endpoint}
                </code>
              </div>
            </>
          )}

          {mcpServer.status?.message && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Message</span>
                <p className="text-muted-foreground">{mcpServer.status.message}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tools Configuration */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4 text-mcpserver" />
            Tools Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPackage && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">From Package</span>
                <code className="font-mono text-sm block bg-muted px-2 py-1 rounded mt-1">
                  {toolsConfig.fromPackage}
                </code>
              </div>
            </div>
          )}
          
          {hasString && (
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">From Code</span>
                <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[200px]">
                  {toolsConfig.fromString}
                </pre>
              </div>
            </div>
          )}
          
          {!hasPackage && !hasString && (
            <p className="text-sm text-muted-foreground">No tools configured</p>
          )}

          {/* Available Tools List */}
          {mcpServer.status?.availableTools && mcpServer.status.availableTools.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">
                  Available Tools ({mcpServer.status.availableTools.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {mcpServer.status.availableTools.map((tool) => (
                    <Badge key={tool} variant="outline" className="font-mono text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Environment Variables */}
      {mcpServer.spec.config.env && mcpServer.spec.config.env.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Environment Variables ({mcpServer.spec.config.env.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {mcpServer.spec.config.env.map((envVar, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono text-xs">{envVar.name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground truncate max-w-[300px]">
                        {envVar.value || (envVar.valueFrom ? '<from secret/configmap>' : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
