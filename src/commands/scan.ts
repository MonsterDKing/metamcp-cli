import chalk from 'chalk';
import { ALL_CLIENTS } from '../clients/detector.js';
import { loadConfig, saveConfig, type MetaMCPConfig } from '../config/store.js';

export async function scanCommand(): Promise<void> {
  console.log(chalk.bold('\n🔍 Scanning for MCP clients...\n'));

  const results: { name: string; slug: string; status: string; path: string; configured: string }[] = [];

  for (const client of ALL_CLIENTS) {
    const installed = client.isInstalled();
    const configPath = client.getConfigPath();
    const hasEntry = installed && client.hasMetaMCPEntry();

    results.push({
      name: client.name,
      slug: client.slug,
      status: installed ? chalk.green('Found') : chalk.dim('Not found'),
      path: configPath ?? '-',
      configured: hasEntry ? chalk.green('Yes') : chalk.dim('No'),
    });
  }

  // Print table
  const nameWidth = 16;
  const statusWidth = 14;
  const configuredWidth = 14;

  console.log(
    chalk.bold(
      'Client'.padEnd(nameWidth) +
      'Status'.padEnd(statusWidth) +
      'MetaMCP'.padEnd(configuredWidth) +
      'Config Path'
    )
  );
  console.log('─'.repeat(80));

  for (const r of results) {
    console.log(
      r.name.padEnd(nameWidth) +
      r.status.padEnd(statusWidth + 10) + // extra for chalk escape codes
      r.configured.padEnd(configuredWidth + 10) +
      chalk.dim(r.path)
    );
  }

  // Cache detected clients in config
  const config = loadConfig();
  if (config) {
    config.detectedClients = {};
    for (const client of ALL_CLIENTS) {
      const p = client.getConfigPath();
      config.detectedClients[client.slug] = {
        configPath: p ?? '',
        detected: client.isInstalled(),
      };
    }
    saveConfig(config);
  }

  const found = ALL_CLIENTS.filter((c) => c.isInstalled()).length;
  console.log(chalk.dim(`\n${found} client(s) detected.\n`));
}
