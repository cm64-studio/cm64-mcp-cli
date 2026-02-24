# @cm64/mcp

**Connect Claude Code to CM64 Platform** -- Build and manage full-stack apps using AI agents.

## What is CM64?

[CM64](https://cm64.io) is a development platform that eliminates infrastructure complexity. AI agents (like Claude Code) can build complete applications -- backend, frontend, database, auth, and storage -- with simple tool calls.

This CLI connects Claude Code to the CM64 platform via the Model Context Protocol (MCP), giving AI agents access to 27 tools.

## What Can AI Agents Do?

Once connected, Claude Code can:

- **Write files that are instantly live** with `cm64_write_file()` or `cm64_write_files()` (bulk)
- **Read and search code** with `cm64_read_file()`, `cm64_grep()`, `cm64_glob()`
- **Create named snapshots** with `cm64_snapshot()` (save restore points)
- **Pin production** with `cm64_set_production()` (serve a specific snapshot)
- **Learn conventions** with `cm64_learn()` (on-demand skill docs)

**Zero infrastructure setup.** AI agents focus on building features, CM64 handles serving.

## How It Works

This CLI acts as a local bridge between Claude Code and CM64:

```
Claude Code (AI Agent, stdio)
    |
cm64-mcp CLI (this package, stdio-to-HTTP bridge)
    |
CM64 Platform (27 MCP tools, HTTP)
    |
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

### Global (via npm)

```bash
npm install -g @cm64/mcp
```

## Usage

### Command Line

```bash
cm64 --token cm64_pat_YOUR_TOKEN_HERE
```

### Environment Variable

```bash
export CM64_TOKEN=cm64_pat_YOUR_TOKEN_HERE
cm64
```

### Custom Endpoint (for local dev)

```bash
cm64 --token cm64_pat_abc123 --endpoint http://localhost:3044/api/mcp
```

## Claude Code Configuration

Edit your Claude Code MCP config:

```json
{
  "mcpServers": {
    "cm64": {
      "command": "cm64",
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
      "command": "cm64",
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
   - Go to Settings -> API Tokens
   - Click "Generate Token"
   - Name it "Claude Code"
   - Copy the token (starts with `cm64_pat_`)

## How It Works

1. **Startup**: CLI connects to CM64 HTTP endpoint, gets session ID
2. **Proxying**: Translates stdio messages from Claude Code -> HTTP requests to CM64
3. **Keepalive**: Sends ping every 5 minutes if idle to prevent session timeout
4. **Auto-Reconnect**: If HTTP session drops, automatically re-initializes and retries

## Debugging

The CLI logs to stderr (won't interfere with stdio MCP protocol):

```bash
[cm64] Connecting to https://build.cm64.io/api/mcp...
[cm64] Connected. Session: abc-123-def
[cm64] Sending keepalive ping...
[cm64] Session lost, reconnecting...
[cm64] Reconnected. New session: xyz-456-uvw
```

## Options

```
-t, --token <PAT>       CM64 Personal Access Token (required)
-e, --endpoint <url>    MCP endpoint (default: https://build.cm64.io/api/mcp)
-h, --help             Show help
```

## Environment Variables

- `CM64_TOKEN` -- Personal Access Token
- `CM64_ENDPOINT` -- Custom MCP endpoint URL

## Available CM64 Tools (27)

Once connected, Claude Code can use these tools:

### Project Management
| Tool | Purpose |
|------|---------|
| `cm64_list_projects` | List all projects you have access to |
| `cm64_set_project` | Switch active project (shows full context + production state) |
| `cm64_create_project` | Create a new project |
| `cm64_project_info` | Get project metadata and file counts |

### File Operations
| Tool | Purpose |
|------|---------|
| `cm64_read_file` | Read a file by path (e.g., "component/Header") |
| `cm64_write_file` | Write/create a single file (live immediately) |
| `cm64_write_files` | Bulk write multiple files in one call |
| `cm64_edit_file` | Edit a file by replacing text |
| `cm64_delete_file` | Delete a file |
| `cm64_list` | List files by class (page, component, function, css, etc.) |

### Search
| Tool | Purpose |
|------|---------|
| `cm64_glob` | Find files by glob pattern |
| `cm64_grep` | Search file contents by regex |

### Versioning & Snapshots
| Tool | Purpose |
|------|---------|
| `cm64_file_history` | View version history for a file |
| `cm64_restore_version` | Restore a file to a previous version |
| `cm64_checkpoint` | Save specific files for quick undo |
| `cm64_restore_checkpoint` | Restore files from a checkpoint |
| `cm64_snapshot` | Create a named snapshot of entire project state |
| `cm64_set_production` | Pin a snapshot to production (or unpin to serve latest) |

### Knowledge & Context
| Tool | Purpose |
|------|---------|
| `cm64_learn` | Read skill docs (JasonJS/CM64 conventions) |
| `cm64_skill_info` | Check skill sizes before loading |
| `cm64_get_system_prompt` | Get AI orchestrator system prompt |
| `cm64_get_buildme` | Read project BUILDME.md |
| `cm64_update_buildme` | Update project BUILDME.md |

### Diagnostics
| Tool | Purpose |
|------|---------|
| `cm64_debug` | Query execution logs |
| `cm64_diagnose` | Run diagnostics via JasonJS /.dev/ endpoint |

### App Data
| Tool | Purpose |
|------|---------|
| `cm64_users` | List/search app end-users (signups, active count, growth) |
| `cm64_analytics` | Product analytics: what your users are doing (events, trends, visitors) |

**Tip:** All tools that require a project accept an optional `project_id` parameter, so you can skip `cm64_set_project` if you already know the ID.

Run `cm64_learn({})` in Claude Code to see available skill documentation.

## Key Concept: Files Are Live

Files written via `cm64_write_file` are **live immediately**. There is no deploy step.

`cm64_snapshot` saves a named restore point (like a git tag). You can then pin it to production with `cm64_set_production` if you want to freeze what's served.

```javascript
// Write files -- they're live immediately
await cm64_write_file({ path: "page/home", content: "..." });

// Save a restore point
await cm64_snapshot({ name: "v1.0 - Initial launch" });

// Pin production to this snapshot (optional)
await cm64_set_production({ build: "<snapshot_id>" });

// Continue editing -- changes only affect unpinned domains
await cm64_write_file({ path: "page/home", content: "..." });

// Unpin to serve latest again
await cm64_set_production({ build: "latest" });
```

## Example: AI Agent Building an App

```javascript
// 1. Set project
await cm64_set_project({ project_id: "startup_123" });

// 2. Write files (live immediately)
await cm64_write_files({ files: [
  { path: "page/home", content: '{ "title": "My App" }' },
  { path: "component/Header", content: 'export default function Header() { ... }' },
  { path: "css/main", content: ':root { --primary: #3b82f6; }' }
]});

// 3. Save a snapshot when ready
await cm64_snapshot({ name: "v1.0" });

// Result: App is live at https://myapp.cm64.site
```

## Architecture

```
+-------------------------+
|  Claude Code            |
|  (AI Agent, stdio MCP)  |
+------------+------------+
             | stdin/stdout
             v
+-------------------------+
|  cm64-mcp CLI           |
|  (this package)         |
|  - Stdio <-> HTTP       |
|  - Auto-reconnection    |
|  - Keepalive pings      |
+------------+------------+
             | HTTPS + Bearer Token
             v
+-------------------------+
|  CM64 Platform          |
|  - 27 MCP Tools         |
|  - Auth & Rate Limits   |
|  - Multi-tenant         |
+------------+------------+
             |
             v
+-------------------------+
|  Your Live App          |
|  - Web + Mobile         |
|  - Backend + Database   |
|  - Auth + File Storage  |
+-------------------------+
```

See [AGENTS.md](./AGENTS.md) for AI agent best practices.

## License

MIT
