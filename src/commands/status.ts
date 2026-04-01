import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/store.js';
import { clientFromConfig } from '../api/client-from-config.js';
import { ALL_CLIENTS } from '../clients/detector.js';

export async function statusCommand(): Promise<void> {
  const config = loadConfig();

  if (!config) {
    console.log(chalk.yellow('\nMetaMCP CLI is not initialized.'));
    console.log(chalk.dim('Run `metamcp-cli init` to get started.\n'));
    return;
  }

  console.log(chalk.bold('\n📊 MetaMCP CLI Status\n'));

  // Instance info
  console.log(chalk.bold('Instance'));
  console.log(`  URL:      ${config.instance.url}`);
  console.log(
    `  Auth:     ${config.instance.apiKey ? 'API Key' : config.instance.sessionCookie ? 'Session' : chalk.yellow('Not configured')}`
  );

  // Health check
  const spinner = ora('  Checking connection...').start();
  const client = clientFromConfig(config);
  const healthy = await client.healthCheck();
  if (healthy) {
    spinner.succeed('  Connection: OK');
  } else {
    spinner.fail('  Connection: Failed');
  }

  // Active endpoint
  console.log(
    `\n${chalk.bold('Active Endpoint')}: ${config.activeEndpoint ?? chalk.dim('none')}`
  );

  // Clients
  console.log(chalk.bold('\nClients'));
  for (const c of ALL_CLIENTS) {
    const installed = c.isInstalled();
    const configured = installed && c.hasMetaMCPEntry();
    const statusStr = !installed
      ? chalk.dim('not found')
      : configured
        ? chalk.green('configured')
        : chalk.yellow('detected');
    console.log(`  ${c.name.padEnd(16)} ${statusStr}`);
  }

  console.log();
}
