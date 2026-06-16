You are helping the user create a structured bug report file from rough observations.

Follow these steps exactly, in order:

**Step 1 — Collect answers**

Ask the user these five questions one at a time, waiting for a response to each before asking the next:

1. "What did you do? Describe the steps you took leading up to the problem."
2. "What did you expect to happen?"
3. "What actually happened?"
4. "Where did it happen? For example: which page, screen, modal, form, or user journey."
5. "What severity should this bug have? Choose one of: Critical / Major / Minor / Trivial.
   - Critical — app crashes, data loss, security issue, or core feature completely broken
   - Major — important feature broken but workaround exists
   - Minor — minor feature broken or confusing behaviour
   - Trivial — cosmetic issue, typo, or very low impact"

**Step 2 — Derive filename and title**

- Create a short, clear bug title that summarises what went wrong (e.g. "Login Form Validation Error", "Checkout Button Not Responding").
- Convert the title to lowercase kebab-case for the filename slug (e.g. `login-form-validation-error`).
- Get today's date in YYYY-MM-DD format.
- The target path is: `tests/bugs/<YYYY-MM-DD>-<kebab-case-slug>.md`

**Step 3 — Create the file**

Create the `tests/bugs/` directory if it does not exist, then write the file using this exact format (preserve the blank lines between sections):

```
Title:
[clear bug report title]

Repro steps:
1. [first step]
2. [second step]
3. [third step]
(continue numbering for all steps provided)

Expected result:
[what should have happened]

Actual result:
[what actually happened]

Location:
[page, screen, modal, form, or user journey]

Severity:
[Critical / Major / Minor / Trivial]

Timestamp:
[date and time when the report was created]
```

**Step 4 — Confirm**

Tell the user the exact file path that was created and show them the full file contents so they can review it.
