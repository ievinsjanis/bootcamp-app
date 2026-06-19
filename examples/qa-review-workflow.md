# QA Review Workflow

How to use the `qa-reviewer` agent (powered by the `qa-review` skill) to find gaps in a feature implementation before testing begins.

---

## Prompt I typed

```
Do a QA review on the test suite feature you just built.

Look for anything missing, inconsistent, fragile, or likely to break. Think like a tester, not like the person who built it.

Return the review as a structured list grouped by severity. For each issue, include what could go wrong, why it matters, and what should be fixed or tested.
```

---

## What Claude did

1. Invoked the `qa-reviewer` agent, which uses the `qa-review` skill.
2. Read `CLAUDE.md` to load the source-of-truth definitions for severity levels, status values, API envelope shape, and naming conventions.
3. Read `.claude/skills/qa-review/SKILL.md` for the nine review categories.
4. Read the relevant implementation files:
   - `server/db.js` — `suites` and `suite_cases` table definitions
   - `server/routes/suites.js` — all eight route handlers
   - `client/src/pages/TestSuitesPage.jsx`
   - `client/src/pages/SuiteDetailPage.jsx`
   - `client/src/components/SuiteModal.jsx`
   - `client/src/components/AddCasesModal.jsx`
5. Worked through all nine categories: missing validation, missing error handling, user messages, confirmation dialogs, accessibility, untested edge cases, API response shape, severity/status consistency, and CLAUDE.md drift.
6. Grouped findings by severity and presented each with issue, consequence, suggested fix, and suggested test coverage.

---

## Result

**File reviewed:** `server/routes/suites.js`, `client/src/pages/SuiteDetailPage.jsx`, and related files.

Excerpt of findings as returned by the review:

---

### Critical

None.

---

### Major

**Issue:** `SuiteDetailPage` does not handle the case where dragging a test case to reorder it fails mid-request — the optimistic UI update moves the row, but if the PATCH request fails the row stays in its new position with no rollback.

**Why it matters:** A user who reorders test cases may believe the order was saved when it was not. The next page reload will show the original order, causing silent data loss from the user's perspective.

**Suggested fix:** Store the pre-drag order in a ref before the drag starts, and restore it in the error handler if the PATCH returns `success: false`.

**Suggested test coverage:** [Suite Detail] Drag-to-reorder fails — simulate a server error during the PATCH and verify the row returns to its original position and an error message appears.

---

**Issue:** `AddCasesModal` fetches only `page=1` of test cases (`/api/test-cases?page=1`). Projects with more than one page of test cases will silently show an incomplete list.

**Why it matters:** A tester adding cases to a suite will not see cases from page 2 onwards and may conclude they do not exist, causing test coverage gaps.

**Suggested fix:** Either fetch all cases (add a `?limit=9999` parameter or a dedicated `/api/test-cases/all` endpoint), or add pagination controls inside the modal.

**Suggested test coverage:** [Add Cases Modal] More than one page of test cases — create 51 or more test cases, open AddCasesModal, and verify that cases from the second page are visible and addable.

---

### Minor

**Issue:** `SuiteModal` has no confirmation step before a suite name is submitted with only whitespace characters. The server accepts it, creating a suite with a blank display name.

**Why it matters:** A suite with a blank name is confusing in the list view and cannot be distinguished from other blank-named suites.

**Suggested fix:** Trim the name on the client before submitting and show a validation error if the trimmed value is empty.

**Suggested test coverage:** [Test Suites] Create suite with whitespace-only name — enter three spaces in the name field, submit, and verify the error message appears and no suite is created.

---

**Issue:** Deleting a suite has no confirmation dialog. The delete button in `SuiteDetailPage` fires the DELETE request immediately.

**Why it matters:** A user who clicks delete by accident loses the suite and all its case associations with no recovery path.

**Suggested fix:** Add a confirmation dialog that names the suite: "Delete 'Login Smoke Tests'? This cannot be undone."

**Suggested test coverage:** [Suite Detail] Accidental delete — click Delete and verify a named confirmation dialog appears before the DELETE request fires.

---

### Trivial

**Issue:** `handleGetSuite` returns `404` with `{ success: false, data: null, error: "Suite not found" }` when the suite ID does not exist, which is correct. However, `handleGetSuiteCases` for the same non-existent suite ID returns an empty array with `success: true` rather than a 404. The two responses are inconsistent.

**Why it matters:** A client checking only the status code for the cases endpoint will not detect that the parent suite is missing.

**Suggested fix:** In `handleGetSuiteCases`, verify the suite exists before querying cases and return 404 if it does not.

**Suggested test coverage:** [Suite API] GET /api/suites/99999/cases — verify the response is `{ success: false, error: "Suite not found" }` when the suite ID does not exist.

---

**Full review covered all nine categories.** CLAUDE.md drift check found one item: `handleDeleteSuiteCase` in `server/routes/suites.js` is named `handleRemoveSuiteCase` in the actual file — the `handleVerbNoun` convention is followed but the verb choice (`Remove` vs `Delete`) is inconsistent with the other handlers in the same file. Noted as Trivial.
