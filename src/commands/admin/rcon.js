const { ApplicationCommandOptionType: Type } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  serverConfig, requiredServerConfigCommandOption, getAPIToken
} = require('../../modules/cftClient');
const { resolveServer, privateRun } = require('../../modules/admin-tools');
const { executeRcon } = require('../../modules/rcon');

module.exports = new ChatInputCommand({
  permLevel: 'Administrator',
  global: true,
  cooldown: {
    usages: 1, duration: 5
  },
  data: {
    description: 'Execute a raw RCon command on the selected server',
    options: [
      requiredServerConfigCommandOption,
      {
        name: 'command',
        description: 'Single RCon command',
        type: Type.String,
        required: true,
        min_length: 1,
        max_length: 512
      }
    ]
  },
  run: privateRun(async (client, interaction) => {
    await executeRcon(resolveServer(serverConfig, interaction), interaction.options.getString('command'), getAPIToken);
    return { content: 'RCon command accepted by CFTools. The API does not return console output.' };
  })
});
