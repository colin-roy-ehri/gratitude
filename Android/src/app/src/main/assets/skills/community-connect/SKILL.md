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

- script name: `index.html`
- data: A JSON string with:
  - **recipientPublicKey**: Required. The `theirPublicKey` from the match (community-inbox returns this).
  - **yourMessageId**: Required. The `yourMessageId` from the match — used to look up the signing key for the matched post.
  - **contactText**: Required. The plaintext contact details to share.

## Output

```json
{ "ok": true, "contactRecordId": "..." }
```

On success, tell the user *"Sent — they'll see your contact next time they check their inbox."* Do not echo the contact text back.

On error, return the error verbatim and do not claim success.
