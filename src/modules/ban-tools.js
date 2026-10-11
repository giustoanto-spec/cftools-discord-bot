const { Banlist } = require('cftools-sdk');
const {
  InputError, resolvePlayer, expiration, dateLabel, safeText
} = require('./admin-tools');

const runBanlist = async (api, config, interaction) => {
  if (!config.CFTOOLS_BANLIST_ID) throw new InputError('Configure CFTOOLS_BANLIST_ID for this server first.');
  const options = interaction.options;
  const list = Banlist.of(config.CFTOOLS_BANLIST_ID);
  const playerId = await resolvePlayer(api, options.getString('steam64'));
  const action = options.getSubcommand();
  if (action === 'add') {
    const reason = options.getString('reason')?.trim();
    if (!reason) throw new InputError('A ban reason is required.');
    await api.putBan({
      list, playerId, reason, expiration: expiration(options.getInteger('duration'))
    });
    return { content: `Ban added for ${ playerId.id }.` };
  }
  const bans = await api.listBans({
    list, playerId
  });
  if (action === 'remove') {
    // Delete exactly the selected ban belonging to this player, never all historical bans.
    const ban = bans.find((entry) => entry.id === options.getString('ban-id'));
    if (!ban) throw new InputError('Ban ID not found for this player in the configured banlist.');
    await api.deleteBan({
      list, ban
    });
    return { content: `Ban ${ ban.id } removed for ${ playerId.id }.` };
  }
  const page = options.getInteger('page') ?? 1;
  const pages = Math.max(1, Math.ceil(bans.length / 5));
  if (page < 1 || page > pages) throw new InputError(`Choose a page between 1 and ${ pages }.`);
  const entries = bans.slice((page - 1) * 5, page * 5);
  return { embeds: [
    {
      title: `Banlist — page ${ page }/${ pages }`,
      description: `Player: ${ playerId.id } • Total entries: ${ bans.length }`,
      color: 0xe74c3c,
      fields: entries.map((ban) => ({
        name: ban.id,
        value: `${ ban.status }\nExpires: ${ dateLabel(ban.expiration) }\n${ safeText(ban.reason) || 'No reason' }`
      }))
    }
  ] };
};

module.exports = { runBanlist };
