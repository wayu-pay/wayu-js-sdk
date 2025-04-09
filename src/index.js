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
    // No longer assume PEM format, these are strings used for HMAC
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
    // Generate timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Create the message to sign (publicKey:timestamp)
    const message = `${this.publicKey}:${timestamp}`;
    console.log("Message to sign:", message);

    try {
      // Create an HMAC-SHA256 hash
      const hmac = crypto.createHmac('sha256', this.secretKey);

      // Update the HMAC object with the message
      hmac.update(message);

      // Calculate the digest in hexadecimal format
      const signatureHex = hmac.digest('hex');

      console.log("HMAC-SHA256 Signature generated successfully (hex):", signatureHex);

      // Return the hex signature and the timestamp
      return { signature: signatureHex, timestamp: timestamp };

    } catch (error) {
      console.error("Error generating HMAC signature:", error);
      // Re-throw or handle error appropriately
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  // Add other methods here as needed
}

// Export the Wayu class for instantiation
module.exports = (publicKey, secretKey) => {
  return new Wayu(publicKey, secretKey);
};

// Also allow direct class usage if preferred
module.exports.Wayu = Wayu;
