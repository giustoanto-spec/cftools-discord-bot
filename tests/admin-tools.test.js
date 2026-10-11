const { test } = require('node:test');
const assert = require('node:assert/strict');
const { expiration, resolveServer, runMembership, privateRun } = require('../src/modules/admin-tools');
const { runBanlist } = require('../src/modules/ban-tools');
const { buildCustomAction } = require('../src/modules/custom-actions');
const { executeRcon } = require('../src/modules/rcon');

const config = { CFTOOLS_SERVER_API_ID: 'server-one', CFTOOLS_BANLIST_ID: 'list-one' };
const interaction = (action, values = {}) => ({
  options: {
    getSubcommand: () => action,
    getString: (key) => ({ steam64: '76561199003950745', server: 'server-one', ...values }[key] ?? null),
    getInteger: (key) => values[key] ?? null
  }
});
const player = { id: 'player-one' };

test('duration rejects zero, other negatives and fractional values', () => {
  assert.equal(expiration(-1), 'Permanent');
  assert.equal(expiration(1, 0).valueOf(), 86400000);
  for (const days of [ 0, -2, 366, 1.5, null ]) assert.throws(() => expiration(days));
});

test('unknown server is never silently replaced by the first server', () => {
  assert.throws(() => resolveServer([ config ], interaction('view', { server: 'other' })));
});

for (const kind of [ 'Whitelist', 'PriorityQueue' ]) {
  test(`${ kind } mutation failures never report success`, async () => {
    const api = { resolve: async () => player, [`put${ kind }`]: async () => { throw new Error('API failed'); } };
    await assert.rejects(runMembership(api, kind, config, interaction('add', { duration: 1 })), /API failed/);
    api[`get${ kind }`] = async () => ({ expiration: 'Permanent' });
    api[`delete${ kind }`] = async () => { throw new Error('Delete failed'); };
    await assert.rejects(runMembership(api, kind, config, interaction('remove')), /Delete failed/);
  });

  test(`${ kind } add/view/remove uses selected server and correct SDK fields`, async () => {
    const calls = [];
    const api = {
      resolve: async () => player,
      [`put${ kind }`]: async (request) => calls.push(request),
      [`get${ kind }`]: async (request) => {
        calls.push(request);
        return { expiration: 'Permanent', comment: 'VIP' };
      },
      [`delete${ kind }`]: async (request) => calls.push(request)
    };
    await runMembership(api, kind, config, interaction('add', { duration: -1 }));
    assert.equal(calls[0].id, player);
    assert.equal(calls[0].expires, 'Permanent');
    assert.equal(calls[0].serverApiId.id, config.CFTOOLS_SERVER_API_ID);
    const view = await runMembership(api, kind, config, interaction('view'));
    assert.match(view.embeds[0].description, /VIP/);
    const removal = await runMembership(api, kind, config, interaction('remove'));
    assert.match(removal.content, /removed/);
    assert.equal(calls.at(-1).playerId, player);
    api[`get${ kind }`] = async () => null;
    assert.match((await runMembership(api, kind, config, interaction('view'))).content, /no entry/);
    await assert.rejects(runMembership(api, kind, config, interaction('add', { steam64: 'invalid', duration: 1 })));
  });
}

test('ban removal checks ownership and deletes only the requested entry', async () => {
  const bans = [ { id: 'ban-one' }, { id: 'ban-two' } ];
  const deleted = [];
  const api = { resolve: async () => player, listBans: async () => bans, deleteBan: async (request) => deleted.push(request) };
  await assert.rejects(runBanlist(api, config, interaction('remove', { 'ban-id': 'foreign' })));
  assert.equal(deleted.length, 0);
  await runBanlist(api, config, interaction('remove', { 'ban-id': 'ban-two' }));
  assert.equal(deleted[0].ban, bans[1]);
  assert.equal(deleted[0].list.id, 'list-one');
});

test('ban add requires a reason and supports expiring/permanent entries', async () => {
  const added = [];
  const api = { resolve: async () => player, putBan: async (request) => added.push(request) };
  await assert.rejects(runBanlist(api, config, interaction('add', { reason: ' ', duration: -1 })));
  await runBanlist(api, config, interaction('add', { reason: 'Cheating', duration: -1 }));
  assert.equal(added[0].expiration, 'Permanent');
  assert.equal(added[0].playerId, player);
  await assert.rejects(runBanlist(api, {}, interaction('view')), /CFTOOLS_BANLIST_ID/);
});

test('ban pages stay within Discord limits and validate requested page', async () => {
  const api = {
    resolve: async () => player,
    listBans: async () => Array.from({ length: 12 }, (_, i) => ({
      id: String(i), reason: 'x'.repeat(500), expiration: 'Permanent', status: 'Ban.ACTIVE'
    }))
  };
  const result = await runBanlist(api, config, interaction('view', { page: 2 }));
  assert.equal(result.embeds[0].fields.length, 5);
  assert.equal(result.embeds[0].fields[0].name, '5');
  await assert.rejects(runBanlist(api, config, interaction('view', { page: 4 })));
});

test('custom GameLabs validates configured code, context, reference and typed parameters', () => {
  const cfg = { ...config, GAMELABS_CUSTOM_ACTIONS: [ { code: 'Custom', context: 'player' } ] };
  const opts = (values) => interaction('', { action: 'Custom', reference: 'session-one', ...values }).options;
  assert.equal(buildCustomAction(cfg, opts({ parameters: '{"amount":{"dataType":"int","valueInt":3}}' })).referenceKey, 'session-one');
  for (const values of [
    { action: 'unconfigured' }, { reference: '' }, { parameters: 'bad json' }, { parameters: '[]' },
    { parameters: '{"a":{"dataType":"int","valueInt":1.5}}' },
    { parameters: '{"a":{"dataType":"vector","valueVectorX":1}}' }
  ]) assert.throws(() => buildCustomAction(cfg, opts(values)));
  const params = {
    f: { dataType: 'float', valueFloat: 1.2 }, s: { dataType: 'string', valueString: 'abc' },
    b: { dataType: 'boolean', valueBoolean: false },
    v: { dataType: 'vector', valueVectorX: 1, valueVectorY: 2, valueVectorZ: 3 },
    items: { dataType: 'cf_itemlist' }
  };
  assert.deepEqual(buildCustomAction(cfg, opts({ parameters: JSON.stringify(params) })).parameters, params);
});

test('RCon refuses disabled servers/multiple commands and handles HTTP failure', async () => {
  const token = async () => 'token';
  let calls = 0;
  const request = async (url, data) => {
    calls++;
    assert.match(url, /server-one\/raw$/);
    assert.equal(data.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(data.body), { command: 'players' });
    return { status: 204 };
  };
  await assert.rejects(executeRcon(config, 'players', token, request));
  const cfg = { ...config, RCON_ENABLED: true };
  await assert.rejects(executeRcon(cfg, 'players\n#shutdown', token, request));
  assert.equal(calls, 0);
  await executeRcon(cfg, 'players', token, request);
  await assert.rejects(executeRcon(cfg, 'players', token, async () => ({ status: 403 })), /403/);
});

test('private command wrapper returns an error reply without success or mentions', async () => {
  const replies = [];
  const ix = {
    deferReply: async (data) => assert.equal(data.ephemeral, true),
    editReply: async (data) => replies.push(data)
  };
  await privateRun(async () => { throw new Error('Request failed'); })({}, ix);
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /❌/);
  assert.deepEqual(replies[0].allowedMentions.parse, []);
});
