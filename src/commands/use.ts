import chalk from 'chalk';
import ora from 'ora';
import { confirm, checkbox } from '@inquirer/prompts';
import { getConfigOrThrow, saveConfig } from '../config/store.js';
import { clientFromConfig } from '../api/client-from-config.js';
import {
  detectClients,
  getClientBySlug,
  type EndpointConfig,
  type MCPClient,
} from '../clients/detector.js';

export async function useCommand(
  endpointName: string,
  options: { client?: string; force?: boolean }
): Promise<void> {
  const config = getConfigOrThrow();
  const apiClient = clientFromConfig(config);

  // Validate endpoint exists
  const spinner = ora('Validating endpoint...').start();
  let endpoints;
  try {
    endpoints = await apiClient.listPublicEndpoints();
  } catch (err) {
    spinner.fail(
      `Failed to fetch endpoints: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }

  const endpoint = endpoints.find((e) => e.name === endpointName);
  if (!endpoint) {
    spinner.fail(`Endpoint "${endpointName}" not found.`);
    console.log(
      chalk.dim(
        'Available endpoints: ' + endpoints.map((e) => e.name).join(', ')
      )
    );
    process.exit(1);
  }
  spinner.succeed(`Endpoint "${endpointName}" found`);

  // Determine which clients to configure
  let targets: MCPClient[];

  if (options.client) {
    const c = getClientBySlug(options.client);
    if (!c) {
      console.log(
        chalk.red(`Unknown client "${options.client}".`) +
        chalk.dim(
          ' Available: claude-desktop, cursor, windsurf, cline, claude-code'
        )
      );
      process.exit(1);
    }
    if (!c.isInstalled()) {
      console.log(chalk.red(`${c.name} is not installed or detected on this system.`));
      process.exit(1);
    }
    targets = [c];
  } else {
    const detected = detectClients();
    if (detected.length === 0) {
      console.log(chalk.yellow('No MCP clients detected. Run `metamcp-cli scan` to check.'));
      process.exit(1);
    }

    const selected = await checkbox({
      message: 'Select clients to configure:',
      choices: detected.map((c) => ({
        name: `${c.name}${c.hasMetaMCPEntry() ? chalk.dim(' (already configured)') : ''}`,
        value: c.slug,
        checked: true,
      })),
    });

    if (selected.length === 0) {
      console.log(chalk.yellow('No clients selected.'));
      return;
    }

    targets = selected
      .map((slug) => getClientBySlug(slug))
      .filter((c): c is MCPClient => c !== undefined);
  }

  const endpointConfig: EndpointConfig = {
    baseUrl: config.instance.url,
    endpointName,
    apiKey: config.instance.apiKey,
  };

  // Configure each client
  for (const client of targets) {
    const hasExisting = client.hasMetaMCPEntry();

    if (hasExisting && !options.force) {
      const overwrite = await confirm({
        message: `${client.name} already has a MetaMCP config. Overwrite?`,
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
        chalk.red(
          `  Failed to configure ${client.name}: ${err instanceof Error ? err.message : String(err)}`
        )
      );
    }
  }

  // Update active endpoint in config
  config.activeEndpoint = endpointName;
  saveConfig(config);

  console.log(chalk.green(`\n✓ Active endpoint set to "${endpointName}"`));
  console.log(chalk.dim('Restart your IDE(s) for the changes to take effect.\n'));
}
