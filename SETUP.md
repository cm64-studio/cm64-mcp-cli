# Quick Setup Guide

## 1. Install the CLI

```bash
cd packages/cm64-mcp-cli
npm install
npm link
```

Verify installation:
```bash
cm64-mcp --help
```

## 2. Generate an Access Token

```bash
cd ../../startup-studio
node scripts/generate-token.js your.email@example.com "Claude Code CLI"
```

Copy the token that starts with `cm64_pat_`

## 3. Configure Claude Code

Open your Claude Code MCP configuration file and add:

```json
{
  "mcpServers": {
    "cm64": {
      "command": "cm64-mcp",
      "args": ["--token", "YOUR_TOKEN_HERE"]
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with your actual token.

## 4. Test the Connection

Restart Claude Code, then try:

```
/mcp cm64
```

You should see the CM64 MCP server connect successfully!

## 5. Start Using CM64 Tools

```
cm64_list_projects()
cm64_set_project({ project_id: "..." })
cm64_list({ class: "page" })
cm64_read_file({ path: "page/home" })
```

## Troubleshooting

### "Command not found: cm64-mcp"

Run `npm link` again from the `packages/cm64-mcp-cli` directory.

### "Error: --token required"

Make sure you're passing the token in the Claude Code config or set it as an env var:

```json
{
  "mcpServers": {
    "cm64": {
      "command": "cm64-mcp",
      "env": {
        "CM64_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### "Connection failed"

Check that:
1. Your token is valid (not revoked)
2. The endpoint is accessible: https://build.cm64.io/api/mcp
3. You have internet connectivity

### Session keeps dropping

This is exactly what the CLI solves! If you still see issues, check the stderr logs:

```bash
# The CLI logs to stderr, which Claude Code should show in the MCP server logs
[cm64-mcp] Session lost, reconnecting...
[cm64-mcp] Reconnected. New session: xyz-456
```

## Development Setup (Local Testing)

Point to your local dev server:

```json
{
  "mcpServers": {
    "cm64-local": {
      "command": "cm64-mcp",
      "args": [
        "--token", "YOUR_TOKEN_HERE",
        "--endpoint", "http://localhost:3044/api/mcp"
      ]
    }
  }
}
```

## Next Steps

- Read the [README.md](./README.md) for full documentation
- Check out the [CM64 MCP Tools](../../startup-studio/lib/mcp/tools.js) source
- Browse available skills: `cm64_learn({})`
