---
name: community-need
description: Publish a NEED (something the user is requesting) to the community board. Use this whenever the user wants to ask for, request, borrow, find, or seek something from a community network. Auto-detects approximate device location (rounded for anonymity) and signs each post with a fresh ephemeral keypair.
---

# Community Need

Publishes an anonymous NEED post to the community board. Self-contained — internally figures out the right category from the user's description, so you do NOT need to look up any codes first.

## When to use

When the user wants to ask, request, borrow, find, or seek something from the community.

## Conversation flow (follow exactly)

**Step 1 — clarify.** If the user hasn't already stated exactly what they need, ask exactly this one question and nothing else:

> What do you need?

Then wait for their reply. Do **not** call any tools yet. Do **not** say anything else, do **not** mention codes, categories, or how the skill works internally.

**Step 2 — post.** Once the user has named what they need, call the `run_js` tool with:

- script name: `index.html`
- data: A JSON string with the following fields:
  - **description**: Required string. **Do not pass the user's words verbatim.** This field is used internally to look up the right UNSPSC category and is never included in the public post. Your job here is to rewrite the user's words into the format below so the category lookup is as accurate as possible.
  - **precision**: Optional integer 0-4. Decimal places to round latitude/longitude. `2` is the default.
  - **latitude / longitude**: Optional numbers. Override auto-detected location.

### How to format `description`

Use this exact form:

> `<short category> — <precise description of one specific instance>`

- **Category** is short and natural ("Office supplies", "Kitchen", "Childcare", "Tools", "Medical", "Pets", "Clothing", "Food & meal support"). It biases the embedding toward the right region of the taxonomy.
- **Description** names ONE concrete thing or service with 1–2 attributes the user actually mentioned that describe **what the thing is** (size, condition, color, material, age, dietary detail). Don't invent attributes the user didn't say — if they were vague, stay general.
- **Strip out time-based and logistical detail.** UNSPSC encodes *what* something is, not *when, how often, or how it's delivered*. Drop frequency ("twice a week", "daily", "every other Saturday"), scheduling ("evenings", "weekends"), urgency ("urgent", "ASAP"), and delivery logistics ("dropped off", "pickup", "delivery"). These don't help the lookup and may steer it wrong.
- Keep the whole string under ~120 characters.
- Do NOT include the user's location, name, or contact info.
- Output only the formatted string in this field. No quotes, no labels, no commentary.

#### Examples

| User said | description to send |
|---|---|
| "I really need diapers for my baby" | `Childcare — baby diapers` |
| "Looking for a winter coat, men's large" | `Clothing — winter coat, men's large` |
| "I need help with my taxes urgently" | `Legal & bureaucratic navigation — tax preparation help` |
| "Could really use some groceries this week, anything helps" | `Food & meal support — groceries` |
| "I need a ride to my dialysis appointment on Tuesday" | `Transportation — rides to medical appointments` |
| "Looking for someone to help me move a couch on Saturday" | `Home & repair support — help moving furniture` |
| "Need cat food, my cat is on a special low-protein diet" | `Pets — low-protein cat food` |

Minimum useful data: `{"description":"<formatted string>"}`.

**Step 3 — confirm or report failure.** Look at the skill's return value:

- If it contains a `messageId` and a `resolvedCategoryName`, the post succeeded. Reply with one short sentence in plain English: e.g. *"Posted a request for Domestic bedding — folks nearby will see it."* Use `resolvedCategoryName` for the category. **Do not** mention any numbers, codes, digits, or internal details.
- If it contains an `error` field, the post **failed**. Tell the user it failed and include the error verbatim. Do **not** claim success.

## Privacy model

- A fresh Ed25519 keypair is generated per message via libsodium. No persistent identity.
- Location is fetched from the device and rounded (default: 2 decimal places, ≈ 1.1 km).
- The `description` you send is used **only** for internal category lookup — it never reaches the public post. Only the resolved category name is broadcast.
