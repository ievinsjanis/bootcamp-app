You are helping the user create a structured QA checklist before validating a ticket.

Follow these steps exactly, in order:

**Step 1 — Collect answers**

Ask the user these four questions one at a time, waiting for a response to each before asking the next:

1. "What ticket or feature are you testing? (e.g. ticket number, feature name)"
2. "What is the acceptance criteria or expected behavior?"
3. "What areas are risky, unclear, or likely to break?"
4. "What environment, browser, device, or user journey are you testing on?"

**Step 2 — Derive filename**

- Convert the ticket or feature name to lowercase kebab-case for the filename slug (e.g. "Login Validation" → `login-validation`, "PROJ-42 Password Reset" → `proj-42-password-reset`).
- Get today's date in YYYY-MM-DD format.
- The target path is: `tests/checklists/<YYYY-MM-DD>-<kebab-case-slug>.md`

**Step 3 — Create the file**

Create the `tests/checklists/` directory if it does not exist, then write the file using this exact format (preserve the blank lines between sections):

```
Title:
[clear checklist title derived from the ticket or feature name]

Ticket / Feature:
[ticket number or feature name as provided]

Environment:
[environment, browser, device, or user journey]

Acceptance criteria:
[acceptance criteria or expected behavior]

Risk areas:
- [risk area 1]
- [risk area 2]
- [risk area 3]
(include all risk areas the user mentioned)

Validation checklist:
- [ ] Happy path works as expected
- [ ] Required fields and validation rules are checked
- [ ] Error messages are clear and correct
- [ ] Edge cases are checked
- [ ] UI state changes are checked
- [ ] Regression risk areas are checked
- [ ] Relevant browser/device/environment differences are checked
- [ ] Result is documented

Notes:
[any extra notes or assumptions based on the user's answers, or "None" if nothing to add]
```

**Step 4 — Confirm**

Tell the user the exact file path that was created and show them the full file contents so they can review it.
