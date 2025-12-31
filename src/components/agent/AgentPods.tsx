import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import type { Agent, Pod } from '@/types/kubernetes';
import { Box, CheckCircle, AlertCircle, Clock, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentPodsProps {
  agent: Agent;
}

function getPodStatusColor(phase: string): string {
  switch (phase?.toLowerCase()) {
    case 'running':
      return 'text-green-500';
    case 'pending':
      return 'text-yellow-500';
    case 'succeeded':
      return 'text-blue-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

function getPodStatusIcon(phase: string) {
  switch (phase?.toLowerCase()) {
    case 'running':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'succeeded':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getContainerStatus(pod: Pod) {
  const containerStatuses = pod.status?.containerStatuses || [];
  const ready = containerStatuses.filter(c => c.ready).length;
  const total = containerStatuses.length;
  return { ready, total };
}

function getRestartCount(pod: Pod): number {
  const containerStatuses = pod.status?.containerStatuses || [];
  return containerStatuses.reduce((sum, c) => sum + (c.restartCount || 0), 0);
}

function getAge(timestamp?: string): string {
  if (!timestamp) return 'Unknown';
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMins > 0) return `${diffMins}m`;
  return '<1m';
}

export function AgentPods({ agent }: AgentPodsProps) {
  const { pods, deployments, services } = useKubernetesStore();

  // Filter pods related to this agent
  const agentPods = pods.filter(pod => {
    const labels = pod.metadata.labels || {};
    return labels.agent === agent.metadata.name || 
           pod.metadata.name.includes(`agent-${agent.metadata.name}`);
  });

  // Find related deployment
  const agentDeployment = deployments.find(d => 
    d.metadata.name.includes(`agent-${agent.metadata.name}`) ||
    d.metadata.labels?.agent === agent.metadata.name
  );

  // Find related service
  const agentService = services.find(s => 
    s.metadata.name.includes(`agent-${agent.metadata.name}`) ||
    s.metadata.labels?.agent === agent.metadata.name
  );

  const hasIssues = agentPods.some(p => 
    p.status?.phase !== 'Running' || 
    getRestartCount(p) > 0
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="h-4 w-4 text-agent" />
              Pods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentPods.length}</div>
            <p className="text-xs text-muted-foreground">
              {agentPods.filter(p => p.status?.phase === 'Running').length} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-modelapi" />
              Deployment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentDeployment ? (
              <>
                <div className="text-2xl font-bold">
                  {agentDeployment.status?.readyReplicas || 0}/{agentDeployment.spec?.replicas || 1}
                </div>
                <p className="text-xs text-muted-foreground">replicas ready</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Not found</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {hasIssues ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              hasIssues ? "text-yellow-500" : "text-green-500"
            )}>
              {hasIssues ? 'Warning' : 'Healthy'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasIssues ? 'Check pod status below' : 'All systems operational'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Info */}
      {agentService && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Service Endpoint</CardTitle>
            <CardDescription>Internal cluster endpoint for this agent</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {agentService.metadata.name}.{agentService.metadata.namespace}.svc.cluster.local:
              {agentService.spec?.ports?.[0]?.port || 8000}
            </code>
          </CardContent>
        </Card>
      )}

      {/* Pods Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pod Status</CardTitle>
          <CardDescription>
            Detailed status of all pods running this agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentPods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No pods found for this agent
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The agent may not be deployed or pods are in another namespace
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ready</TableHead>
                    <TableHead>Restarts</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Host IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPods.map((pod) => {
                    const { ready, total } = getContainerStatus(pod);
                    const restarts = getRestartCount(pod);
                    return (
                      <TableRow key={pod.metadata.uid}>
                        <TableCell className="font-mono text-xs">
                          {pod.metadata.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPodStatusIcon(pod.status?.phase || 'Unknown')}
                            <span className={cn(
                              "text-sm",
                              getPodStatusColor(pod.status?.phase || 'Unknown')
                            )}>
                              {pod.status?.phase || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ready === total && total > 0 ? "success" : "secondary"}>
                            {ready}/{total}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            restarts > 0 ? "text-yellow-500" : "text-muted-foreground"
                          )}>
                            {restarts}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getAge(pod.metadata.creationTimestamp)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {pod.status?.hostIP || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
