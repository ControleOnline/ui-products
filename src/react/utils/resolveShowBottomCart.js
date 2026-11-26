const resolveShowBottomCart = (interactionMode, explicitValue) =>
  explicitValue !== undefined && explicitValue !== null
    ? explicitValue
    : interactionMode === 'pdv';

module.exports = {resolveShowBottomCart};
