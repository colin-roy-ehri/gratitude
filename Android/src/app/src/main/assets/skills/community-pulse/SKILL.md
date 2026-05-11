---
name: community-pulse
description: Get a warm, Gemma-written summary of how the wider community is doing — recent connections made and what kinds of needs/offers are active. Use for "how is my community?" style questions. Does NOT check for matches on the user's posts — use community-inbox or community-match for that.
---

# Community Pulse

Asks the community backend for a 2-3 sentence welfare summary of recent activity (connections established, popular categories of needs/offers). Use when the user wants a vibe-check of the community, not when they want to know if anyone replied to their own posts.

## When to use

- "How is my community?" / "What's happening in the community?"
- "How is everyone doing?"

For "did anyone reply to my post?" or "any matches?", use `community-inbox` (or `community-match`) instead.

## Instructions

Call the `run_js` tool with:

- script name: `index.html`
- data: `{}` (no parameters)

## Output

Returns a JSON object:

```json
{
  "communityActivitySummary": "Three new connections happened this week — folks are sharing meals and offering rides..."
}
```

Read the `communityActivitySummary` aloud or paraphrase it. Keep your response under 3 sentences unless the user asks for more.
