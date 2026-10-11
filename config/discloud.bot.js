const example = require('./config.example');
const ids = (value) => (value ?? '').split(',').map((id) => id.trim())
  .filter(Boolean);

module.exports = {
  ...example,
  permissions: {
    ownerId: process.env.DISCORD_OWNER_ID ?? '',
    administratorRoleIds: ids(process.env.DISCORD_ADMIN_ROLE_IDS),
    moderatorRoleIds: ids(process.env.DISCORD_MOD_ROLE_IDS),
    developers: []
  }
};
