const { InputError, serverId } = require('./admin-tools');

const validParameter = (param) => {
  if (!param || typeof param !== 'object' || Array.isArray(param)) return false;
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  switch (param.dataType) {
    case 'int': return Number.isSafeInteger(param.valueInt);
    case 'float': return finite(param.valueFloat);
    case 'string': return typeof param.valueString === 'string';
    case 'boolean': return typeof param.valueBoolean === 'boolean';
    case 'vector': return [
      param.valueVectorX,
      param.valueVectorY,
      param.valueVectorZ
    ].every(finite);
    case 'cf_itemlist': return true;
    default: return false;
  }
};

const buildCustomAction = (config, options) => {
  const code = options.getString('action');
  const configured = (config.GAMELABS_CUSTOM_ACTIONS ?? []).find((entry) => entry.code === code);
  if (!configured) throw new InputError('Action not configured in GAMELABS_CUSTOM_ACTIONS for this server.');
  const context = configured.context;
  if (![
    'world',
    'player',
    'vehicle',
    'object'
  ].includes(context)) throw new InputError('Invalid action context in configuration.');
  const referenceKey = options.getString('reference') ?? '';
  if (context !== 'world' && !referenceKey.trim()) throw new InputError('This action requires a reference key.');
  let parameters;
  try {
    parameters = JSON.parse(options.getString('parameters') ?? '{}');
  }
  catch {
    throw new InputError('Parameters must be a valid JSON object.');
  }
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new InputError('Parameters must be a JSON object.');
  }
  if (!Object.values(parameters).every(validParameter)) {
    throw new InputError('Invalid typed parameter. Use dataType and the matching valueInt/valueFloat/valueString/valueBoolean/vector fields.');
  }
  return {
    serverApiId: serverId(config), actionCode: code, actionContext: context, referenceKey, parameters
  };
};

module.exports = {
  buildCustomAction, validParameter
};
