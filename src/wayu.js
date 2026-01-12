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

  /**
   * Validates a webhook signature.
   * The signature is calculated from the timestamp and payload JSON (with sorted keys).
   * The message signed is constructed as "timestamp:payload_json".
   * 
   * @param {object} headers - The request headers object. Must contain 'x-signature' header.
   * @param {object|string} body - The request body. Can be an object or JSON string. Must contain 'timestamp' property.
   * @param {string} webhookSecret - The webhook secret used to validate the signature.
   * @returns {boolean} True if the signature is valid, false otherwise.
   * @throws {Error} If required parameters are missing or invalid.
   */
  validateWebhook(headers, body, webhookSecret) {
    // Validate parameters
    if (!headers || typeof headers !== 'object') {
      throw new Error('Headers must be an object.');
    }
    if (!body) {
      throw new Error('Body is required.');
    }
    if (!webhookSecret || typeof webhookSecret !== 'string') {
      throw new Error('Webhook secret must be a non-empty string.');
    }

    // Extract signature from headers
    const signatureHeader = headers['x-signature'] || headers['X-Signature'];
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      throw new Error('x-signature header is required.');
    }

    // Remove 'sha256=' prefix if present
    const receivedSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.substring(7)
      : signatureHeader;

    // Parse body if it's a string
    let payload;
    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch (error) {
        throw new Error(`Invalid JSON in body: ${error.message}`);
      }
    } else {
      payload = body;
    }

    // Extract timestamp from payload
    if (!payload.timestamp && payload.timestamp !== 0) {
      throw new Error('Body must contain a timestamp property.');
    }
    const timestamp = String(payload.timestamp);

    // Create a copy of payload without timestamp and sort keys
    const payloadForSigning = { ...payload };
    delete payloadForSigning.timestamp;

    // Sort keys and stringify (equivalent to json.dumps with sort_keys=True)
    const sortedKeys = Object.keys(payloadForSigning).sort();
    const sortedPayload = {};
    for (const key of sortedKeys) {
      sortedPayload[key] = payloadForSigning[key];
    }
    const payloadJson = JSON.stringify(sortedPayload);

    // Build the message to sign: timestamp:payload_json
    const message = `${timestamp}:${payloadJson}`;

    try {
      // Calculate HMAC-SHA256
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(message);
      const calculatedSignature = hmac.digest('hex');

      // Compare signatures using timing-safe comparison
      // Convert both to Buffer for timingSafeEqual
      const receivedBuffer = Buffer.from(receivedSignature, 'hex');
      const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');

      // If lengths differ, signatures don't match
      if (receivedBuffer.length !== calculatedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
    } catch (error) {
      throw new Error(`Failed to validate webhook signature: ${error.message}`);
    }
  }
}

module.exports = Wayu; 