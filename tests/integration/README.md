# Kubernetes Integration Tests

These tests validate the kubernetes-client against a **real Kubernetes cluster**.

## Prerequisites

1. **kubectl proxy** running locally:
   ```bash
   kubectl proxy --port=8001
   ```

2. **ngrok tunnel** to expose the proxy (for browser-based testing):
   ```bash
   ngrok http 8001
   ```

3. **Set environment variable** with the ngrok URL:
   ```bash
   export K8S_API_URL=https://xxxx.ngrok-free.app
   ```

## Running Tests

### Run all integration tests:
```bash
K8S_API_URL=https://your-ngrok-url.ngrok-free.app npm test -- tests/integration/
```

### Run with custom namespace:
```bash
K8S_API_URL=https://your-ngrok-url.ngrok-free.app \
TEST_NAMESPACE=my-namespace \
npm test -- tests/integration/
```

### Run with CRD namespace:
```bash
K8S_API_URL=https://your-ngrok-url.ngrok-free.app \
CRD_NAMESPACE=agentic-system \
npm test -- tests/integration/
```

## Test Categories

### Phase 1: Connection & Basic Operations
- Connects to K8s API
- Verifies cluster version
- Lists namespaces

### Phase 2: Standard Resource Operations
- Lists Pods
- Lists Deployments
- Lists Services
- Lists ConfigMaps

### Phase 3: CRUD Operations
- Creates ConfigMap (test resource)
- Reads ConfigMap
- Deletes ConfigMap

### Phase 4: Error Handling
- 404 for non-existent resources
- Invalid namespace handling

### CRD Tests (Optional)
- Checks if agentic CRDs are installed
- Lists ModelAPIs, MCPServers, Agents

## Test Resources

Tests create resources with prefix `lovable-test-{timestamp}` and clean them up after completion.

## Skipping Tests

Tests are automatically skipped if `K8S_API_URL` is not set.

## CI/CD Integration

For CI/CD, you'll need:
1. A test Kubernetes cluster
2. Service account with appropriate RBAC
3. Secure way to expose the API (not ngrok)

Example GitHub Actions workflow:
```yaml
- name: Run K8s Integration Tests
  env:
    K8S_API_URL: ${{ secrets.K8S_TEST_API_URL }}
    TEST_NAMESPACE: test-ns
  run: npm test -- tests/integration/
```
