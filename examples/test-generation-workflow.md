# Test Generation Workflow

How to use the `test-writer` agent (powered by the `test-generator` skill) to produce a complete, structured set of manual test cases from a feature description.

---

## Prompt I typed

```
Can you write a solid set of test cases for the signup form?

The signup form has these fields:

* Email is required and must be a valid email address.
* Password is required and must be 8 to 64 characters.
* Username is required, must be 3 to 20 characters, and can only contain letters, numbers, underscores, and hyphens.
* The user cannot sign up with an email that already exists.
* Leading and trailing spaces should be trimmed before validation.
* If signup succeeds, the user account is created and the API returns the normal success response.
* If signup fails, no account is created and the user sees the correct error message.

Please make the tests readable so I can paste them into our QA notes.
```

---

## What Claude did

1. Invoked the `test-generator` skill via the `test-writer` agent.
2. Read `CLAUDE.md` to confirm field names, severity values (`Critical / Major / Minor / Trivial`), status values, and the title format rule (`[FeatureArea] description`).
3. Read `.claude/skills/test-generator/SKILL.md` for the full coverage methodology.
4. Applied ISTQB boundary-value analysis and equivalence partitioning to all three fields.
5. Produced test cases across five coverage categories:
   - **Happy path** — successful signup with all valid inputs.
   - **Equivalence partitions** — valid vs invalid email format, valid vs invalid character sets for username.
   - **Boundary values** — password at min (8), min-1 (7), max (64), max+1 (65); username at min (3), min-1 (2), max (20), max+1 (21); empty and whitespace-only variants for all three fields.
   - **Negative cases** — missing each required field individually, duplicate email, invalid email format, disallowed characters in username.
   - **Edge cases** — whitespace trimming on email and username, very long inputs (1000+ chars), simultaneous submission from two sessions with the same email.
6. Output every test case in the exact field order from `CLAUDE.md`: Title → Preconditions → Steps → Expected result → Severity → Status (`draft`).
7. Added a one-line summary at the end.

---

## Result

Excerpt of generated output (first three test cases):

---

Title:
[Signup] Successful account creation with valid inputs

Steps:
1. Open the signup page.
2. Enter a valid email address (e.g. user@example.com).
3. Enter a valid password of 10 characters.
4. Enter a valid username of 8 characters containing only letters and numbers.
5. Submit the form.

Expected result:
The account is created. The API returns `{ "success": true, "data": { ... }, "error": null }`. The user sees a success confirmation.

Severity:
Critical

Status:
draft

---

Title:
[Signup] Password one character below minimum is rejected

Steps:
1. Open the signup page.
2. Enter a valid email address.
3. Enter a password of exactly 7 characters.
4. Enter a valid username.
5. Submit the form.

Expected result:
The form is not submitted. An error message states that the password must be at least 8 characters. No account is created.

Severity:
Critical

Status:
draft

---

Title:
[Signup] Duplicate email is rejected

Preconditions:
An account with the email `existing@example.com` already exists.

Steps:
1. Open the signup page.
2. Enter `existing@example.com` in the email field.
3. Enter a valid password and username.
4. Submit the form.

Expected result:
The form is not submitted. An error message states that the email address is already registered. No duplicate account is created.

Severity:
Critical

Status:
draft

---

**Summary line Claude appended:**

> Generated 21 test cases covering happy path, boundary values, and negative scenarios for the signup form.

The full set covered all seven boundary points for password length, all seven for username length, all three missing-field cases, three email equivalence partitions (valid, invalid format, duplicate), two username character-set partitions (valid, disallowed characters), trimming behaviour, and simultaneous-submission race condition.
