const { ApplicationCommandOptionType: Type } = require('discord.js');
const { ChatInputCommand } = require('../classes/Commands');
const {
  serverConfig, requiredServerConfigCommandOption, adminClient
} = require('./cftClient');
const {
  privateRun, resolveServer, runMembership
} = require('./admin-tools');

const steam64Option = {
  name: 'steam64', description: 'Player Steam64 ID', type: Type.String, required: true
};
const durationOption = {
  name: 'duration',
  description: 'Days: 1–365, or -1 for permanent',
  type: Type.Integer,
  required: true,
  min_value: -1,
  max_value: 365
};
const commentOption = {
  name: 'comment', description: 'Entry comment', type: Type.String, max_length: 100
};
const makeMembershipCommand = (kind) => new ChatInputCommand({
  permLevel: 'Administrator',
  global: true,
  data: {
    description: kind === 'Whitelist' ? 'Manage the server whitelist' : 'Manage the priority queue',
    options: [
      {
        name: 'view',
        description: 'View a player entry',
        type: Type.Subcommand,
        options: [ requiredServerConfigCommandOption, steam64Option ]
      },
      {
        name: 'add',
        description: 'Add a player entry',
        type: Type.Subcommand,
        options: [
          requiredServerConfigCommandOption,
          steam64Option,
          durationOption,
          commentOption
        ]
      },
      {
        name: 'remove',
        description: 'Remove a player entry',
        type: Type.Subcommand,
        options: [ requiredServerConfigCommandOption, steam64Option ]
      }
    ]
  },
  run: privateRun((client, interaction) => runMembership(
    adminClient, kind, resolveServer(serverConfig, interaction), interaction
  ))
});

module.exports = {
  makeMembershipCommand, steam64Option, durationOption
};
