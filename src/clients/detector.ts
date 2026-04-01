import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

export interface EndpointConfig {
  baseUrl: string;
  endpointName: string;
  apiKey?: string;
}

export interface MCPClient {
  name: string;
  slug: string;
  getConfigPath(): string | null;
  isInstalled(): boolean;
  hasMetaMCPEntry(): boolean;
  writeMetaMCPEntry(config: EndpointConfig): void;
  removeMetaMCPEntry(): void;
}

function getGlobalConfigPath(
  macPath: string,
  winPath: string,
  linuxPath: string
): string | null {
  const home = os.homedir();
  const platform = process.platform;

  let configPath: string;
  if (platform === 'darwin') {
    configPath = path.join(home, macPath);
  } else if (platform === 'win32') {
    configPath = path.join(home, winPath);
  } else {
    configPath = path.join(home, linuxPath);
  }

  return fs.existsSync(configPath) || fs.existsSync(path.dirname(configPath))
    ? configPath
    : null;
}

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function safeWriteMcpConfig(
  configPath: string,
  serverKey: string,
  serverConfig: Record<string, unknown>
): void {
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, configPath + '.metamcp-backup');
    existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  if (!existing['mcpServers'] || typeof existing['mcpServers'] !== 'object') {
    existing['mcpServers'] = {};
  }

  (existing['mcpServers'] as Record<string, unknown>)[serverKey] = serverConfig;

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));
}

function hasMcpEntry(configPath: string, key: string): boolean {
  const data = readJsonSafe(configPath);
  if (!data) return false;
  const servers = data['mcpServers'] as Record<string, unknown> | undefined;
  return !!servers && key in servers;
}

function removeMcpEntry(configPath: string, key: string): void {
  if (!fs.existsSync(configPath)) return;
  const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (data.mcpServers && key in data.mcpServers) {
    fs.copyFileSync(configPath, configPath + '.metamcp-backup');
    delete data.mcpServers[key];
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  }
}

function buildSseConfig(config: EndpointConfig): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    url: `${config.baseUrl}/metamcp/${config.endpointName}/sse`,
  };
  if (config.apiKey) {
    entry['headers'] = { Authorization: `Bearer ${config.apiKey}` };
  }
  return entry;
}

function buildMcpProxyConfig(config: EndpointConfig): Record<string, unknown> {
  const url = `${config.baseUrl}/metamcp/${config.endpointName}/mcp`;
  const env: Record<string, string> = {};
  if (config.apiKey) {
    env['API_ACCESS_TOKEN'] = config.apiKey;
  }
  return {
    command: 'uvx',
    args: ['mcp-proxy', '--transport', 'streamablehttp', url],
    env,
  };
}

function buildStdioBridgeConfig(config: EndpointConfig): Record<string, unknown> {
  const url = `${config.baseUrl}/metamcp/${config.endpointName}/mcp`;
  const args = ['-y', 'mcp-remote', url];
  if (config.apiKey) {
    args.push('--header', `Authorization:Bearer ${config.apiKey}`);
  }
  return { command: 'npx', args };
}

const MCP_KEY = 'metamcp';

function hasBinary(name: string): boolean {
  try {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    execFileSync(cmd, [name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// --- Client implementations ---

function createClaudeDesktop(): MCPClient {
  const slug = 'claude-desktop';
  const name = 'Claude Desktop';

  const getPath = () =>
    getGlobalConfigPath(
      'Library/Application Support/Claude/claude_desktop_config.json',
      'AppData/Roaming/Claude/claude_desktop_config.json',
      '.config/Claude/claude_desktop_config.json'
    );

  return {
    name,
    slug,
    getConfigPath: getPath,
    isInstalled: () => getPath() !== null,
    hasMetaMCPEntry: () => {
      const p = getPath();
      return p ? hasMcpEntry(p, MCP_KEY) : false;
    },
    writeMetaMCPEntry: (config) => {
      const p = getPath();
      if (!p) throw new Error(`${name} config path not found`);
      safeWriteMcpConfig(p, MCP_KEY, buildMcpProxyConfig(config));
    },
    removeMetaMCPEntry: () => {
      const p = getPath();
      if (p) removeMcpEntry(p, MCP_KEY);
    },
  };
}

function createCursor(): MCPClient {
  const slug = 'cursor';
  const name = 'Cursor';

  const getPath = () =>
    getGlobalConfigPath(
      '.cursor/mcp.json',
      '.cursor/mcp.json',
      '.cursor/mcp.json'
    );

  return {
    name,
    slug,
    getConfigPath: getPath,
    isInstalled: () => getPath() !== null,
    hasMetaMCPEntry: () => {
      const p = getPath();
      return p ? hasMcpEntry(p, MCP_KEY) : false;
    },
    writeMetaMCPEntry: (config) => {
      const p = getPath();
      if (!p) throw new Error(`${name} config path not found`);
      safeWriteMcpConfig(p, MCP_KEY, buildSseConfig(config));
    },
    removeMetaMCPEntry: () => {
      const p = getPath();
      if (p) removeMcpEntry(p, MCP_KEY);
    },
  };
}

function createWindsurf(): MCPClient {
  const slug = 'windsurf';
  const name = 'Windsurf';

  const getPath = () =>
    getGlobalConfigPath(
      '.codeium/windsurf/mcp_config.json',
      '.codeium/windsurf/mcp_config.json',
      '.codeium/windsurf/mcp_config.json'
    );

  return {
    name,
    slug,
    getConfigPath: getPath,
    isInstalled: () => getPath() !== null,
    hasMetaMCPEntry: () => {
      const p = getPath();
      return p ? hasMcpEntry(p, MCP_KEY) : false;
    },
    writeMetaMCPEntry: (config) => {
      const p = getPath();
      if (!p) throw new Error(`${name} config path not found`);
      const entry: Record<string, unknown> = {
        serverUrl: `${config.baseUrl}/metamcp/${config.endpointName}/sse`,
      };
      safeWriteMcpConfig(p, MCP_KEY, entry);
    },
    removeMetaMCPEntry: () => {
      const p = getPath();
      if (p) removeMcpEntry(p, MCP_KEY);
    },
  };
}

function createCline(): MCPClient {
  const slug = 'cline';
  const name = 'Cline';

  const getPath = () =>
    getGlobalConfigPath(
      'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      'AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json'
    );

  return {
    name,
    slug,
    getConfigPath: getPath,
    isInstalled: () => getPath() !== null,
    hasMetaMCPEntry: () => {
      const p = getPath();
      return p ? hasMcpEntry(p, MCP_KEY) : false;
    },
    writeMetaMCPEntry: (config) => {
      const p = getPath();
      if (!p) throw new Error(`${name} config path not found`);
      safeWriteMcpConfig(p, MCP_KEY, buildStdioBridgeConfig(config));
    },
    removeMetaMCPEntry: () => {
      const p = getPath();
      if (p) removeMcpEntry(p, MCP_KEY);
    },
  };
}

function createClaudeCode(): MCPClient {
  const slug = 'claude-code';
  const name = 'Claude Code';

  const getPath = () => path.join(process.cwd(), '.mcp.json');

  return {
    name,
    slug,
    getConfigPath: getPath,
    isInstalled: () => hasBinary('claude'),
    hasMetaMCPEntry: () => hasMcpEntry(getPath(), MCP_KEY),
    writeMetaMCPEntry: (config) => {
      safeWriteMcpConfig(getPath(), MCP_KEY, buildMcpProxyConfig(config));
    },
    removeMetaMCPEntry: () => removeMcpEntry(getPath(), MCP_KEY),
  };
}

function createVSCode(): MCPClient {
  const slug = 'vscode';
  const name = 'VS Code';

  const getPath = () => path.join(process.cwd(), '.vscode', 'mcp.json');

  return {
    name,
    slug,
    getConfigPath: getPath,
    isInstalled: () => hasBinary('code'),
    hasMetaMCPEntry: () => hasMcpEntry(getPath(), MCP_KEY),
    writeMetaMCPEntry: (config) => {
      safeWriteMcpConfig(getPath(), MCP_KEY, buildSseConfig(config));
    },
    removeMetaMCPEntry: () => removeMcpEntry(getPath(), MCP_KEY),
  };
}

export const ALL_CLIENTS: MCPClient[] = [
  createClaudeCode(),
  createVSCode(),
  createClaudeDesktop(),
  createCursor(),
  createWindsurf(),
  createCline(),
];

export function detectClients(): MCPClient[] {
  return ALL_CLIENTS.filter((c) => c.isInstalled());
}

export function getClientBySlug(slug: string): MCPClient | undefined {
  return ALL_CLIENTS.find((c) => c.slug === slug);
}
