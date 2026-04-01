import chalk from 'chalk';
import ora from 'ora';
import { getConfigOrThrow } from '../config/store.js';
import { clientFromConfig } from '../api/client-from-config.js';

export async function namespacesCommand(): Promise<void> {
  const config = getConfigOrThrow();
  const client = clientFromConfig(config);

  const spinner = ora('Fetching namespaces...').start();

  try {
    const namespaces = await client.listNamespaces();
    spinner.stop();

    if (namespaces.length === 0) {
      console.log(chalk.yellow('\nNo namespaces found.'));
      return;
    }

    console.log(chalk.bold(`\n📦 Namespaces (${namespaces.length})\n`));

    const nameWidth = 24;
    const scopeWidth = 12;

    console.log(
      chalk.bold(
        'Name'.padEnd(nameWidth) +
        'Scope'.padEnd(scopeWidth) +
        'Description'
      )
    );
    console.log('─'.repeat(70));

    for (const ns of namespaces) {
      console.log(
        ns.name.padEnd(nameWidth) +
        (ns.isPublic ? 'public' : 'private').padEnd(scopeWidth) +
        chalk.dim(ns.description ?? '-')
      );
    }
    console.log();
  } catch (err) {
    spinner.fail(
      `Failed to fetch namespaces: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}
