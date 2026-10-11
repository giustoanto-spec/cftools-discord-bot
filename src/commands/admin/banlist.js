const { ApplicationCommandOptionType: Type } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  serverConfig, requiredServerConfigCommandOption, adminClient
} = require('../../modules/cftClient');
const { steam64Option, durationOption } = require('../../modules/membership-command');
const { privateRun, resolveServer } = require('../../modules/admin-tools');
const { runBanlist } = require('../../modules/ban-tools');

module.exports = new ChatInputCommand({
  permLevel: 'Administrator',
  global: true,
  data: {
    description: 'Manage bans in the configured CFTools banlist',
    options: [
      {
        name: 'view',
        description: 'List bans for a player',
        type: Type.Subcommand,
        options: [
          requiredServerConfigCommandOption,
          steam64Option,
          {
            name: 'page', description: 'Results page', type: Type.Integer, min_value: 1
          }
        ]
      },
      {
        name: 'add',
        description: 'Ban a player',
        type: Type.Subcommand,
        options: [
          requiredServerConfigCommandOption,
          steam64Option,
          durationOption,
          {
            name: 'reason',
            description: 'Reason for the ban',
            type: Type.String,
            required: true,
            min_length: 1,
            max_length: 500
          }
        ]
      },
      {
        name: 'remove',
        description: 'Delete one specific ban',
        type: Type.Subcommand,
        options: [
          requiredServerConfigCommandOption,
          steam64Option,
          {
            name: 'ban-id', description: 'Ban ID shown by /banlist view', type: Type.String, required: true
          }
        ]
      }
    ]
  },
  run: privateRun((client, interaction) => runBanlist(
    adminClient, resolveServer(serverConfig, interaction), interaction
  ))
});
