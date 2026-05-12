---
name: community-cancel
description: Cancel (delete) a previous community NEED or OFFER post the user made from this device. Works for both — calls the backend's signed delete endpoint using the ephemeral key the original post was signed with. Use whenever the user wants to take down, withdraw, retract, remove, or cancel something they previously posted.
---

# Community Cancel

Withdraws a previous community post. Each post was signed with a fresh ephemeral keypair stored locally; this skill re-signs a deletion request with the same key so the backend can verify and hard-delete the record.

## When to use

When the user wants to cancel, withdraw, retract, take down, or remove a community post they made. Works for both NEEDs and OFFERs — the skill auto-detects which.

## Conversation flow

**Step 1 — list, then pick.** If the user hasn't already pointed at a specific post, call the `run_js` tool with **no `messageId`** to list cancellable posts:

- skill_name: `community-cancel`
- script_name: `index.html`
- data: `{}` (empty)

The skill returns `{ posts: [...] }` where each entry has `messageId`, `type` (`NEED`/`OFFER`), `categoryName`, and `timestamp`. Show the user the choices in plain English (e.g. *"You have two open posts: an offer of fresh vegetables from yesterday, and a request for a winter coat from this morning. Which one should I cancel?"*) and wait for their reply. **Do not** mention messageIds, codes, or internal fields.

If the list is empty, tell the user there's nothing to cancel from this device and stop.

**Step 2 — cancel.** Once the user has picked, call the `run_js` tool again with:

- skill_name: `community-cancel`
- script_name: `index.html`
- data: `{"messageId":"<the chosen messageId>"}`

You may also pass `{"latest": true}` to cancel the most recent post without first listing — use this only when the user clearly means "the last one I posted".

**Step 3 — confirm or report failure.** Look at the return value:

- `{ ok: true, cancelled: { type, categoryName } }` → succeeded. Reply with one short sentence: e.g. *"Cancelled — your offer of fresh vegetables has been removed."*
- `{ error: ... }` → failed. Tell the user it failed and include the error verbatim. Do **not** claim success.

## Notes

- Only posts originally made from **this device** can be cancelled — the signing key is local and was never sent to the backend.
- A successful cancel also clears the local key entry so it won't appear in future `community-pulse` queries.
- Posts made before this skill was installed may lack a stored private key and cannot be cancelled; the skill will report that explicitly.
