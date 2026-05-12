---
name: community-inbox
description: Check the user's inbox for new matches on their community posts and any encrypted contact info that other users shared with them. Decrypts contact_info messages client-side using the local private key. Use whenever the user asks "any matches?", "did anyone reply?", "any messages for me?", or to surface incoming connections.
---

# Community Inbox

Polls the backend inbox for every ephemeral pubkey stored on this device, decrypts any sealed-box `contact_info` messages, marks surfaced items as read, and returns three buckets: matches, decrypted contact info, and plaintext.

## When to use

- "Any new matches?"
- "Did anyone respond to my post?"
- "Any messages?"
- Default-on: the model should call this at the start of free-form chat turns when the user is checking on their community state.

## Instructions

Call the `run_js` tool with:

- skill_name: `community-inbox`
- script_name: `index.html`
- data: `{}` (no parameters)

## Output

```json
{
  "matches": [
    {
      "inboxId": "...",
      "yourMessageId": "...",
      "theirMessageId": "...",
      "theirPublicKey": "...",
      "reason": "exact UNSPSC match on 50101900",
      "score": 0.8,
      "categoryName": "Fresh vegetables",
      "contactShared": false
    }
  ],
  "contactInfo": [
    { "inboxId": "...", "fromPublicKey": "...", "plaintext": "..." }
  ],
  "text": [
    { "inboxId": "...", "fromPublicKey": "...", "content": "..." }
  ]
}
```

## Conversation flow

**1. Summarize matches.** For each `match`, describe it in plain English using `categoryName` if present: *"You have a match on your offer of fresh vegetables — someone nearby is looking for the same thing."*

**2. If `contactShared` is false, OFFER the contact-share flow.** Ask: *"Want to share your contact info with them?"* If the user says yes, call the `community-connect` skill with `theirPublicKey` and `yourMessageId`. If no, do nothing — they can come back to it later.

**3. Decrypted contact info.** If `contactInfo` is non-empty, that means someone shared their contact details with the user. Read out each `plaintext` so the user can save it.

**4. Plaintext messages.** If `text` is non-empty, paraphrase the content.

If everything is empty, say something gentle like *"Nothing new in your inbox right now."* Do not mention inbox IDs, public keys, or any hex/base64 strings.
