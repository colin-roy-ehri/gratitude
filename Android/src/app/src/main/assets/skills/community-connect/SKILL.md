---
name: community-connect
description: Share the user's contact details with someone who matched on one of their community posts. Encrypts the message client-side using libsodium sealed-box so only the recipient can read it. Use ONLY after the user has explicitly agreed to share contact info — typically prompted by community-inbox when a match appears.
---

# Community Connect

Encrypts a plaintext contact string for a specific recipient ephemeral pubkey and POSTs to `/v1/contact/share`. The recipient sees it as an encrypted inbox item; their `community-inbox` skill decrypts it.

## When to use

ONLY after the user has explicitly agreed to share their contact info with a matched user. Never call autonomously. The typical flow is:

1. `community-inbox` returned a match.
2. You asked: *"Want to share your contact info with the person who needs X?"*
3. The user said yes and provided contact text (e.g. *"phone 555-1234, or email me@example.com"*).
4. Then you call this skill.

## Instructions

Call the `run_js` tool with:

- skill_name: `community-connect`
- script_name: `index.html`
- data: A JSON string with **exactly two fields**:
  - **matchToken**: Required. The short `matchToken` (e.g. `"M1"`) returned by `community-inbox` for this match. Copy it verbatim.
  - **contactText**: Required. The plaintext contact details the user gave you (e.g. `"phone 555-1234, email me@example.com"`).

Do **not** pass `recipientPublicKey`, `theirPublicKey`, `yourMessageId`, or any keys/IDs — those are looked up on-device from the matchToken. Passing them is unnecessary and will be ignored.

## Output

```json
{ "ok": true, "contactRecordId": "..." }
```

On success, tell the user *"Sent — they'll see your contact next time they check their inbox."* Do not echo the contact text back.

On error, return the error verbatim and do not claim success.
