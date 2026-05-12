---
name: unspsc-search
description: INTERNAL HELPER — do not call this skill directly in the agent chat. The community-offer and community-need skills already perform UNSPSC lookup internally; use them instead. This skill exists only for diagnostic / manual probing via the Skill Tester.
---

# UNSPSC Search (internal)

This is an internal diagnostic skill. Its data and ONNX model are reused by the `community-offer` and `community-need` skills, which combine code lookup and posting into a single user-friendly call.

**Do not call this skill from the agent chat.** Always prefer `community-offer` (for things the user wants to share) or `community-need` (for things the user is requesting). They handle category resolution internally and never expose codes to the user.

## If you really need to probe it

Call the `run_js` tool with:

- skill_name: `unspsc-search`
- script_name: `index.html`
- data: `{"query": "<formatted query>"}`

Returns top-5 matching UNSPSC codes with relevance scores. Codes are integers; do not show them to the user.

### Query format

The index was trained against, and the wrapper skills format their queries as:

> `<short category> — <precise description>`

For example: `Pets — adult cat looking for new home`, `Clothing — wool sweaters, gently used`. Do **not** include time-based or logistical detail (frequency, scheduling, urgency, delivery) — UNSPSC encodes *what* a thing is, not when or how it changes hands. For best retrieval, format probe queries the same way.
