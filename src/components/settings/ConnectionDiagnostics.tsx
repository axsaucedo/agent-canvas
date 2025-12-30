import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function ConnectionDiagnostics() {
  const [ngrokUrl, setNgrokUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (index: number, update: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...update } : r));
  };

  const runDiagnostics = async () => {
    if (!ngrokUrl) return;

    const cleanUrl = ngrokUrl.replace(/\/$/, '');
    setIsRunning(true);

    // Initialize all tests
    const initialResults: TestResult[] = [
      { name: 'URL Format', status: 'pending', message: 'Checking URL format...' },
      { name: 'Simple GET (no headers)', status: 'pending', message: 'Testing simple GET without custom headers...' },
      { name: 'GET with ngrok header', status: 'pending', message: 'Testing GET with ngrok-skip-browser-warning...' },
      { name: 'CORS Headers Check', status: 'pending', message: 'Checking if CORS headers are present...' },
      { name: 'K8s API Response', status: 'pending', message: 'Validating Kubernetes API response...' },
    ];
    setResults(initialResults);

    // Test 1: URL Format
    await new Promise(r => setTimeout(r, 200));
    try {
      const url = new URL(cleanUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        updateResult(0, { status: 'error', message: 'Invalid protocol', details: 'URL must start with http:// or https://' });
        setIsRunning(false);
        return;
      }
      updateResult(0, { 
        status: 'success', 
        message: 'Valid URL', 
        details: url.hostname 
      });
    } catch (e) {
      updateResult(0, { status: 'error', message: 'Invalid URL format', details: String(e) });
      setIsRunning(false);
      return;
    }

    // Test 2: Simple GET without any custom headers (should NOT trigger preflight)
    updateResult(1, { status: 'running', message: 'Testing simple GET...' });
    await new Promise(r => setTimeout(r, 200));
    
    let simpleGetWorked = false;
    let simpleGetData: any = null;
    
    try {
      // No custom headers = no CORS preflight needed
      const response = await fetch(`${cleanUrl}/version`);
      
      if (response.ok) {
        simpleGetData = await response.json();
        simpleGetWorked = true;
        updateResult(1, { 
          status: 'success', 
          message: 'Simple GET works!', 
          details: `K8s ${simpleGetData.gitVersion || 'responded'}` 
        });
      } else {
        const text = await response.text();
        // Check if we got ngrok's warning page
        if (text.includes('ngrok') && text.includes('ERR_NGROK')) {
          updateResult(1, { 
            status: 'warning', 
            message: `Got ngrok error page`, 
            details: 'ngrok may have rate-limited or the tunnel is down' 
          });
        } else if (text.includes('ngrok') && text.includes('Visit Site')) {
          updateResult(1, { 
            status: 'warning', 
            message: 'Got ngrok warning page', 
            details: 'Need ngrok-skip-browser-warning header, which triggers preflight' 
          });
        } else {
          updateResult(1, { 
            status: 'error', 
            message: `HTTP ${response.status}`, 
            details: text.slice(0, 200) 
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      updateResult(1, { 
        status: 'error', 
        message: 'Request failed', 
        details: msg 
      });
    }

    // Test 3: GET with ngrok-skip-browser-warning header (triggers preflight)
    updateResult(2, { status: 'running', message: 'Testing with ngrok header...' });
    await new Promise(r => setTimeout(r, 200));
    
    let headerGetWorked = false;
    
    try {
      const response = await fetch(`${cleanUrl}/version`, {
        headers: {
          'ngrok-skip-browser-warning': '1',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        headerGetWorked = true;
        updateResult(2, { 
          status: 'success', 
          message: 'GET with header works!', 
          details: `CORS preflight passed! K8s ${data.gitVersion}` 
        });
        simpleGetData = data;
      } else {
        updateResult(2, { 
          status: 'error', 
          message: `HTTP ${response.status}`, 
          details: await response.text().then(t => t.slice(0, 200)).catch(() => 'No body') 
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (msg.includes('NetworkError') || msg.includes('CORS') || msg.includes('fetch')) {
        updateResult(2, { 
          status: 'error', 
          message: 'CORS preflight failed', 
          details: 'Browser blocked due to missing Access-Control-Allow-Headers for ngrok-skip-browser-warning' 
        });
      } else {
        updateResult(2, { status: 'error', message: 'Request failed', details: msg });
      }
    }

    // Test 4: Check CORS headers
    updateResult(3, { status: 'running', message: 'Checking CORS configuration...' });
    await new Promise(r => setTimeout(r, 200));
    
    try {
      // Try OPTIONS request to see what headers the server returns
      const response = await fetch(`${cleanUrl}/version`, {
        method: 'OPTIONS',
      });
      
      const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
      const corsMethods = response.headers.get('Access-Control-Allow-Methods');
      const corsHeaders = response.headers.get('Access-Control-Allow-Headers');
      
      if (response.status === 405) {
        updateResult(3, { 
          status: 'warning', 
          message: 'OPTIONS returns 405', 
          details: `kubectl proxy doesn't handle OPTIONS. CORS Origin: ${corsOrigin || 'not set'}` 
        });
      } else if (corsOrigin) {
        updateResult(3, { 
          status: 'success', 
          message: 'CORS headers present', 
          details: `Origin: ${corsOrigin}, Methods: ${corsMethods || 'not set'}, Headers: ${corsHeaders || 'not set'}` 
        });
      } else {
        updateResult(3, { 
          status: 'warning', 
          message: 'No CORS headers in OPTIONS response', 
          details: `Status: ${response.status}` 
        });
      }
    } catch (e) {
      updateResult(3, { 
        status: 'error', 
        message: 'OPTIONS request failed', 
        details: e instanceof Error ? e.message : 'Unknown' 
      });
    }

    // Test 5: Validate K8s response
    updateResult(4, { status: 'running', message: 'Validating response...' });
    await new Promise(r => setTimeout(r, 200));
    
    if (simpleGetWorked || headerGetWorked) {
      if (simpleGetData && simpleGetData.gitVersion) {
        updateResult(4, { 
          status: 'success', 
          message: 'Valid Kubernetes API', 
          details: `Version: ${simpleGetData.gitVersion}, Platform: ${simpleGetData.platform || 'unknown'}` 
        });
      } else {
        updateResult(4, { 
          status: 'warning', 
          message: 'Response received but format unexpected', 
          details: JSON.stringify(simpleGetData).slice(0, 100) 
        });
      }
    } else {
      updateResult(4, { 
        status: 'error', 
        message: 'Could not validate', 
        details: 'No successful response received' 
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-600">Pass</Badge>;
      case 'error': return <Badge variant="destructive">Fail</Badge>;
      case 'warning': return <Badge className="bg-yellow-600">Warning</Badge>;
      case 'running': return <Badge variant="secondary">Running</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const anySuccess = results.some(r => r.status === 'success' && (r.name.includes('GET')));
  const needsCorsHeaders = results.some(r => 
    r.status === 'error' && r.name === 'GET with ngrok header'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Diagnostics</CardTitle>
        <CardDescription>
          Test connectivity to your Kubernetes cluster via ngrok
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-url">ngrok URL</Label>
          <div className="flex gap-2">
            <Input
              id="test-url"
              placeholder="https://xxxx.ngrok-free.app"
              value={ngrokUrl}
              onChange={(e) => setNgrokUrl(e.target.value)}
              disabled={isRunning}
            />
            <Button onClick={runDiagnostics} disabled={isRunning || !ngrokUrl}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Tests'
              )}
            </Button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 border rounded-lg p-4">
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 py-2 border-b last:border-0">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{result.name}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-muted-foreground/70 mt-1 break-all">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {anySuccess && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
            <h4 className="font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Connection Successful!
            </h4>
            <p className="text-sm text-muted-foreground">
              Your Kubernetes cluster is accessible. You can now use the Connect button above.
            </p>
          </div>
        )}

        {needsCorsHeaders && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
            <h4 className="font-medium text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              CORS Preflight Issue
            </h4>
            <p className="text-sm text-muted-foreground">
              The <code className="bg-muted px-1 rounded">ngrok-skip-browser-warning</code> header triggers 
              a CORS preflight. For this to work, ngrok needs to respond with:
            </p>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: ngrok-skip-browser-warning`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Try running ngrok with:
            </p>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`ngrok http 8001 \\
  --response-header-add="Access-Control-Allow-Origin:*" \\
  --response-header-add="Access-Control-Allow-Headers:*" \\
  --response-header-add="Access-Control-Allow-Methods:*"`}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
