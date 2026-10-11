const example = require('./servers.example')[0];

module.exports = [
  {
    ...example,
    NAME: process.env.SERVER_NAME || 'DayZ CFTools',
    CFTOOLS_SERVER_API_ID: process.env.CFTOOLS_SERVER_API_ID ?? '',
    SERVER_IPV4: process.env.SERVER_IPV4 ?? '',
    SERVER_PORT: Number(process.env.SERVER_PORT || 2302),
    CFTOOLS_BANLIST_ID: process.env.CFTOOLS_BANLIST_ID ?? '',
    RCON_ENABLED: process.env.RCON_ENABLED === 'true',
    GAMELABS_CUSTOM_ACTIONS: [],
    SERVER_STATUS_ENABLED: Boolean(process.env.SERVER_STATUS_CHANNEL_ID),
    SERVER_STATUS_CHANNEL_ID: process.env.SERVER_STATUS_CHANNEL_ID ?? '',
    SERVER_STATUS_MESSAGE_ID: process.env.SERVER_STATUS_MESSAGE_ID ?? '',
    SERVER_STATUS_INTERVAL_IN_MINUTES: 5,
    USE_CHAT_FEED: false,
    CHAT_FEED_CHANNEL_IDS: [],
    CHAT_FEED_DISCORD_TAGS: [],
    CFTOOLS_WEBHOOK_CHANNEL_ID: '',
    CFTOOLS_WEBHOOK_USER_ID: '',
    WATCH_LIST_CHANNEL_ID: '',
    WATCH_LIST_NOTIFICATION_ROLE_ID: '',
    USE_KILL_FEED: false,
    KILL_FEED_CHANNEL_ID: '',
    AUTO_LB_ENABLED: false,
    AUTO_LB_CHANNEL_ID: '',
    LEADERBOARD_BLACKLIST: []
  }
];
