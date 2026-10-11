const { test } = require('node:test');
const assert = require('node:assert/strict');
const { statusEmbed, updateServerStatus, startServerStatus } = require('../src/modules/server-status');

const config = {
  NAME: 'DayZ', CFTOOLS_SERVER_API_ID: 'server-one', SERVER_STATUS_CHANNEL_ID: 'channel-one',
  SERVER_STATUS_ENABLED: true, SERVER_IPV4: '127.0.0.1', SERVER_PORT: 2302
};
const api = { getGameServerDetails: async () => ({ online: true, status: { players: { online: 10, slots: 60, queue: 2 } } }) };
const fixture = () => {
  const edits = [];
  const sends = [];
  const message = {
    id: 'msg-one', author: { id: 'bot-one' }, embeds: [ statusEmbed(config, { online: true }) ],
    edit: async (payload) => { edits.push(payload); return message; }
  };
  const recent = new Map();
  recent.find = (predicate) => [ ...recent.values() ].find(predicate);
  const channel = {
    isTextBased: () => true,
    messages: { fetch: async (arg) => typeof arg === 'string' ? message : recent },
    send: async (payload) => { sends.push(payload); return message; }
  };
  return { client: { user: { id: 'bot-one' }, channels: { fetch: async () => channel } }, channel, message, edits, sends, recent };
};

test('status displays online, offline and unavailable separately', () => {
  assert.match(statusEmbed(config, { online: true }).description, /Online/);
  assert.match(statusEmbed(config, { online: false }).description, /Offline/);
  assert.match(statusEmbed(config, null).description, /unavailable/);
});

test('status creates one message then edits it and recovers it after restart', async () => {
  const f = fixture();
  const state = {};
  await updateServerStatus(f.client, api, config, state);
  await updateServerStatus(f.client, api, config, state);
  assert.equal(f.sends.length, 1);
  assert.equal(f.edits.length, 1);
  f.recent.set(f.message.id, f.message);
  await updateServerStatus(f.client, api, config, {});
  assert.equal(f.sends.length, 1);
  assert.equal(f.edits.length, 2);
});

test('API failure edits the message to unavailable, not offline', async () => {
  const f = fixture();
  await updateServerStatus(f.client, { getGameServerDetails: async () => { throw new Error('503'); } }, config, { messageId: 'msg-one' });
  assert.match(f.edits[0].embeds[0].description, /unavailable/);
});

test('status does not create duplicate messages after permission errors', async () => {
  const f = fixture();
  f.channel.messages.fetch = async () => { throw Object.assign(new Error('Forbidden'), { code: 50013 }); };
  await assert.rejects(updateServerStatus(f.client, api, config, { messageId: 'msg-one' }));
  assert.equal(f.sends.length, 0);
});

test('deleted message is recreated but foreign message is rejected', async () => {
  const f = fixture();
  f.channel.messages.fetch = async (arg) => {
    if (typeof arg === 'string') throw Object.assign(new Error('Not found'), { code: 10008 });
    return f.recent;
  };
  await updateServerStatus(f.client, api, config, { messageId: 'deleted' });
  assert.equal(f.sends.length, 1);
  f.channel.messages.fetch = async () => ({ ...f.message, author: { id: 'foreign' } });
  await assert.rejects(updateServerStatus(f.client, api, config, { messageId: 'foreign' }));
});

test('scheduler is idempotent and ignores disabled/invalid configurations', async () => {
  const f = fixture();
  const errors = [];
  const stop = startServerStatus(f.client, api, [ { ...config, SERVER_STATUS_INTERVAL_IN_MINUTES: 0 } ], (err) => errors.push(err));
  assert.equal(startServerStatus(f.client, api, [ config ]), stop);
  assert.equal(errors.length, 1);
  assert.equal(f.sends.length, 0);
  stop();
  startServerStatus(f.client, api, [ { ...config, SERVER_STATUS_ENABLED: false } ])();
  assert.equal(f.sends.length, 0);
});
