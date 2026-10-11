const { ComponentCommand } = require('../../classes/Commands');
const { serverConfig } = require('../../modules/cftClient');

module.exports = new ComponentCommand({ run: async (client, interaction) => {
  const server = serverConfig.find((entry) => entry.CFTOOLS_SERVER_API_ID === interaction.options.getString('server'));
  const query = String(interaction.options.getFocused()).toLowerCase();
  const choices = (server?.GAMELABS_CUSTOM_ACTIONS ?? [])
    .filter((entry) => entry.code.toLowerCase().includes(query))
    .slice(0, 25)
    .map((entry) => ({
      name: (entry.name ?? entry.code).slice(0, 100), value: entry.code
    }));
  return choices;
} });
