/**
 * MCP Tools Types
 * Types for interacting with MCP server tools API
 */

// Tool parameter schema (JSON Schema format)
export interface MCPToolParameter {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: MCPToolParameter;
  properties?: Record<string, MCPToolParameter>;
  required?: string[];
}

// Tool definition returned from GET /mcp/tools
export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, MCPToolParameter>;
    required?: string[];
  };
}

// Result from POST /mcp/tools
export interface MCPToolCallResult {
  result?: unknown;
  error?: string;
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

// Tool call request
export interface MCPToolCallRequest {
  name: string;
  args: Record<string, unknown>;
}
