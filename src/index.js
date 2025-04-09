const Wayu = require('./wayu.js');

/**
 * Factory function to create a new Wayu instance.
 * @param {string} publicKey - The public identifier for the client.
 * @param {string} secretKey - The secret key used for HMAC signing.
 * @returns {Wayu} A new Wayu instance.
 */
const createWayuInstance = (publicKey, secretKey) => {
  return new Wayu(publicKey, secretKey);
};

module.exports = createWayuInstance;
module.exports.Wayu = Wayu;
