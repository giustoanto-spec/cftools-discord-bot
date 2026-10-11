const { Game } = require('cftools-sdk');
const { safeText } = require('./admin-tools');

const marker = (config) => `CFTools status: ${ config.CFTOOLS_SERVER_API_ID }`;
const statusEmbed = (config, data) => {
  let color = 0xf1c40f;
  let description = '🟡 Status unavailable — unable to retrieve CFTools data.';
  if (data) {
    color = data.online ? 0x2ecc71 : 0xe74c3c;
    description = data.online ? '🟢 Online' : '🔴 Offline';
  }
  return {
    title: safeText(config.NAME, 200),
    color,
    description,
    fields: data
      ? [
        {
          name: 'Players', value: `${ data.status?.players?.online ?? 0 }/${ data.status?.players?.slots ?? 0 }`, inline: true
        },
        {
          name: 'Queue', value: String(data.status?.players?.queue ?? 0), inline: true
        },
        {
          name: 'Address', value: `${ config.SERVER_IPV4 }:${ config.SERVER_PORT }`
        }
      ]
      : [],
    footer: { text: marker(config) },
    timestamp: new Date().toISOString()
  };
};

const isStatusMessage = (message, userId, config) => message?.author?.id === userId
  && message.embeds?.some((embed) => embed.footer?.text === marker(config));

const updateServerStatus = async (client, api, config, state = {}) => {
  const channel = await client.channels.fetch(config.SERVER_STATUS_CHANNEL_ID);
  if (!channel?.isTextBased() || !channel.messages || !channel.send) {
    throw new Error('SERVER_STATUS_CHANNEL_ID must refer to a message channel.');
  }
  let data = null;
  try {
    data = await api.getGameServerDetails({
      game: Game.DayZ, ip: config.SERVER_IPV4, port: config.SERVER_PORT
    });
  }
  catch (err) {
    state.lastError = err;
  }
  const payload = {
    embeds: [ statusEmbed(config, data) ], allowedMentions: { parse: [] }
  };
  let message;
  const id = state.messageId ?? config.SERVER_STATUS_MESSAGE_ID;
  if (id) {
    try {
      message = await channel.messages.fetch(id);
    }
    catch (err) {
      // A missing message may be recreated; permission/network errors must not create duplicates.
      if (err.code !== 10008) throw err;
    }
    if (message && !isStatusMessage(message, client.user.id, config)) {
      throw new Error('Configured status message belongs to another author or server.');
    }
  }
  if (!message) {
    const recent = await channel.messages.fetch({ limit: 100 });
    message = recent.find((entry) => isStatusMessage(entry, client.user.id, config));
  }
  const saved = message ? await message.edit(payload) : await channel.send(payload);
  // Each scheduler awaits its own update before scheduling another call.
  // eslint-disable-next-line require-atomic-updates
  state.messageId = saved.id;
  return state;
};

// One scheduler per client. Recursive timeouts never overlap slow API requests.
const schedulers = new WeakMap();
const startServerStatus = (client, api, configs, onError = console.error) => {
  if (schedulers.has(client)) return schedulers.get(client);
  const timers = new Set();
  let stopped = false;
  const stop = () => {
    stopped = true;
    timers.forEach(clearTimeout);
    timers.clear();
    schedulers.delete(client);
  };
  schedulers.set(client, stop);
  for (const config of configs.filter((entry) => entry.SERVER_STATUS_ENABLED === true)) {
    const minutes = Number(config.SERVER_STATUS_INTERVAL_IN_MINUTES ?? 5);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440 || !config.SERVER_STATUS_CHANNEL_ID) {
      onError(new Error(`Invalid server status configuration for ${ config.NAME }`));
      continue;
    }
    const state = {};
    // All cycles share the stop flag so shutdown cancels every server.
    // eslint-disable-next-line no-loop-func
    const tick = async () => {
      try {
        await updateServerStatus(client, api, config, state);
      }
      catch (err) {
        onError(err);
      }
      if (!stopped) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          void tick();
        }, minutes * 60000);
        timer.unref();
        timers.add(timer);
      }
    };
    void tick();
  }
  return stop;
};

module.exports = {
  statusEmbed, updateServerStatus, startServerStatus
};
