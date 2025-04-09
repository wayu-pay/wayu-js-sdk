# Wayu JS SDK

A lightweight JavaScript SDK for generating HMAC-SHA256 signatures, typically used for authenticating API requests.

[![npm version](https://badge.fury.io/js/wayu-js-sdk.svg)](https://badge.fury.io/js/wayu-js-sdk) <!-- Placeholder - Replace 'wayu-js-sdk' if package name differs -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Assuming MIT License -->

## Overview

This SDK provides a simple interface to generate time-sensitive HMAC-SHA256 signatures. It takes a public key (identifier) and a secret key, combines the public key with the current timestamp to create a message, and then signs this message using the secret key with the HMAC-SHA256 algorithm. The resulting signature (in hexadecimal format) and the timestamp can then be sent, for example, in request headers for server-side validation.

This method is commonly used to verify the authenticity and integrity of a request and to prevent replay attacks.

## Installation

```bash
npm install wayu-js-sdk
# or
yarn add wayu-js-sdk
# or
pnpm add wayu-js-sdk
```

*(Note: Replace `wayu-js-sdk` with the actual package name if you publish it under a different name.)*

## Usage

First, import the SDK:

```javascript
// CommonJS (Node.js default)
const wayu = require('wayu-js-sdk');

// If you prefer direct class access:
// const { Wayu } = require('wayu-js-sdk');
```

Next, initialize the SDK with your public key and secret key:

```javascript
const publicKey = 'YOUR_PUBLIC_KEY';    // Provided by the service you're authenticating with
const secretKey = 'YOUR_SECRET_KEY'; // Keep this secure!

try {
  const wayuClient = wayu(publicKey, secretKey);

  // Or using the class directly:
  // const wayuClient = new Wayu(publicKey, secretKey);

} catch (error) {
  console.error('Initialization failed:', error.message);
}
```

Now, you can generate a signature:

```javascript
if (wayuClient) {
  try {
    const { signature, timestamp } = wayuClient.generateSignature();

    console.log('Generated Signature (hex):', signature);
    console.log('Timestamp Used:', timestamp);

    // Example: Use these in an API request header
    const headers = {
      'X-Auth-Key': publicKey,
      'X-Auth-Timestamp': timestamp,
      'X-Auth-Signature': signature,
      'Content-Type': 'application/json'
    };

    // fetch('/api/resource', { headers: headers, ... })

  } catch (error) {
    console.error('Signature generation failed:', error.message);
  }
}
```

### How it Works

1.  The `generateSignature()` method gets the current Unix timestamp (in seconds).
2.  It constructs a message string by concatenating the `publicKey`, a colon (`:`), and the `timestamp`.
3.  It uses Node.js's built-in `crypto` module to create an HMAC-SHA256 hash of the message, using your `secretKey`.
4.  It returns the resulting signature as a hexadecimal string, along with the timestamp used to generate it.

### Security Considerations

*   **Secret Key Management:** The `secretKey` should be treated with extreme care. Avoid hardcoding it directly in your client-side code if this SDK is used in a browser environment. Ideally, the signature generation should happen server-side, or the secret key should be scoped tightly and managed securely (e.g., environment variables, secrets management services).
*   **Timestamp Validation:** The server receiving the request should validate the timestamp to ensure it's within an acceptable window (e.g., 5 minutes) to prevent replay attacks.

## API Reference

### `wayu(publicKey, secretKey)`

Factory function to create a new `Wayu` instance.

*   `publicKey` (string): Your public identifier.
*   `secretKey` (string): Your secret key for signing.
*   **Returns:** A new `Wayu` instance.
*   **Throws:** `Error` if `publicKey` or `secretKey` are missing.

### `wayuClient.generateSignature()`

Generates the HMAC-SHA256 signature.

*   **Returns:** `object` - An object containing:
    *   `signature` (string): The HMAC-SHA256 signature in hexadecimal format.
    *   `timestamp` (string): The Unix timestamp (seconds) used for generating the signature.
*   **Throws:** `Error` if signature generation fails.

### `Wayu` (Class)

The underlying class. Can be accessed via `require('wayu-js-sdk').Wayu`.

*   `new Wayu(publicKey, secretKey)`: Constructor (same parameters as the factory function).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](https://opensource.org/licenses/MIT)
