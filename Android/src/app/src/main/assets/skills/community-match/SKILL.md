---
name: community-match
description: Quick, fast check for matches against the user's own community posts. Runs deterministic matching server-side; if a match is found it's pushed to the user's inbox. Use this silently after the user posts something, or when the user asks "any new matches?". For decrypting inbox notifications, use community-inbox.
---

# Community Match

Triggers the backend's deterministic match routine. Cheap (no LLM call). Returns the raw match list and counts. When the backend finds a new match it ALSO pushes a notification into the inbox of both parties — read that with `community-inbox`.

## When to use

- Right after a user posts a NEED or OFFER (this skill is chained automatically from those).
- When the user asks "any new matches?" — but prefer `community-inbox` because that one decrypts contact info too.
- When the chat is first opened (background refresh).

## Instructions

Call the `run_js` tool with:

- script name: `index.html`
- data: `{}` (no parameters)

## Output

```json
{
  "myKeyCount": 3,
  "myMessageCount": 3,
  "globalMessageCount": 42,
  "matches": [ { "leftMessageId": "...", "rightMessageId": "...", "score": 0.8, "reason": "..." } ]
}
```

If `matches` is empty, say nothing — this skill is meant to run silently. If matches are present, recommend the user check their inbox: *"You have a new match — want me to check your inbox?"*
