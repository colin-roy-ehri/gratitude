---
name: community-offer
description: Publish an OFFER (something the user can give) to the community board. Use this whenever the user wants to share, donate, give, lend, post, or offer something to a community network. Auto-detects approximate device location (rounded for anonymity) and signs each post with a fresh ephemeral keypair.
---

# Community Offer

Publishes an anonymous OFFER post to the community board. Self-contained — internally figures out the right category from the user's description, so you do NOT need to look up any codes first.

## When to use

When the user wants to give, donate, lend, share, or offer something they have.

## Conversation flow (follow exactly)

**Step 1 — check whether you already have the offer.** Look at the message that triggered this skill (and the surrounding conversation). If it already names something concrete the user wants to share — e.g. "I have old wool sweaters to give away", "I can babysit", "I have extra tomato seedlings" — you have what you need. **Skip straight to Step 2 and post immediately. Do not ask any clarifying question.** Asking "What would you like to share?" when the user just told you is the single most common failure mode for this skill — don't do it.

Only if the user's message is genuinely empty of content (e.g. they just said "post an offer" with no subject), ask exactly this one question and nothing else, then wait for their reply:

> What would you like to share?

Do **not** mention codes, categories, or how the skill works internally.

**Step 2 — post.** Call the `run_js` tool with:

- skill_name: `community-offer`
- script_name: `index.html`
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
| "I have some old wool sweaters to give away" | `Clothing — wool sweaters, gently used` |
| "I can babysit twice a week" | `Childcare — babysitting` |
| "I have a bunch of tomato seedlings, way too many" | `Garden — tomato seedlings` |
| "I make really good chili and would love to drop some off for someone" | `Food & meal support — homemade chili` |
| "I have a cat I can't keep anymore, looking for a home" | `Pets — adult cat needing new home` |
| "I have a really nice trail bike I want to share" | `Sports & recreation — trail mountain bike, adult size` |
| "I can drive someone to medical appointments on weekday mornings" | `Transportation — rides to medical appointments` |

Minimum useful data: `{"description":"<formatted string>"}`.

**Step 3 — confirm or report failure.** Look at the skill's return value:

- If it contains a `messageId` and a `resolvedCategoryName`, the post succeeded. Reply with one short sentence in plain English: e.g. *"Posted as Fresh vegetables — anyone nearby can see it."* Use `resolvedCategoryName` for the category. **Do not** mention any numbers, codes, digits, or internal details.
- If it contains an `error` field, the post **failed**. Tell the user it failed and include the error verbatim. Do **not** claim success.

**Step 4 — if there's already a match, offer the contact-share in the same turn.** If the response contains a non-empty `matches` array, the post already lined up with someone. Do **not** call `community-inbox` — the match is already resolved here. Instead:

- In the same reply that confirms the post, surface the top match using its `categoryName`: *"Posted as Fresh vegetables — and there's already someone nearby who needs the same. Want to share your contact info with them?"*
- If there are multiple matches, say so briefly (e.g. *"…and a couple of other folks too"*) but only offer the top one now; the rest will surface from `community-inbox` later.
- If the user says **yes**, ask for their contact text (phone/email/etc.) if they haven't already given it, then call `community-connect` with:
  - `matchToken`: the **first** match's `matchToken` (verbatim — do not invent one).
  - `contactText`: the user's contact string.
- If the user says **no**, do nothing — the match stays in their inbox and `community-inbox` can pick it up later.
- If `matches[0].contactShared` is `true`, the user has already shared contact info with this person from a previous turn; don't re-offer, just mention the match exists.

## Privacy model

- A fresh Ed25519 keypair is generated per message via libsodium. No persistent identity.
- Location is fetched from the device and rounded (default: 2 decimal places, ≈ 1.1 km).
- The `description` you send is used **only** for internal category lookup — it never reaches the public post. Only the resolved category name is broadcast.
