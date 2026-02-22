#!/usr/bin/env node
// @cm64/mcp CLI — stdio-to-HTTP bridge for CM64 MCP Server
// Usage: cm64 --token <PAT> [--endpoint <url>]

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fetch from 'node-fetch';

const args = process.argv.slice(2);

function parseArgs() {
  const config = {
    token: null,
    endpoint: 'https://build.cm64.io/api/mcp',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--token' || arg === '-t') {
      config.token = args[++i];
    } else if (arg === '--endpoint' || arg === '-e') {
      config.endpoint = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      config.help = true;
    }
  }

  return config;
}

function showHelp() {
  console.error(`
CM64 MCP CLI - stdio-to-HTTP bridge

Usage:
  cm64 --token <PAT> [--endpoint <url>]

Options:
  -t, --token <PAT>       CM64 Personal Access Token (required)
  -e, --endpoint <url>    MCP endpoint (default: https://build.cm64.io/api/mcp)
  -h, --help             Show this help

Environment Variables:
  CM64_TOKEN              Personal Access Token (alternative to --token)
  CM64_ENDPOINT           MCP endpoint URL (alternative to --endpoint)

Examples:
  # Using command line args
  cm64 --token cm64_pat_abc123

  # Using environment variables
  export CM64_TOKEN=cm64_pat_abc123
  cm64

Claude Code Configuration:
  {
    "mcpServers": {
      "cm64": {
        "command": "cm64",
        "args": ["--token", "cm64_pat_abc123"]
      }
    }
  }

Generate a token at: https://build.cm64.io/settings/tokens
`);
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  // Get token from args or env
  const token = config.token || process.env.CM64_TOKEN;
  const endpoint = config.endpoint || process.env.CM64_ENDPOINT || 'https://build.cm64.io/api/mcp';

  if (!token) {
    console.error('Error: --token required or set CM64_TOKEN environment variable');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  console.error(`[cm64] Connecting to ${endpoint}...`);

  // Create HTTP-to-MCP bridge
  const bridge = new HTTPMCPBridge(endpoint, token);

  try {
    await bridge.start();
  } catch (error) {
    console.error(`[cm64] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * HTTP-to-stdio MCP bridge with automatic reconnection
 */
class HTTPMCPBridge {
  constructor(endpoint, token) {
    this.endpoint = endpoint;
    this.token = token;
    this.sessionId = null;
    this.lastActivity = Date.now();
    this.reconnecting = false;
    this.transport = null;
    this.keepaliveInterval = null;
  }

  async start() {
    // Create stdio transport for Claude Code
    this.transport = new StdioServerTransport();

    // Handle incoming messages from Claude Code (via stdio)
    this.transport.onmessage = async (message) => {
      try {
        const response = await this.sendToHTTP(message);
        this.transport.send(response);
      } catch (error) {
        console.error('[cm64] Error handling message:', error.message);
        this.transport.send({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: error.message
          },
          id: message.id || null
        });
      }
    };

    this.transport.onclose = async () => {
      console.error('[cm64] Stdio transport closed');
      await this.disconnect();
      process.exit(0);
    };

    this.transport.onerror = (error) => {
      console.error('[cm64] Stdio error:', error);
    };

    // Start stdio transport
    await this.transport.start();
    console.error('[cm64] Bridge started, waiting for initialize...');
  }

  async sendToHTTP(message) {
    this.lastActivity = Date.now();

    // If this is the initialize request, connect to HTTP endpoint
    if (message.method === 'initialize' && !this.sessionId) {
      return await this.connect(message);
    }

    try {
      return await this.request(message);
    } catch (error) {
      // If session dropped, reconnect and retry
      if (error.message.includes('Server not initialized') ||
          error.message.includes('Session not found') ||
          error.message.includes('Bad Request')) {
        console.error('[cm64] Session lost, reconnecting...');
        await this.reconnect();
        return await this.request(message);
      }
      throw error;
    }
  }

  async connect(initMessage) {
    try {
      const response = await this.request(initMessage);

      if (response.error) {
        throw new Error(`Initialize failed: ${response.error.message}`);
      }

      console.error(`[cm64] Connected. Session: ${this.sessionId}`);

      // Start keepalive
      this.startKeepalive();

      return response;
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.sessionId) {
      try {
        await fetch(this.endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'mcp-session-id': this.sessionId
          }
        });
      } catch (error) {
        console.error('[cm64] Disconnect error:', error.message);
      }
    }
  }

  async request(payload) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };

    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    // Extract session ID from response headers
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId && !this.sessionId) {
      this.sessionId = newSessionId;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data;
  }

  async reconnect() {
    if (this.reconnecting) {
      // Wait for ongoing reconnection
      while (this.reconnecting) {
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }

    this.reconnecting = true;
    const oldSessionId = this.sessionId;
    this.sessionId = null;

    try {
      console.error('[cm64] Reconnecting...');

      // Send new initialize
      const initResponse = await this.request({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'cm64-cli',
            version: '1.0.0'
          }
        },
        id: `reconnect-${Date.now()}`
      });

      if (initResponse.error) {
        throw new Error(`Reconnect failed: ${initResponse.error.message}`);
      }

      console.error(`[cm64] Reconnected. New session: ${this.sessionId}`);
    } catch (error) {
      console.error(`[cm64] Reconnect failed: ${error.message}`);
      throw error;
    } finally {
      this.reconnecting = false;
    }
  }

  startKeepalive() {
    // Send ping every 5 minutes to keep session alive
    this.keepaliveInterval = setInterval(async () => {
      const idleSec = Math.floor((Date.now() - this.lastActivity) / 1000);

      // Only ping if idle for more than 4 minutes
      if (idleSec > 240) {
        try {
          console.error('[cm64] Sending keepalive ping...');
          await this.request({
            jsonrpc: '2.0',
            method: 'ping',
            id: `ping-${Date.now()}`
          });
        } catch (error) {
          console.error(`[cm64] Keepalive failed, will reconnect on next request`);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

main().catch((error) => {
  console.error('[cm64] Fatal error:', error);
  process.exit(1);
});
