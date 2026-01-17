import React from 'react';
import { Box, Globe, Settings, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ModelAPI } from '@/types/kubernetes';

interface ModelAPIOverviewProps {
  modelAPI: ModelAPI;
}

export function ModelAPIOverview({ modelAPI }: ModelAPIOverviewProps) {
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

  const envVars = modelAPI.spec.mode === 'Proxy' 
    ? modelAPI.spec.proxyConfig?.env 
    : modelAPI.spec.hostedConfig?.env;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* General Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4 text-modelapi" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-mono font-medium">{modelAPI.metadata.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Namespace</span>
              <p className="font-mono font-medium">{modelAPI.metadata.namespace || 'default'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mode</span>
              <p>
                <Badge variant={modelAPI.spec.mode === 'Proxy' ? 'secondary' : 'outline'}>
                  {modelAPI.spec.mode}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p>
                <Badge variant={getStatusVariant(modelAPI.status?.phase)}>
                  {modelAPI.status?.phase || 'Unknown'}
                </Badge>
              </p>
            </div>
          </div>
          
          {modelAPI.metadata.creationTimestamp && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {new Date(modelAPI.metadata.creationTimestamp).toLocaleString()}
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
            <Activity className="h-4 w-4 text-modelapi" />
            Status Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ready</span>
              <p>
                <Badge variant={modelAPI.status?.ready ? 'success' : 'secondary'}>
                  {modelAPI.status?.ready ? 'Yes' : 'No'}
                </Badge>
              </p>
            </div>
          </div>
          
          {modelAPI.status?.endpoint && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Endpoint
                </span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1 block overflow-auto">
                  {modelAPI.status.endpoint}
                </code>
              </div>
            </>
          )}

          {modelAPI.status?.message && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Message</span>
                <p className="text-muted-foreground">{modelAPI.status.message}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-modelapi" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {modelAPI.spec.mode === 'Hosted' && modelAPI.spec.hostedConfig && (
            <div className="space-y-3">
              {modelAPI.spec.hostedConfig.model && (
                <div>
                  <span className="text-sm text-muted-foreground">Model</span>
                  <code className="font-mono text-sm block bg-muted px-2 py-1 rounded mt-1">
                    {modelAPI.spec.hostedConfig.model}
                  </code>
                </div>
              )}
            </div>
          )}
          
          {modelAPI.spec.mode === 'Proxy' && modelAPI.spec.proxyConfig && (
            <div className="space-y-3">
              {modelAPI.spec.proxyConfig.apiBase && (
                <div>
                  <span className="text-sm text-muted-foreground">API Base</span>
                  <code className="font-mono text-sm block bg-muted px-2 py-1 rounded mt-1">
                    {modelAPI.spec.proxyConfig.apiBase}
                  </code>
                </div>
              )}
              {modelAPI.spec.proxyConfig.model && (
                <div>
                  <span className="text-sm text-muted-foreground">Model</span>
                  <code className="font-mono text-sm block bg-muted px-2 py-1 rounded mt-1">
                    {modelAPI.spec.proxyConfig.model}
                  </code>
                </div>
              )}
              {!modelAPI.spec.proxyConfig.apiBase && !modelAPI.spec.proxyConfig.model && (
                <p className="text-sm text-muted-foreground">
                  Proxies requests to external LLM providers via LiteLLM
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Variables */}
      {envVars && envVars.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Environment Variables ({envVars.length})
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
                  {envVars.map((envVar, idx) => (
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
