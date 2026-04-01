import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface DetectedClient {
  configPath: string;
  detected: boolean;
}

export interface MetaMCPConfig {
  version: 1;
  instance: {
    url: string;
    apiKey?: string;
    sessionCookie?: string;
    proxyHeaders?: Record<string, string>;
  };
  activeEndpoint?: string;
  detectedClients?: Record<string, DetectedClient>;
}

const CONFIG_DIR = path.join(os.homedir(), '.metamcp-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): MetaMCPConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as MetaMCPConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: MetaMCPConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

export function getConfigOrThrow(): MetaMCPConfig {
  const config = loadConfig();
  if (!config) {
    throw new Error(
      'MetaMCP CLI is not initialized. Run `metamcp-cli init` first.'
    );
  }
  return config;
}
