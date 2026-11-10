# 0005: The owner approves who may enter

Date: 2026-11-08

## Context

Sign-in is open to anyone the Supabase project can authenticate. In development that project is shared with another team, and in production family members may join later. An env allow list was the first answer but needs a redeploy for every change.

## Decision

Every profile has an access status: pending, approved or blocked, and a role: owner or member. A new sign-in is pending and sees only a waiting page. The owner approves, blocks or re-opens requests under Settings, then Members, and gets an in-app notification for each new request. `AUTH_ALLOWED_EMAILS` remains as an optional auto-approve list whose first address becomes the owner; with no list, the first account to sign in becomes the owner.

Entry is separate from data isolation: approval only decides who gets past the door. Every query stays scoped to the signed-in user and row-level security backs that up, so members never see each other's data.

## Consequences

Adding or removing a person is a click, not a deploy. Blocking keeps the person's data. The signed-in layout checks access on every page, so a block takes effect on the next navigation.
