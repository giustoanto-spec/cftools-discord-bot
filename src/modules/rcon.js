const { InputError } = require('./admin-tools');
const { CFTOOLS_API_URL } = require('../constants');

const executeRcon = async (config, command, getToken, request = fetch) => {
  if (config.RCON_ENABLED !== true) throw new InputError('Enable RCON_ENABLED for this server first.');
  if (typeof command !== 'string' || !command.trim() || command.length > 512 || (/[\r\n\0]/).test(command)) {
    throw new InputError('Provide a single RCon command of 1–512 characters.');
  }
  const response = await request(`${ CFTOOLS_API_URL }/server/${ config.CFTOOLS_SERVER_API_ID }/raw`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ await getToken() }`, 'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command: command.trim() }),
    signal: AbortSignal.timeout(15000)
  });
  if (response.status !== 204) throw new InputError(`RCon request failed (HTTP ${ response.status }).`);
};

module.exports = { executeRcon };
