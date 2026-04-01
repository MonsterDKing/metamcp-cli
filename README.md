# metamcp-cli

CLI wrapper for [MetaMCP](https://github.com/metatool-ai/metamcp) — auto-detect your IDEs and configure them to use your MetaMCP instance in seconds.

## Install

```bash
npm install -g metamcp-cli
```

> Requires Node.js >= 18 and [uv](https://docs.astral.sh/uv/) (`uvx` must be available for Claude Code / Claude Desktop).

## Quick Start

```bash
# Interactive wizard — does everything in one step
metamcp-cli setup
```

Or step by step:

```bash
# 1. Connect to your MetaMCP instance
metamcp-cli init

# 2. See what IDEs you have installed
metamcp-cli scan

# 3. List available endpoints
metamcp-cli endpoints

# 4. Configure your IDEs to use an endpoint
metamcp-cli use my-endpoint
```

## Commands

| Command | Description |
|---------|-------------|
| `setup` | Interactive wizard: connect, pick endpoint, configure IDEs |
| `init` | Configure MetaMCP instance URL and API key |
| `scan` | Detect installed MCP clients (IDEs) |
| `endpoints` | List available MetaMCP endpoints |
| `namespaces` | List namespaces (requires session auth) |
| `use <endpoint>` | Configure detected clients to use a MetaMCP endpoint |
| `status` | Show current configuration and connection status |

## Supported Clients

| Client | Config Location | Transport |
|--------|----------------|-----------|
| Claude Code | `.mcp.json` (project dir) | `uvx mcp-proxy` (streamable HTTP) |
| VS Code | `.vscode/mcp.json` (project dir) | SSE |
| Claude Desktop | Global config | `uvx mcp-proxy` (streamable HTTP) |
| Cursor | `~/.cursor/mcp.json` | SSE |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | SSE |
| Cline | VS Code extension settings | `npx mcp-remote` |

## Example

```bash
$ metamcp-cli setup

⚡ MetaMCP Quick Setup

? MetaMCP instance URL: https://metamcp.example.com
? API Key: ****
✔ Connected to MetaMCP

? Select endpoint to use:
  > my-workspace (production) — Production tools
    dev-tools (development) — Dev and testing

? Select clients to configure:
  [x] Claude Code
  [x] Cursor

✔ Claude Code configured
✔ Cursor configured

✓ Setup complete!
  Instance:  https://metamcp.example.com
  Endpoint:  my-workspace
  Clients:   Claude Code, Cursor
```

## Generated Configs

**Claude Code / Claude Desktop** (`.mcp.json`):
```json
{
  "mcpServers": {
    "metamcp": {
      "command": "uvx",
      "args": [
        "mcp-proxy",
        "--transport",
        "streamablehttp",
        "https://metamcp.example.com/metamcp/my-endpoint/mcp"
      ],
      "env": {
        "API_ACCESS_TOKEN": "sk_mt_your_api_key_here"
      }
    }
  }
}
```

**Cursor / VS Code** (SSE):
```json
{
  "mcpServers": {
    "metamcp": {
      "url": "https://metamcp.example.com/metamcp/my-endpoint/sse",
      "headers": {
        "Authorization": "Bearer sk_mt_your_api_key_here"
      }
    }
  }
}
```

## Options

```
metamcp-cli use <endpoint> --client cursor    # Only configure Cursor
metamcp-cli use <endpoint> --force            # Overwrite without asking
metamcp-cli init --insecure                   # Allow self-signed certs
```

## Prerequisites

- A running [MetaMCP](https://github.com/metatool-ai/metamcp) instance
- An API key generated in the MetaMCP dashboard
- `uvx` (from [uv](https://docs.astral.sh/uv/)) for Claude Code / Claude Desktop
- `npx` for Cline

## How It Works

1. Connects to your MetaMCP instance via its public API
2. Auto-detects which MCP-compatible IDEs are installed on your system
3. Writes the correct MCP server configuration to each client's config file
4. Creates backups (`.metamcp-backup`) before modifying any existing config

## Security

- Config stored at `~/.metamcp-cli/config.json` with `0600` permissions
- API keys are never logged to stdout
- Automatic backup before modifying IDE configs
- API key input is masked during entry

## License

MIT
