

# Streaming Fix, Visual Map Persistence, and Agent Detail Default Tab

## Problem Summary

Three separate issues to address:

1. **Agent chat streaming is broken**: The `streamChatCompletion` method in `kubernetes-client.ts` routes chat requests through the K8s service proxy (`/api/v1/namespaces/.../services/.../proxy/...`), which buffers SSE responses. The streaming code is also tangled into the general-purpose K8s client, making it hard to debug. A persistent `{}` artifact appears in responses.

2. **Visual Map resets on tab switch**: The `VisualMap` component is conditionally rendered via `renderContent()` in `Index.tsx`, which unmounts/remounts it on every tab switch, losing pan/zoom state. The same persistence pattern used for KAOS Monitoring (always-mounted + CSS hidden) should be applied.

3. **Agent detail page defaults to "chat" tab**: Line 53 of `AgentDetail.tsx` defaults to `'chat'` when no `?tab=` param exists; it should default to `'overview'` like other detail pages.

---

## Part 1: Create Dedicated Agent Chat Client

**Rationale**: Separate streaming concerns from the general K8s CRUD client. Create a small, focused `agentClient` in `src/lib/agent-client.ts` that calls the K8s service proxy directly for chat completions. This isolates the SSE parsing, artifact filtering, and streaming logic without polluting the generic client.

### New file: `src/lib/agent-client.ts`

- Export a single function: `streamAgentChat(baseUrl, serviceName, namespace, messages, options)`
- Builds the K8s service proxy URL directly: `{baseUrl}/api/v1/namespaces/{ns}/services/{serviceName}:8000/proxy/v1/chat/completions`
- Sets proper SSE headers: `Accept: text/event-stream`, `Cache-Control: no-cache`
- Includes tunnel bypass headers (`bypass-tunnel-reminder`, `X-Requested-With`)
- Reads the response body stream with `ReadableStream` reader
- Parses SSE `data:` lines inline as they arrive
- Detects progress blocks (JSON with `type: 'progress'`) and routes to `onProgress`
- Filters artifacts: standalone `{}`, markdown-wrapped `{}` blocks, "Final Response to User:" headers
- Calls `onChunk` for real content, `onDone` on `[DONE]` or stream end

### Modify: `src/hooks/useAgentChat.ts`

- Replace the import of `k8sClient` with import of `streamAgentChat` from `agent-client`
- Get `baseUrl` from `k8sClient.getConfig().baseUrl` (still needed for URL construction)
- Call `streamAgentChat` instead of `k8sClient.streamChatCompletion`

### Modify: `src/lib/kubernetes-client.ts`

- Remove the `streamChatCompletion` method entirely (it will no longer be needed)
- This simplifies the K8s client back to pure CRUD + proxy operations

---

## Part 2: Visual Map State Persistence

### Modify: `src/pages/Index.tsx`

Apply the same always-mounted pattern already used for KAOS Monitoring:

- Remove `case 'visual-map': return <VisualMap />;` from `renderContent()`
- Add a sibling div that is always mounted but uses CSS `hidden` class when not active:

```
<div className={activeTab === 'visual-map' ? 'h-full w-full' : 'hidden'}>
  <VisualMap />
</div>
```

This preserves pan/zoom/node positions across tab switches.

---

## Part 3: Agent Detail Default Tab

### Modify: `src/pages/AgentDetail.tsx`

Change line 53 from:
```typescript
const initialTab = searchParams.get('tab') || 'chat';
```
to:
```typescript
const initialTab = searchParams.get('tab') || 'overview';
```

This makes the agent detail page open on "Overview" by default, consistent with ModelAPI and MCPServer detail pages.

---

## Part 4: Update Documentation

### Modify: `.github/instructions/components.instructions.md`

- Document the new `agent-client.ts` module and its purpose
- Note the Visual Map persistence pattern

---

## TODO Checklist

1. Create `src/lib/agent-client.ts` with `streamAgentChat` function
2. Update `src/hooks/useAgentChat.ts` to use the new agent client
3. Remove `streamChatCompletion` from `src/lib/kubernetes-client.ts`
4. Fix Visual Map persistence in `src/pages/Index.tsx` (always-mounted pattern)
5. Fix Agent detail default tab in `src/pages/AgentDetail.tsx` (overview instead of chat)
6. Update `.github/instructions/components.instructions.md`

