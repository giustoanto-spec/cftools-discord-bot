const {
  copyFileSync, existsSync, mkdirSync
} = require('node:fs');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
process.chdir(projectRoot);
mkdirSync(resolve(projectRoot, 'config'), { recursive: true });
for (const [ source, destination ] of [
  [ 'discloud.bot.js', 'config.js' ],
  [ 'discloud.servers.js', 'servers.js' ],
  [ 'discloud.env.example', '.env' ]
]) {
  const target = resolve(projectRoot, 'config', destination);
  if (!existsSync(target)) copyFileSync(resolve(projectRoot, 'config', source), target);
}
require('dotenv').config({ path: resolve(projectRoot, 'config/.env') });
const required = [
  'DISCORD_BOT_TOKEN',
  'CLIENT_ID',
  'DISCORD_OWNER_ID',
  'CFTOOLS_API_APPLICATION_ID',
  'CFTOOLS_API_SECRET',
  'CFTOOLS_SERVER_API_ID',
  'SERVER_IPV4'
];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Discloud setup: fill these keys in config/.env, then start the bot: ${ missing.join(', ') }`);
  process.exit(1);
}
const port = Number(process.env.SERVER_PORT || 2302);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Discloud setup: SERVER_PORT must be a port between 1 and 65535.');
  process.exit(1);
}
require('../src/index');
