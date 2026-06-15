import { execSync } from 'child_process';
import { networkInterfaces } from 'os';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const comment = value.indexOf('#');
    if (comment !== -1) value = value.slice(0, comment).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = {
  ...parseEnvFile(resolve(__dirname, '../../../.env')),
  ...parseEnvFile(resolve(__dirname, '../.env')),
  ...parseEnvFile(resolve(__dirname, '../.env.local')),
  ...process.env,
};

const platform = process.argv[2];
if (!platform || !['android', 'ios'].includes(platform)) {
  console.error('Usage: node cap-run.mjs <android|ios>');
  process.exit(1);
}

let ip;
for (const addrs of Object.values(networkInterfaces())) {
  for (const addr of addrs) {
    if (addr.family === 'IPv4' && !addr.internal) {
      ip = addr.address;
      break;
    }
  }
  if (ip) break;
}
if (!ip) {
  console.error('No LAN IPv4 address found. Are you connected to a network?');
  process.exit(1);
}

const hostname = execSync('hostname', { encoding: 'utf8' }).trim().split('.')[0];
const address = `${hostname}.local`;

const protocol = env.MOBILE_TLS_ENABLED !== 'false' ? 'https' : 'http';
const port = env.MOBILE_PORT || '8826';
const serverUrl = `${protocol}://${address}:${port}`;

console.log(`\n  CAP_SERVER_URL=${serverUrl}\n`);

const androidAssets = resolve(__dirname, `../android/app/src/main/assets`);
execSync(`mkdir -p ${androidAssets} dist`, { stdio: 'inherit' });

execSync(`npx cap copy ${platform} && npx cap run ${platform}`, {
  stdio: 'inherit',
  env: { ...process.env, CAP_SERVER_URL: serverUrl },
});
