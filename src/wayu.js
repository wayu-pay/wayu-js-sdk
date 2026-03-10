const crypto = require('crypto');

const DEFAULT_BASE_URL_PRODUCTION = 'https://services-wayu-checkout-production.up.railway.app';
const DEFAULT_BASE_URL_SANDBOX = 'https://services-wayu-checkout-sandbox.up.railway.app';

class WayuPay {
  /**
   * Initializes the Wayu Pay client.
   * @param {object} config - Configuration object.
   * @param {string} config.publicKey - The public identifier for the client.
   * @param {string} config.secretKey - The secret key used for HMAC signing.
   * @param {string} [config.baseUrl] - Override the API base URL.
   * @param {boolean} [config.sandbox] - Use sandbox environment (default: auto-detected from publicKey if it starts with pk_sbox).
   */
  constructor(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration object with publicKey and secretKey is required.');
    }
    const { publicKey, secretKey, baseUrl, sandbox } = config;
    if (!publicKey || !secretKey) {
      throw new Error('publicKey and secretKey are required.');
    }
    this.publicKey = publicKey;
    this.secretKey = secretKey;

    if (baseUrl) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
    } else {
      const useSandbox = sandbox ?? publicKey.startsWith('pk_sbox');
      this.baseUrl = useSandbox ? DEFAULT_BASE_URL_SANDBOX : DEFAULT_BASE_URL_PRODUCTION;
    }

    this.checkout = {
      generatePaymentUrl: this._generatePaymentUrl.bind(this),
    };
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
   * Generates a payment URL for checkout.
   * @param {object} params - Payment parameters.
   * @param {object} params.amount - Amount object.
   * @param {number} params.amount.value - Payment amount.
   * @param {string} params.amount.currency - "USD" or "VES".
   * @param {string} params.product_name - Product name.
   * @param {string} [params.product_description] - Product description.
   * @param {string} [params.merchant_id] - Merchant ID (for multi-merchant).
   * @returns {Promise<{generatePaymentLink: string, transactionId: string}>} The checkout URL and transaction ID.
   */
  async _generatePaymentUrl(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Payment parameters are required.');
    }
    const { amount, product_name, product_description, merchant_id } = params;

    if (!amount || typeof amount !== 'object') {
      throw new Error('amount with value and currency is required.');
    }
    const { value, currency } = amount;
    if (typeof value !== 'number' || value <= 0) {
      throw new Error('amount.value must be a positive number.');
    }
    if (!currency || !['USD', 'VES'].includes(currency)) {
      throw new Error('amount.currency must be "USD" or "VES".');
    }
    if (!product_name || typeof product_name !== 'string') {
      throw new Error('product_name is required and must be a string.');
    }

    const body = {
      amount: { value, currency },
      product_name,
      ...(product_description != null && { product_description }),
      ...(merchant_id != null && { merchant_id }),
    };

    const { signature, timestamp } = this.generateSignature();
    const url = `${this.baseUrl}/checkout/generate-payment-url`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Public-Key': this.publicKey,
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wayu API error (${response.status}): ${text || response.statusText}`);
    }

    const data = await response.json();
    if (!data.payment_url || !data.transaction_id) {
      throw new Error('Invalid response from Wayu API: missing payment_url or transaction_id.');
    }
    return {
      generatePaymentLink: data.payment_url,
      transactionId: data.transaction_id,
    };
  }

  /**
   * Validates a webhook signature.
   * Supports two header schemes for backward compatibility:
   *
   * 1. X-Webhook-Signature (docs): HMAC-SHA256(JSON.stringify(payload), webhookSecret)
   * 2. x-signature (legacy): HMAC-SHA256(timestamp:payload_json_sorted, webhookSecret)
   *    - Payload must contain 'timestamp' property; it is excluded from the signed JSON
   *
   * @param {object} headers - The request headers. Must contain 'x-webhook-signature' or 'x-signature'.
   * @param {object|string} body - The request body (object or JSON string).
   * @param {string} webhookSecret - The webhook secret used to validate the signature.
   * @returns {boolean} True if the signature is valid, false otherwise.
   * @throws {Error} If required parameters are missing or invalid.
   */
  validateWebhook(headers, body, webhookSecret) {
    if (!headers || typeof headers !== 'object') {
      throw new Error('Headers must be an object.');
    }
    if (!body) {
      throw new Error('Body is required.');
    }
    if (!webhookSecret || typeof webhookSecret !== 'string') {
      throw new Error('Webhook secret must be a non-empty string.');
    }

    const headersLower = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );
    const webhookSig = headersLower['x-webhook-signature'];
    const legacySig = headersLower['x-signature'];

    let signatureHeader;
    let useLegacyAlgorithm = false;
    if (webhookSig && typeof webhookSig === 'string') {
      signatureHeader = webhookSig;
    } else if (legacySig && typeof legacySig === 'string') {
      signatureHeader = legacySig;
      useLegacyAlgorithm = true;
    } else {
      throw new Error('Either x-webhook-signature or x-signature header is required.');
    }

    const receivedSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.substring(7)
      : signatureHeader;

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

    let message;
    if (useLegacyAlgorithm) {
      if (!payload.timestamp && payload.timestamp !== 0) {
        throw new Error('Body must contain a timestamp property for x-signature validation.');
      }
      const timestamp = String(payload.timestamp);
      const payloadForSigning = { ...payload };
      delete payloadForSigning.timestamp;
      const sortedKeys = Object.keys(payloadForSigning).sort();
      const sortedPayload = {};
      for (const key of sortedKeys) {
        sortedPayload[key] = payloadForSigning[key];
      }
      message = `${timestamp}:${JSON.stringify(sortedPayload)}`;
    } else {
      message = JSON.stringify(payload);
    }

    try {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(message);
      const calculatedSignature = hmac.digest('hex');

      const receivedBuffer = Buffer.from(receivedSignature, 'hex');
      const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');
      if (receivedBuffer.length !== calculatedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
    } catch (error) {
      throw new Error(`Failed to validate webhook signature: ${error.message}`);
    }
  }
}

module.exports = WayuPay; 