# @cm64/mcp

CM64 MCP stdio-to-HTTP bridge CLI — solves session persistence issues with HTTP MCP connections.

## Problem

Claude Code connects to MCP servers via stdio. CM64's MCP server runs as an HTTP endpoint. Direct HTTP connections from Claude Code are unreliable due to:

- Cloudflare/proxy timeouts killing idle connections
- Session state getting cleaned up server-side while client still has session ID
- No automatic reconnection in Claude Code's HTTP transport

## Solution

This CLI acts as a local bridge:

```
Claude Code (stdio) ←→ cm64-mcp CLI (stdio-to-HTTP bridge) ←→ CM64 MCP Server (HTTP)
```

**Features:**
- Automatic reconnection when HTTP session drops
- Keepalive pings to prevent idle timeouts
- Transparent stdio interface for Claude Code
- Session recovery without user intervention

## Installation

### Local (from monorepo)

```bash
cd packages/cm64-mcp-cli
npm install
npm link
```

### Global (via npm - future)

```bash
npm install -g @cm64/mcp
```

## Usage

### Command Line

```bash
cm64-mcp --token cm64_pat_YOUR_TOKEN_HERE
```

### Environment Variable

```bash
export CM64_TOKEN=cm64_pat_YOUR_TOKEN_HERE
cm64-mcp
```

### Custom Endpoint (for local dev)

```bash
cm64-mcp --token cm64_pat_abc123 --endpoint http://localhost:3044/api/mcp
```

## Claude Code Configuration

Edit your Claude Code MCP config:

```json
{
  "mcpServers": {
    "cm64": {
      "command": "cm64-mcp",
      "args": ["--token", "cm64_pat_YOUR_TOKEN_HERE"]
    }
  }
}
```

Or use environment variables:

```json
{
  "mcpServers": {
    "cm64": {
      "command": "cm64-mcp",
      "env": {
        "CM64_TOKEN": "cm64_pat_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

## Generating a Token

1. Go to https://build.cm64.io/settings/tokens (future UI)
2. Or run the token generation script:

```bash
cd startup-studio
node scripts/generate-token.js your.email@example.com "Claude Code" startup_id_1,startup_id_2
```

## How It Works

1. **Startup**: CLI connects to CM64 HTTP endpoint, gets session ID
2. **Proxying**: Translates stdio messages from Claude Code → HTTP requests to CM64
3. **Keepalive**: Sends ping every 5 minutes if idle to prevent session timeout
4. **Auto-Reconnect**: If HTTP session drops, automatically re-initializes and retries

## Debugging

The CLI logs to stderr (won't interfere with stdio MCP protocol):

```bash
[cm64-mcp] Connecting to https://build.cm64.io/api/mcp...
[cm64-mcp] Connected. Session: abc-123-def
[cm64-mcp] Sending keepalive ping...
[cm64-mcp] Session lost, reconnecting...
[cm64-mcp] Reconnected. New session: xyz-456-uvw
```

## Options

```
-t, --token <PAT>       CM64 Personal Access Token (required)
-e, --endpoint <url>    MCP endpoint (default: https://build.cm64.io/api/mcp)
-h, --help             Show help
```

## Environment Variables

- `CM64_TOKEN` — Personal Access Token
- `CM64_ENDPOINT` — Custom MCP endpoint URL

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│   (stdio MCP)   │
└────────┬────────┘
         │ stdin/stdout
         ↓
┌─────────────────┐
│  cm64-mcp CLI   │
│  (this package) │
│                 │
│  • Stdio ←→ HTTP│
│  • Reconnection │
│  • Keepalive    │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│ CM64 MCP Server │
│ (Next.js API)   │
│                 │
│ • Auth & Rate   │
│ • 24 Tools      │
│ • 3 Resources   │
└─────────────────┘
```

## License

MIT
