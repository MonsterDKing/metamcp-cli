import { MetaMCPClient } from './metamcp.js';
import { type MetaMCPConfig } from '../config/store.js';

export function clientFromConfig(config: MetaMCPConfig): MetaMCPClient {
  return new MetaMCPClient(
    config.instance.url,
    config.instance.apiKey,
    config.instance.sessionCookie,
    config.instance.proxyHeaders,
  );
}
