You are helping the user create a structured manual test case file.

Follow these steps exactly, in order:

**Step 1 — Collect answers**

Ask the user these three questions one at a time, waiting for a response to each before asking the next:

1. "What feature does this test cover?" (e.g. Login, Password Reset, Checkout)
2. "What steps does the user take? List them one per line." (collect as many steps as they give)
3. "What is the expected result?"

After all three answers are collected, silently pick a severity based on the feature described:
- Critical — authentication, payments, data loss scenarios
- Major — core workflows that affect most users
- Minor — non-core features or edge cases
- Trivial — cosmetic or very low-impact issues

Tell the user the severity you chose and why, in one sentence, and ask them to confirm or change it before proceeding.

**Step 2 — Derive filename**

Convert the feature name to lowercase kebab-case (e.g. "User Login" → `user-login`, "Password Reset Flow" → `password-reset-flow`).

The target path is: `tests/manual/<kebab-case-name>.md`

**Step 3 — Create the file**

Create the `tests/manual/` directory if it does not exist, then write the file using this exact format (preserve the blank lines between sections):

```
Title:
[clear test case title derived from the feature name]

Steps:
1. [first step]
2. [second step]
3. [third step]
(continue numbering for all steps provided)

Expected result:
[expected result]

Severity:
[Critical / Major / Minor / Trivial]
```

**Step 4 — Confirm**

Tell the user the exact file path that was created and show them the full file contents so they can review it.
