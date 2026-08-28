const { describe, it, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const WayuPay = require('../src/wayu');

describe('WayuPay defaults', () => {
  it('uses api.wayu.app for production keys', () => {
    const client = new WayuPay({
      publicKey: 'pk_live_test',
      secretKey: 'sk_live_test',
    });
    assert.equal(client.baseUrl, 'https://api.wayu.app');
  });

  it('uses api-sandbox.wayu.app for sandbox keys', () => {
    const client = new WayuPay({
      publicKey: 'pk_sbox_test',
      secretKey: 'sk_sbox_test',
    });
    assert.equal(client.baseUrl, 'https://api-sandbox.wayu.app');
  });
});

describe('WayuPay generatePaymentUrl currency', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockOkFetch(assertBody) {
    global.fetch = mock.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      if (assertBody) {
        assertBody(body);
      }
      return {
        ok: true,
        json: async () => ({
          payment_url: 'https://pay.wayu.app/?ott=tok',
          transaction_id: 'txn-1',
        }),
      };
    });
  }

  it('accepts EUR and normalizes lowercase', async () => {
    mockOkFetch((body) => {
      assert.equal(body.amount.currency, 'EUR');
      assert.equal(body.amount.value, 20);
    });

    const client = new WayuPay({
      publicKey: 'pk_sbox_test',
      secretKey: 'sk_sbox_test',
      baseUrl: 'https://example.test',
    });

    const result = await client.checkout.generatePaymentUrl({
      amount: { value: 20, currency: 'eur' },
      product_name: 'Plan Euro',
    });

    assert.equal(result.generatePaymentLink, 'https://pay.wayu.app/?ott=tok');
    assert.equal(result.transactionId, 'txn-1');
  });

  it('accepts USD and VES', async () => {
    for (const currency of ['USD', 'VES']) {
      mockOkFetch((body) => {
        assert.equal(body.amount.currency, currency);
      });
      const client = new WayuPay({
        publicKey: 'pk_sbox_test',
        secretKey: 'sk_sbox_test',
        baseUrl: 'https://example.test',
      });
      await client.checkout.generatePaymentUrl({
        amount: { value: 10, currency },
        product_name: 'Plan',
      });
    }
  });

  it('rejects unsupported currencies', async () => {
    const client = new WayuPay({
      publicKey: 'pk_sbox_test',
      secretKey: 'sk_sbox_test',
      baseUrl: 'https://example.test',
    });

    await assert.rejects(
      () =>
        client.checkout.generatePaymentUrl({
          amount: { value: 10, currency: 'GBP' },
          product_name: 'Plan',
        }),
      /amount\.currency must be "USD", "VES", or "EUR"/
    );
  });
});
