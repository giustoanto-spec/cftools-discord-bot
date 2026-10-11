const { ServerApiId } = require('cftools-sdk');
const { escapeMarkdown } = require('discord.js');

class InputError extends Error {}

const steam64Regex = /^7656119\d{10}$/;
const expiration = (days, now = Date.now()) => {
  if (days === -1) return 'Permanent';
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new InputError('Duration must be -1 (permanent) or 1–365 days.');
  }
  return new Date(now + days * 86400000);
};
const dateLabel = (value) => value === 'Permanent'
  ? 'Permanent'
  : `<t:${ Math.floor(new Date(value).valueOf() / 1000) }:f>`;
const safeText = (value, limit = 500) => escapeMarkdown(String(value ?? '').slice(0, limit));

const resolvePlayer = async (api, steam64) => {
  if (!steam64Regex.test(steam64)) throw new InputError('Invalid Steam64 ID.');
  return api.resolve({ id: steam64 });
};
const resolveServer = (configs, interaction) => {
  const selected = interaction.options.getString('server');
  const config = configs.find((entry) => entry.CFTOOLS_SERVER_API_ID === selected);
  if (!config) throw new InputError('Unknown server. Select a configured server.');
  return config;
};
const serverId = (config) => ServerApiId.of(config.CFTOOLS_SERVER_API_ID);

// Mutations only report success after the remote API has fulfilled the request.
const runMembership = async (api, kind, config, interaction) => {
  const options = interaction.options;
  const action = options.getSubcommand();
  const id = await resolvePlayer(api, options.getString('steam64'));
  const request = {
    serverApiId: serverId(config), playerId: id
  };
  if (action === 'add') {
    await api[`put${ kind }`]({
      serverApiId: request.serverApiId,
      id,
      expires: expiration(options.getInteger('duration')),
      comment: options.getString('comment') ?? ''
    });
    return { content: `${ kind }: entry added for ${ id.id }.` };
  }
  const entry = await api[`get${ kind }`](request);
  if (!entry) return { content: `${ kind }: no entry for ${ id.id }.` };
  if (action === 'remove') {
    await api[`delete${ kind }`](request);
    return { content: `${ kind }: entry removed for ${ id.id }.` };
  }
  return { embeds: [
    {
      title: kind === 'PriorityQueue' ? 'Priority Queue' : 'Whitelist',
      description: `CFTools ID: ${ id.id }\nExpires: ${ dateLabel(entry.expiration) }\nComment: ${ safeText(entry.comment) || 'None' }`,
      color: 0x3498db
    }
  ] };
};

const privateRun = (callback) => async (client, interaction) => {
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await callback(client, interaction);
    await interaction.editReply({
      ...result, allowedMentions: { parse: [] }
    });
  }
  catch (err) {
    // Do not expose credentials, request objects or raw API error bodies in Discord.
    const message = err instanceof InputError
      ? safeText(err.message, 300)
      : 'CFTools request failed. Check the application grants, resource IDs and API availability.';
    await interaction.editReply({
      content: `❌ ${ message }`, allowedMentions: { parse: [] }
    });
  }
};

module.exports = {
  InputError, expiration, dateLabel, safeText, resolvePlayer, resolveServer, serverId, runMembership, privateRun
};
