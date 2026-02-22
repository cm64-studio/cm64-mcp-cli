# @cm64/mcp

**Connect Claude Code to CM64 Platform** — Deploy full-stack apps in 60 seconds using AI agents.

## What is CM64?

[CM64](https://cm64.io) is a deployment platform that eliminates infrastructure complexity. AI agents (like Claude Code) can deploy complete applications—backend, frontend, database, auth, and storage—with a single command.

This CLI connects Claude Code to the CM64 platform via the Model Context Protocol (MCP), giving AI agents access to 24 deployment tools.

## What Can AI Agents Do?

Once connected, Claude Code can:

- 🚀 **Deploy apps in 60 seconds** with `cm64_deploy()`
- 📝 **Edit pages and auto-deploy** with `cm64_write_file()`
- 🔍 **Read app configuration** with `cm64_read_file()`
- 📋 **List all files/pages** with `cm64_list()`
- 🎨 **Manage components** with `cm64_write_component()`

**Zero infrastructure setup.** AI agents focus on building features, CM64 handles deployment.

## How It Works

This CLI acts as a local bridge between Claude Code and CM64:

```
Claude Code (AI Agent, stdio)
    ↓
cm64-mcp CLI (this package, stdio-to-HTTP bridge)
    ↓
CM64 Platform (24 MCP tools, HTTP)
    ↓
Your Live App (web + mobile)
```

**Technical Features:**
- Automatic reconnection when HTTP sessions drop
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

1. **Create a CM64 account** at https://build.cm64.io
2. **Create a project** (your startup/app)
3. **Generate a Personal Access Token**:
   - Go to Settings → API Tokens
   - Click "Generate Token"
   - Name it "Claude Code"
   - Copy the token (starts with `cm64_pat_`)

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

## Available CM64 Tools

Once connected, Claude Code can use these tools:

| Tool | Purpose |
|------|---------|
| `cm64_deploy()` | Deploy app from GitHub repo |
| `cm64_write_file()` | Create/update pages (auto-deploys) |
| `cm64_read_file()` | Read file content |
| `cm64_list()` | List pages/components |
| `cm64_write_component()` | Create/update components |
| `cm64_set_project()` | Switch active project |
| `cm64_learn()` | See all 24 available tools |

Run `cm64_learn({})` in Claude Code to see the complete list.

## Example: AI Agent Deploying an App

```javascript
// AI agent in Claude Code can do this:
await cm64_set_project({ project_id: "startup_123" });

await cm64_deploy({
  repo_url: "https://github.com/user/todo-app",
  branch: "main"
});

// Result:
// ✓ Live at: https://todo.cm64.io
// ✓ Platforms: web, iOS, Android
// ✓ Time: 60 seconds
```

## Architecture

```
┌─────────────────────────┐
│  Claude Code            │
│  (AI Agent, stdio MCP)  │
└────────────┬────────────┘
             │ stdin/stdout
             ↓
┌─────────────────────────┐
│  cm64-mcp CLI           │
│  (this package)         │
│  • Stdio ←→ HTTP        │
│  • Auto-reconnection    │
│  • Keepalive pings      │
└────────────┬────────────┘
             │ HTTPS + Bearer Token
             ↓
┌─────────────────────────┐
│  CM64 Platform          │
│  • 24 Deployment Tools  │
│  • Auth & Rate Limits   │
│  • Multi-tenant         │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  Your Live App          │
│  • Web + iOS + Android  │
│  • Backend + Database   │
│  • Auth + File Storage  │
└─────────────────────────┘
```

## Why CM64 for AI Agents?

**Traditional approach** (2-4 hours):
1. Ask user to create Vercel account
2. Ask user to create Supabase account
3. Configure environment variables
4. Set up authentication
5. Deploy frontend separately
6. Deploy backend separately
7. Debug CORS issues
8. User exhausted ❌

**CM64 approach** (60 seconds):
```javascript
await cm64_deploy({ repo_url: "...", branch: "main" });
```
User has live app ✅

See [AGENTS.md](./AGENTS.md) for AI agent best practices.

## License

MIT
