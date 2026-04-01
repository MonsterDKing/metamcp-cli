import { input, select, password, checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { MetaMCPClient } from '../api/metamcp.js';
import { loadConfig, saveConfig, type MetaMCPConfig } from '../config/store.js';
import { clientFromConfig } from '../api/client-from-config.js';
import {
  detectClients,
  getClientBySlug,
  type EndpointConfig,
  type MCPClient,
} from '../clients/detector.js';

export async function setupCommand(options: { insecure?: boolean }): Promise<void> {
  console.log(chalk.bold('\n⚡ MetaMCP Quick Setup\n'));

  if (options.insecure) {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  }

  // Step 1: Get or create config
  let config = loadConfig();
  let apiClient: MetaMCPClient;

  if (config) {
    console.log(chalk.dim(`Using existing config: ${config.instance.url}`));
    apiClient = clientFromConfig(config);

    const healthy = await apiClient.healthCheck();
    if (!healthy) {
      console.log(chalk.yellow('Cannot connect to saved instance. Let\'s reconfigure.\n'));
      config = null;
    }
  }

  if (!config) {
    const url = await input({
      message: 'MetaMCP instance URL:',
      default: 'http://localhost:12008',
      validate: (val) => {
        try { new URL(val); return true; } catch { return 'Please enter a valid URL'; }
      },
    });

    const baseUrl = url.replace(/\/+$/, '');

    const apiKey = await password({
      message: 'API Key:',
      mask: '*',
    });

    const spinner = ora('Connecting...').start();
    apiClient = new MetaMCPClient(baseUrl, apiKey);
    const healthy = await apiClient.healthCheck();

    if (!healthy) {
      spinner.fail('Could not connect. Check URL and API key.');
      process.exit(1);
    }
    spinner.succeed('Connected to MetaMCP');

    config = {
      version: 1,
      instance: { url: baseUrl, apiKey },
    };
    saveConfig(config);
  }

  // Step 2: Fetch and select endpoint
  const spinner = ora('Fetching endpoints...').start();
  let endpoints;
  try {
    endpoints = await apiClient!.listPublicEndpoints();
  } catch (err) {
    spinner.fail(`Failed to fetch endpoints: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  spinner.stop();

  if (endpoints.length === 0) {
    console.log(chalk.yellow('\nNo endpoints found. Create one in the MetaMCP dashboard first.\n'));
    process.exit(1);
  }

  const selectedEndpoint = await select({
    message: 'Select endpoint to use:',
    choices: endpoints.map((ep) => ({
      name: `${ep.name}${ep.namespace ? chalk.dim(` (${ep.namespace})`) : ''}${ep.description ? chalk.dim(` — ${ep.description}`) : ''}`,
      value: ep.name,
    })),
  });

  // Step 3: Detect and select clients
  const detected = detectClients();

  if (detected.length === 0) {
    console.log(chalk.yellow('\nNo MCP clients detected on this system.'));
    console.log(chalk.dim('Supported: Claude Desktop, Cursor, Windsurf, Cline, Claude Code\n'));
    // Still save the endpoint selection
    config.activeEndpoint = selectedEndpoint;
    saveConfig(config);
    process.exit(1);
  }

  const selectedClients = await checkbox({
    message: 'Select clients to configure:',
    choices: detected.map((c) => ({
      name: `${c.name}${c.hasMetaMCPEntry() ? chalk.dim(' (already configured)') : ''}`,
      value: c.slug,
      checked: true,
    })),
  });

  if (selectedClients.length === 0) {
    console.log(chalk.yellow('No clients selected.'));
    config.activeEndpoint = selectedEndpoint;
    saveConfig(config);
    return;
  }

  const targets = selectedClients
    .map((slug) => getClientBySlug(slug))
    .filter((c): c is MCPClient => c !== undefined);

  // Step 4: Configure clients
  const endpointConfig: EndpointConfig = {
    baseUrl: config.instance.url,
    endpointName: selectedEndpoint,
    apiKey: config.instance.apiKey,
  };

  console.log();
  for (const client of targets) {
    const hasExisting = client.hasMetaMCPEntry();

    if (hasExisting) {
      const overwrite = await confirm({
        message: `${client.name} already configured. Overwrite?`,
        default: true,
      });
      if (!overwrite) {
        console.log(chalk.dim(`  Skipped ${client.name}`));
        continue;
      }
    }

    try {
      const s = ora(`Configuring ${client.name}...`).start();
      client.writeMetaMCPEntry(endpointConfig);
      s.succeed(`${client.name} configured`);
    } catch (err) {
      console.log(
        chalk.red(`  Failed: ${client.name} — ${err instanceof Error ? err.message : String(err)}`)
      );
    }
  }

  // Step 5: Save and show summary
  config.activeEndpoint = selectedEndpoint;
  saveConfig(config);

  console.log(chalk.green(`\n✓ Setup complete!`));
  console.log(chalk.dim(`  Instance:  ${config.instance.url}`));
  console.log(chalk.dim(`  Endpoint:  ${selectedEndpoint}`));
  console.log(chalk.dim(`  Clients:   ${targets.map((c) => c.name).join(', ')}`));
  console.log(chalk.dim('\nRestart your IDE(s) for changes to take effect.\n'));
}
