# Token encryption at rest — SEC-1a

**Status:** implemented (foundation)
**Scope:** dual-read + dual-write temporary; **no** production backfill; **no** plaintext null-out.

## Purpose

Protect Meta access tokens stored on `WhatsappPhoneNumber` using AES-256-GCM in the application, with a key held outside the database.

SEC-1a still **dual-writes plaintext** into `access_token` so an old deploy can roll back and keep sending. Dual-write does **not** end at-rest risk; it only enables a safe migration path.

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

## Dual-read

1. If `access_token_encrypted` is present → decrypt; on failure **fail closed** (never fall back to plaintext).
2. If encrypted is absent → use legacy `access_token`.
3. If both absent → credential unavailable (same as before).

Presence checks (`hasToken`) use either field **without** decryption.

## Dual-write (temporary)

Every new/replaced token write sets **both**:

- `access_token_encrypted` = AES-GCM payload
- `access_token` = plaintext (rollback compatibility)

If encryption fails (missing/invalid key), the **entire write fails** — plaintext-only writes are not allowed in SEC-1a.

Production must provision the encryption key **before** operators activate or connect new channels after this deploy.

## Behaviour without key

| Operation | Behaviour |
|-----------|-----------|
| Read legacy plaintext rows | Works |
| Read encrypted rows | Fail closed for that line (no Graph send) |
| New token write | Fail closed (`ENCRYPTION_KEY_MISSING`) |
| App startup | Remains available (no fail-fast in SEC-1a) |

## Invalid ciphertext

Tampering, wrong key, unknown key id, or corrupt payload → decrypt error. Outbound for that line stops. Legacy plaintext on the same row is **ignored** when encrypted is present.

## Rollback of SEC-1a deploy

1. Redeploy previous application version.
2. Old code reads `access_token` only (still populated by dual-write).
3. Leave `access_token_encrypted` column in place (ignored).
4. Do **not** reverse the additive migration.
5. Do **not** delete ciphertext or re-run data mutations.

## Future sequence

1. Provision encryption key in each environment.
2. Deploy SEC-1a (this slice).
3. Validate staging (activate + send with dual-write).
4. Soak production.
5. **SEC-1b:** backfill encrypt existing plaintext (idempotent batches; dry-run default).
6. **SEC-1c:** stop writing plaintext.
7. **SEC-1d:** null-out / drop legacy column after stability.

## Code map

| Concern | Path |
|---------|------|
| Crypto | `src/lib/secrets/tokenEncryption.ts` |
| Keyring env | `src/lib/secrets/tokenEncryptionKeyring.ts` |
| Dual-read/write | `src/modules/whatsapp/lineAccessToken.ts` |
| Writes | `whatsappChannelLifecycle`, `PATCH /api/tenants/me`, `onboard/callback` |
| Reads | `whatsappPhoneResolution`, auto-heal, outbound via `ResolvedTenant` |

## Graph credential validation

`validateWhatsappCloudCredentials` sends `Authorization: Bearer <token>` and **must not** put the token in the URL query string.
