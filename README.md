# Wayu JS SDK

The official Wayu Pay JavaScript SDK for accepting payments in Venezuela (Pago Móvil and C2P). Generate payment links, receive webhook notifications, and manage multi-merchant payments.

[![npm version](https://badge.fury.io/js/wayu-js-sdk.svg)](https://badge.fury.io/js/wayu-js-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Wayu Pay lets you accept payments in Venezuela with a simple API. This SDK handles authentication (HMAC-SHA256 signatures), payment link generation, and webhook signature verification.

- **Payment Links**: Generate checkout URLs in USD or VES
- **Webhooks**: Verify and process real-time payment notifications
- **Multi-Merchant**: Route payments to different merchants from a single integration

## Installation

```bash
npm install wayu-js-sdk
# or
yarn add wayu-js-sdk
# or
pnpm add wayu-js-sdk
```

## Usage

### Initialize the client

```javascript
// CommonJS
const WayuPay = require('wayu-js-sdk');

// ESM
import WayuPay from 'wayu-js-sdk';

const wayu = new WayuPay({
  publicKey: 'pk_sbox_...',
  secretKey: 'sk_sbox_...',
});

// Optional: use sandbox explicitly or override base URL
const wayuProd = new WayuPay({
  publicKey: 'pk_live_...',
  secretKey: 'sk_live_...',
  sandbox: false, // or baseUrl: 'https://services-wayu-checkout-production.up.railway.app'
});
```

### Generate a payment link

```javascript
const result = await wayu.checkout.generatePaymentUrl({
  amount: { value: 25.0, currency: 'USD' },
  product_name: 'Plan Pro',
  product_description: 'Suscripción mensual',
});

// Save the transactionId in your system
await saveTransaction(result.transactionId);

// Redirect the user to checkout
// window.location.href = result.generatePaymentLink;
console.log(result.generatePaymentLink);
console.log(result.transactionId);
```

### Multi-merchant

```javascript
const result = await wayu.checkout.generatePaymentUrl({
  amount: { value: 50.0, currency: 'USD' },
  product_name: 'Producto del Merchant',
  product_description: 'El pago va directo al merchant',
  merchant_id: 'merch_001',
});
```

### Verify webhook signatures

Webhook validation uses a single scheme:

1. **X-Signature**: `HMAC-SHA256(raw_body_bytes, webhookSecret)`

```javascript
app.post('/api/webhooks/wayu', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const isValid = wayu.validateWebhook(
    req.headers,
    rawBody,
    process.env.WAYU_WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, transactionId, data } = JSON.parse(rawBody);

  switch (event) {
    case 'payment.completed':
      // Update transaction status in your database
      break;
    case 'payment.failed':
      // Notify user of failure
      break;
    case 'payment.expired':
      break;
    case 'payment.refunded':
      break;
  }

  res.status(200).json({ received: true });
});
```

### Webhook events

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment was successful |
| `payment.failed` | Payment failed |
| `payment.expired` | Payment link expired |
| `payment.refunded` | Payment was refunded |

## API Reference

### `new WayuPay(config)`

Creates a new Wayu Pay client.

- `config.publicKey` (string, required): Your public API key
- `config.secretKey` (string, required): Your secret API key
- `config.baseUrl` (string, optional): Override the API base URL
- `config.sandbox` (boolean, optional): Use sandbox environment (auto-detected from `pk_sbox` prefix if not set)

### `wayu.checkout.generatePaymentUrl(params)`

Generates a payment link.

- `params.amount` (object, required): `{ value: number, currency: 'USD' | 'VES' }`
- `params.product_name` (string, required): Product name
- `params.product_description` (string, optional): Product description
- `params.merchant_id` (string, optional): Merchant ID for multi-merchant

Returns: `Promise<{ generatePaymentLink: string, transactionId: string }>`

### `wayu.validateWebhook(headers, body, webhookSecret)`

Validates webhook signature using `X-Signature` and the exact raw body bytes.

Returns: `boolean`

### `wayu.generateSignature()`

Generates HMAC-SHA256 signature for API requests (used internally).

Returns: `{ signature: string, timestamp: string }`

## Security

- **Never expose your secret key** in frontend code. Always call the SDK from your backend.
- Sandbox keys start with `pk_sbox` and `sk_sbox`.
- The timestamp in API requests must be within the last 5 minutes to prevent replay attacks.

## License

[MIT](https://opensource.org/licenses/MIT)
