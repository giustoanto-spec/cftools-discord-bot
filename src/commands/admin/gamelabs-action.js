const { ApplicationCommandOptionType: Type } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  serverConfig, requiredServerConfigCommandOption, adminClient
} = require('../../modules/cftClient');
const { privateRun, resolveServer } = require('../../modules/admin-tools');
const { buildCustomAction } = require('../../modules/custom-actions');

module.exports = new ChatInputCommand({
  permLevel: 'Administrator',
  global: true,
  data: {
    description: 'Execute a configured custom GameLabs action',
    options: [
      requiredServerConfigCommandOption,
      {
        name: 'action', description: 'Configured action code', type: Type.String, required: true, autocomplete: true
      },
      {
        name: 'reference', description: 'Player session, vehicle or object reference key', type: Type.String
      },
      {
        name: 'parameters', description: 'JSON object with typed GameLabs parameters', type: Type.String, max_length: 3000
      }
    ]
  },
  run: privateRun(async (client, interaction) => {
    const request = buildCustomAction(resolveServer(serverConfig, interaction), interaction.options);
    await adminClient.gameLabsAction(request);
    return { content: `GameLabs action ${ request.actionCode } accepted by CFTools.` };
  })
});
