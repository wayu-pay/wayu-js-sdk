const crypto = require('crypto');

class Wayu {
  /**
   * Initializes the Wayu client.
   * @param {string} publicKey - The public identifier for the client.
   * @param {string} secretKey - The secret key used for HMAC signing.
   */
  constructor(publicKey, secretKey) {
    if (!publicKey || !secretKey) {
      throw new Error('Public key and secret key are required.');
    }
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }

  /**
   * Generates an HMAC-SHA256 signature.
   * The message signed is constructed as "publicKey:timestamp".
   * The signature is returned in hexadecimal format.
   *
   * @param {object} [data] - Currently unused, included for potential future extensions.
   * @returns {{signature: string, timestamp: string}} An object containing the hex signature and the timestamp used.
   */
  generateSignature(data) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${this.publicKey}:${timestamp}`;

    try {
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(message);
      const signatureHex = hmac.digest('hex');
      return { signature: signatureHex, timestamp: timestamp };
    } catch (error) {
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  // Add other methods here as needed
}

module.exports = Wayu; 