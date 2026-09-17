# Wayu Pay SDK

Official JavaScript SDK for Wayu Pay — accept payments in Venezuela (Pago Móvil C2P/P2P).

## Install

```bash
npm install wayu-js-sdk
```

## Quick start

```javascript
const WayuPay = require('wayu-js-sdk');

const wayu = new WayuPay({
  publicKey: process.env.WAYU_PUBLIC_KEY,
  secretKey: process.env.WAYU_SECRET_KEY,
  // sandbox: true, // auto-detected from pk_sbox_* keys
});
```

### Generate a payment link

```javascript
const result = await wayu.checkout.generatePaymentUrl({
  amount: { value: 25.0, currency: 'USD' },
  product_name: 'Plan Pro',
  product_description: 'Suscripción mensual',
});

await saveTransaction(result.transactionId);
console.log(result.generatePaymentLink);
```

### Request a refund (C2P / P2P)

Refunds return funds to the original payer via Pago Móvil P2P. Only `succeeded` or `partially_refunded` C2P/P2P transactions are eligible. Omit `amount` to refund the remaining balance.

```javascript
const refund = await wayu.checkout.requestRefund({
  transactionId: 'cda07872-2321-4963-b8d2-8d78ddd2aad6',
  // amount: 100.5, // optional partial amount in VES
  reason: 'Customer request',
});

console.log(refund.refund_id, refund.transaction_status);
```

### Verify webhook signatures

Prefer verifying over the **raw HTTP body bytes** (`HMAC-SHA256(webhook_secret, raw_body)`). The SDK helper also accepts a parsed object (it re-stringifies with `JSON.stringify`), which can diverge from the exact bytes Wayu signed — use the raw body string in production.

Both `x-signature` and `x-webhook-signature` are supported; `x-signature` wins if both are present. An optional `sha256=` prefix is stripped.

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

  const payload = JSON.parse(rawBody);
  // Payment success: status === "succeeded"
  // Refund: status === "refunded" | "partially_refunded"
  //   with refund_id and refund_amount; amount is the original order amount
  const { transaction_id, status, amount, refund_id, refund_amount } = payload;

  res.status(200).json({ received: true });
});
```

### Webhook payload

| Field | When | Description |
|-------|------|-------------|
| `transaction_id` | always | Transaction UUID |
| `status` | always | `succeeded`, `refunded`, or `partially_refunded` |
| `amount` | always | Original order amount (VES) |
| `timestamp` | always | Unix seconds |
| `refund_id` | refund | Refund UUID |
| `refund_amount` | refund | Amount refunded in this event (VES) |

## API Reference

### `new WayuPay(config)`

- `config.publicKey` (string, required)
- `config.secretKey` (string, required)
- `config.baseUrl` (string, optional)
- `config.sandbox` (boolean, optional): auto-detected from `pk_sbox` prefix if omitted

### `wayu.checkout.generatePaymentUrl(params)`

- `params.amount` `{ value: number, currency: 'USD' | 'VES' | 'EUR' }`
- `params.product_name` (string, required)
- `params.product_description` (string, optional)
- `params.merchant_id` (string, optional)

Returns: `Promise<{ generatePaymentLink: string, transactionId: string }>`

### `wayu.checkout.requestRefund(params)`

- `params.transactionId` (string, required)
- `params.amount` (number, optional): partial amount in VES; omit for remaining balance
- `params.reason` (string, optional)
- `params.idempotencyKey` (string, optional): generated if omitted

Returns: `Promise` with Checkout refund response (`refund_id`, `transaction_id`, `amount`, `currency`, `status`, `transaction_status`, …).

### `wayu.validateWebhook(headers, body, webhookSecret)`

Returns: `boolean`

### `wayu.generateSignature()`

Returns: `{ signature: string, timestamp: string }`

## Security

- **Never expose your secret key** in frontend code. Always call the SDK from your backend.
- Sandbox keys start with `pk_sbox` and `sk_sbox`.
- The timestamp in API requests must be within the last 5 minutes to prevent replay attacks.

## License

[MIT](https://opensource.org/licenses/MIT)
