# Token encryption at rest — SEC-1-final

**Status:** encrypt-only (plaintext column removed)
**Scope:** AES-256-GCM at rest; no dual-read; no dual-write; no legacy `access_token`.

## Purpose

Protect Meta access tokens stored on `WhatsappPhoneNumber` using AES-256-GCM in the application, with a key held outside the database.

SEC-1-final **does not** store plaintext. New and replaced tokens write only `access_token_encrypted`. Rows without a credential (e.g. `PENDING_ACTIVATION`) keep `access_token_encrypted` **NULL**.

## Key format

| Env | Meaning |
|-----|---------|
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Base64 encoding of **exactly 32 raw bytes** |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY_ID` | Non-empty key id (e.g. `k1`) embedded in ciphertext |
| `WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS_KEY` | Optional previous key (base64, 32 bytes) for decrypt rotation |
| `WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS_KEY_ID` | Previous key id (must differ from current) |

Generate (local / ops — do not commit the value):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use **distinct** keys per environment (local, preview, production).

## Ciphertext format

Compact versioned payload:

`dfwa1.<keyId>.<nonce_b64url>.<ciphertext_b64url>.<tag_b64url>`

- Algorithm: AES-256-GCM
- Nonce: 12 random bytes per encryption
- Auth tag: 16 bytes

Stored in `whatsapp_phone_numbers.access_token_encrypted` (nullable).

## Read / write

1. Write: encrypt plaintext from the request/OAuth exchange → store only `access_token_encrypted`.
2. Read: decrypt `access_token_encrypted`; on failure **fail closed**.
3. Missing encrypted → credential unavailable.
4. Presence checks (`hasToken`) use the encrypted field **without** decryption.

If encryption fails (missing/invalid key), the **entire write fails**.

## Behaviour without key

| Operation | Behaviour |
|-----------|-----------|
| Read encrypted rows | Fail closed for that line |
| New token write | Fail closed (`ENCRYPTION_KEY_MISSING`) |
| PENDING without credential | OK (`access_token_encrypted` null) |
| App startup | Remains available (no fail-fast) |

## Invalid ciphertext

Tampering, wrong key, unknown key id, or corrupt payload → decrypt error. Outbound for that line stops.

## Rollback notes

- Restoring an old deploy that expected `access_token` requires recreating that column (not a one-command rollback).
- Prefer reconnecting channels via the application after restore.
- Do **not** reverse additive history lightly; treat backup as emergency recovery.

## Production cutover (wipe path)

When disposable connections may be discarded:

1. Backup + inventory IDs/counts.
2. Transactional wipe of phone rows and line-scoped inbox dependents.
3. Deploy encrypt-only code + `DROP COLUMN access_token`.
4. Reconnect one channel via the app; validate encrypted-only.

There is **no** SEC-1b backfill on this path.

## Code map

| Concern | Path |
|---------|------|
| Crypto | `src/lib/secrets/tokenEncryption.ts` |
| Keyring env | `src/lib/secrets/tokenEncryptionKeyring.ts` |
| Encrypt-only helpers | `src/modules/whatsapp/lineAccessToken.ts` |
| Writes | `whatsappChannelLifecycle`, `PATCH /api/tenants/me`, `onboard/callback` |
| Reads | `whatsappPhoneResolution`, auto-heal, outbound via `ResolvedTenant` |

## Graph credential validation

`validateWhatsappCloudCredentials` sends `Authorization: Bearer <token>` and **must not** put the token in the URL query string.
