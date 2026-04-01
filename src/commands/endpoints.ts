import chalk from 'chalk';
import ora from 'ora';
import { getConfigOrThrow } from '../config/store.js';
import { clientFromConfig } from '../api/client-from-config.js';

export async function endpointsCommand(): Promise<void> {
  const config = getConfigOrThrow();
  const client = clientFromConfig(config);

  const spinner = ora('Fetching endpoints...').start();

  try {
    const endpoints = await client.listPublicEndpoints();
    spinner.stop();

    if (endpoints.length === 0) {
      console.log(chalk.yellow('\nNo public endpoints found.'));
      console.log(chalk.dim('Create endpoints in the MetaMCP dashboard first.\n'));
      return;
    }

    console.log(chalk.bold(`\n📡 Endpoints (${endpoints.length})\n`));

    const nameWidth = 20;
    const nsWidth = 20;

    console.log(
      chalk.bold(
        'Name'.padEnd(nameWidth) +
        'Namespace'.padEnd(nsWidth) +
        'URL'
      )
    );
    console.log('─'.repeat(80));

    for (const ep of endpoints) {
      console.log(
        ep.name.padEnd(nameWidth) +
        (ep.namespace ?? '-').padEnd(nsWidth) +
        chalk.dim(ep.endpoints.mcp)
      );
    }
    console.log();
  } catch (err) {
    spinner.fail(
      `Failed to fetch endpoints: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}
