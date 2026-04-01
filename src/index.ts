import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { endpointsCommand } from './commands/endpoints.js';
import { namespacesCommand } from './commands/namespaces.js';
import { useCommand } from './commands/use.js';
import { statusCommand } from './commands/status.js';
import { setupCommand } from './commands/setup.js';

const program = new Command();

program
  .name('metamcp-cli')
  .description('CLI wrapper for MetaMCP — auto-configure MCP clients')
  .version('0.1.0');

program
  .command('setup')
  .description('Interactive setup wizard — connect, pick endpoint, configure IDEs')
  .option('--insecure', 'Allow self-signed SSL certificates')
  .action(async (options) => {
    await withErrorHandling(() => setupCommand(options));
  });

program
  .command('init')
  .description('Initialize MetaMCP CLI with your instance URL and credentials')
  .option('--insecure', 'Allow self-signed SSL certificates')
  .action(async (options) => {
    await withErrorHandling(() => initCommand(options));
  });

program
  .command('scan')
  .description('Detect installed MCP clients (IDEs)')
  .action(async () => {
    await withErrorHandling(scanCommand);
  });

program
  .command('endpoints')
  .description('List available MetaMCP endpoints')
  .action(async () => {
    await withErrorHandling(endpointsCommand);
  });

program
  .command('namespaces')
  .description('List available MetaMCP namespaces (requires session auth)')
  .action(async () => {
    await withErrorHandling(namespacesCommand);
  });

program
  .command('use')
  .argument('<endpoint>', 'Name of the MetaMCP endpoint to use')
  .description('Configure detected MCP clients to use a MetaMCP endpoint')
  .option('-c, --client <slug>', 'Only configure a specific client')
  .option('-f, --force', 'Overwrite existing MetaMCP config without asking')
  .action(async (endpoint, options) => {
    await withErrorHandling(() => useCommand(endpoint, options));
  });

program
  .command('status')
  .description('Show current MetaMCP CLI configuration and status')
  .action(async () => {
    await withErrorHandling(statusCommand);
  });

async function withErrorHandling(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof Error) {
      console.error(chalk.red(`\nError: ${err.message}`));
      if (process.env['DEBUG']) {
        console.error(chalk.dim(err.stack));
      }
    } else {
      console.error(chalk.red(`\nError: ${String(err)}`));
    }
    process.exit(1);
  }
}

program.parse();
