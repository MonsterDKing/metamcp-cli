import { input, select, password } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { MetaMCPClient } from '../api/metamcp.js';
import { saveConfig, type MetaMCPConfig } from '../config/store.js';

export async function initCommand(options: { insecure?: boolean }): Promise<void> {
  console.log(chalk.bold('\n🔧 MetaMCP CLI Setup\n'));

  if (options.insecure) {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  }

  const url = await input({
    message: 'MetaMCP instance URL:',
    default: 'http://localhost:12008',
    validate: (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return 'Please enter a valid URL';
      }
    },
  });

  const baseUrl = url.replace(/\/+$/, '');

  const authMethod = await select({
    message: 'Authentication method:',
    choices: [
      { name: 'API Key', value: 'apikey' },
      { name: 'Email / Password', value: 'credentials' },
    ],
  });

  const config: MetaMCPConfig = {
    version: 1,
    instance: { url: baseUrl },
  };

  let apiKey: string | undefined;
  let sessionCookie: string | undefined;

  if (authMethod === 'apikey') {
    apiKey = await password({
      message: 'API Key:',
      mask: '*',
    });
    config.instance.apiKey = apiKey;
  } else {
    const email = await input({ message: 'Email:' });
    const pass = await password({ message: 'Password:', mask: '*' });

    const spinner = ora('Signing in...').start();
    const client = new MetaMCPClient(baseUrl);

    try {
      const cookie = await client.signIn(email, pass);
      spinner.succeed('Signed in successfully');
      sessionCookie = cookie;
      config.instance.sessionCookie = cookie;
    } catch (err) {
      spinner.fail(
        `Sign-in failed: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  }

  // Validate connection
  const spinner = ora('Validating connection...').start();
  const client = new MetaMCPClient(baseUrl, apiKey, sessionCookie);
  const ok = await client.healthCheck();

  if (!ok) {
    spinner.fail(
      'Could not connect to MetaMCP. Check the URL and ensure the server is running.'
    );
    process.exit(1);
  }

  spinner.succeed('Connected to MetaMCP');

  saveConfig(config);
  console.log(chalk.green('\n✓ Configuration saved to ~/.metamcp-cli/config.json'));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim('  metamcp-cli setup      — interactive setup wizard'));
  console.log(chalk.dim('  metamcp-cli endpoints   — list available endpoints'));
  console.log(chalk.dim('  metamcp-cli use <name>  — configure your IDEs\n'));
}
