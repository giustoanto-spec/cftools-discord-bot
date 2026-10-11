const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Load real command registration without credentials, disk writes or network requests.
process.argv.push('mode=testing');
process.env.CFTOOLS_API_APPLICATION_ID = 'test-app';
process.env.CFTOOLS_API_SECRET = 'test-secret';
const dbPath = require.resolve('../src/modules/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {} };
const { getFiles } = require('../src/util');
const { commands, autoCompletes } = require('../src/client');

test('all existing and new slash commands load successfully', () => {
  const files = getFiles('src/commands');
  for (const file of files) {
    const command = require(file);
    command.load(file, commands);
    assert.equal(typeof command.run, 'function', file);
  }
  for (const name of [ 'priority-queue', 'whitelist', 'banlist', 'rcon', 'gamelabs-action' ]) {
    const command = commands.get(name);
    assert.ok(command, name);
    assert.equal(command.global, true);
    assert.equal(command.permLevel, 2);
    assert.ok(command.data.options.length <= 25);
  }
});

test('custom action autocomplete follows the existing dispatcher contract', async () => {
  const file = path.resolve('src/interactions/autocomplete/action.js');
  const handler = require(file);
  handler.load(file, autoCompletes);
  const { serverConfig } = require('../src/modules/cftClient');
  const cfg = serverConfig[0];
  cfg.GAMELABS_CUSTOM_ACTIONS = [ { code: 'CustomAction', name: 'Custom action', context: 'world' } ];
  const result = await handler.run({}, {
    options: { getString: () => cfg.CFTOOLS_SERVER_API_ID, getFocused: () => 'custom' }
  });
  assert.deepEqual(result, [ { name: 'Custom action', value: 'CustomAction' } ]);
});

test('API token retrieval is single-flight and cached with failed requests recoverable', async () => {
  const { getAPIToken } = require('../src/modules/cftClient');
  const originalFetch = global.fetch;
  let calls = 0;
  try {
    global.fetch = async () => ({ ok: false, status: 403 });
    await assert.rejects(getAPIToken(), /authentication failed/);
    global.fetch = async () => {
      calls++;
      return { ok: true, json: async () => ({ token: 'test-token' }) };
    };
    assert.deepEqual(await Promise.all([ getAPIToken(), getAPIToken() ]), [ 'test-token', 'test-token' ]);
    assert.equal(await getAPIToken(), 'test-token');
    assert.equal(calls, 1);
  }
  finally {
    global.fetch = originalFetch;
  }
});
