# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a pure client-side SPA in plain HTML, CSS, and Vanilla JavaScript. The implementation proceeds in layers: scaffold the HTML/CSS shell first, then build each JavaScript module in isolation (Validator → Storage → Renderer → Controller), wire everything together, and finally write property-based and unit tests using fast-check with a Node.js test runner (Vitest).

---

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - Create `index.html` with semantic layout sections: Total Balance display, Input Form (name text field, amount number field, category `<select>` with options Food / Transport / Fun, submit button), Transaction List container, and a `<canvas>` element for the pie chart
  - Add a `<script>` CDN tag for Chart.js and a `<script src="js/app.js">` tag (deferred)
  - Create `css/app.css` with a single consistent visual theme: ≥14px body font, distinct visual sections for Balance, Form, List, and Chart, and `overflow-y: scroll` on the transaction list container
  - Create `js/app.js` as an empty module scaffold with clearly commented section markers: `// --- Validator ---`, `// --- Storage ---`, `// --- Renderer ---`, `// --- Controller ---`
  - _Requirements: 1.1, 1.2, 2.2, 5.6, 7.1, 7.2, 7.4, 9.1, 9.2, 9.3_

- [x] 2. Implement the Validator module
  - [x] 2.1 Implement `validate(name, amount, category)` in `js/app.js`
    - Return `{ valid: true, errors: {} }` when name is non-empty after trim, amount parses to a finite number > 0, and category is one of `"Food"`, `"Transport"`, `"Fun"`
    - Return `{ valid: false, errors: { fieldName: "message" } }` for any failing field
    - Export the function for testing (use `if (typeof module !== "undefined") module.exports = ...` guard)
    - _Requirements: 1.4, 1.5_

  - [ ]* 2.2 Write property test for `validate` — Property 1: Valid transaction submission
    - Create `tests/validator.test.js`; configure `fc.configureGlobal({ numRuns: 100 })`
    - **Property 1: Valid transaction submission grows the list**
    - **Validates: Requirements 1.3**
    - Use arbitraries: valid name (`fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0)`), valid amount (`fc.float({ min: 0.01, max: 1_000_000 })`), valid category (`fc.constantFrom("Food", "Transport", "Fun")`)
    - Assert `validate(name, amount, category).valid === true`

  - [ ]* 2.3 Write property test for `validate` — Property 2: Invalid input is rejected
    - **Property 2: Invalid input is rejected and list is unchanged**
    - **Validates: Requirements 1.4, 1.5**
    - Use invalid name arbitrary (`fc.oneof(fc.constant(""), fc.string().filter(s => s.trim() === ""))`) and invalid amount arbitrary (`fc.oneof(fc.constant(0), fc.float({ max: -0.001 }), fc.constant(NaN))`)
    - Assert `validate(...).valid === false` and that `errors` has at least one key
    - Verify boundary: amount exactly `0` is rejected; amount `Number.EPSILON` is accepted

- [x] 3. Implement the Storage module
  - [x] 3.1 Implement `loadTransactions()` and `saveTransactions(transactions)` in `js/app.js`
    - Use storage key `"ebv_transactions"`
    - `loadTransactions`: `localStorage.getItem` → `JSON.parse`; return `[]` on missing key or parse error (catch exception)
    - `saveTransactions`: wrap `localStorage.setItem(key, JSON.stringify(transactions))` in try/catch; log console warning on quota error without throwing
    - Export both functions under the same module guard
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 3.2 Write property test for Storage — Property 12: Round-trip preserves transactions
    - **Property 12: Storage round-trip preserves transactions**
    - **Validates: Requirements 6.1, 6.2**
    - Generate arrays of transaction objects (id string, name string, amount positive float, valid category)
    - Call `saveTransactions(arr)` then `loadTransactions()`; assert deep equality with original array
    - Also test transactions with Unicode and special characters in the name field

- [x] 4. Implement Renderer helper utilities
  - [x] 4.1 Implement `computeTotal(transactions)` and `computeCategoryTotals(transactions)` pure functions in `js/app.js`
    - `computeTotal`: `transactions.reduce((sum, t) => sum + t.amount, 0)` — returns `0` for empty array
    - `computeCategoryTotals`: returns `{ Food: 0, Transport: 0, Fun: 0 }` with each category summed
    - Implement `formatCurrency(amount)` using `Intl.NumberFormat` or manual `Rp` prefix with thousands separators; never return `NaN`, `undefined`, or empty string
    - Define `CATEGORY_COLORS = { Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" }`
    - Export all for testing
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.5_

  - [ ]* 4.2 Write property test for `computeTotal` — Property 8: Total balance equals arithmetic sum
    - **Property 8: Total balance equals the arithmetic sum of amounts**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - Generate arrays of 0–50 transactions; assert `computeTotal(arr)` equals manual `arr.reduce((s, t) => s + t.amount, 0)`
    - Assert `computeTotal([]) === 0`

  - [ ]* 4.3 Write property test for `formatCurrency` — Property 9: Currency formatting is consistent
    - **Property 9: Currency formatting is consistent**
    - **Validates: Requirements 4.5**
    - Generate non-negative numbers (including 0 and large values); assert result is a non-empty string, does not contain `"NaN"` or `"undefined"`, and starts with `"Rp"` (or the configured locale prefix)

  - [ ]* 4.4 Write property test for `computeCategoryTotals` — Property 10: Pie chart data matches category totals
    - **Property 10: Pie chart data matches category totals**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Generate transaction arrays; assert `computeCategoryTotals(arr).Food` equals manual sum of Food transactions, same for Transport and Fun; assert no category key is omitted

  - [ ]* 4.5 Write property test for `CATEGORY_COLORS` — Property 11: Color mapping is injective and stable
    - **Property 11: Category color mapping is injective and stable**
    - **Validates: Requirements 5.5**
    - Assert all three color values are distinct strings; assert calling color lookup twice for the same category returns the same value

- [x] 5. Implement the Renderer module (DOM + Chart)
  - [x] 5.1 Implement `renderTransactionList(transactions)` in `js/app.js`
    - Clear `#transaction-list`, then for each transaction append a `<li>` showing item name, `formatCurrency(amount)`, and category label, plus a delete button with `data-id` attribute
    - If `transactions` is empty, render a placeholder message
    - _Requirements: 2.1, 2.4, 2.5_

  - [ ]* 5.2 Write property test for `renderTransactionList` — Property 4: List renders all fields
    - **Property 4: Transaction list renders all fields for every item**
    - **Validates: Requirements 2.1**
    - Use jsdom; generate transaction arrays; assert each rendered `<li>` contains the transaction name, formatted amount, and category string
    - Assert delete button is present on each item (Property 6: **Validates: Requirements 3.1**)

  - [x] 5.3 Implement `renderTotalBalance(transactions)` in `js/app.js`
    - Compute total via `computeTotal`, format via `formatCurrency`, update `#total-balance` text content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.4 Implement `renderPieChart(transactions)` in `js/app.js`
    - Maintain module-level `let chartInstance = null`
    - If `chartInstance` exists, call `chartInstance.destroy()` before creating a new Chart.js pie instance
    - Dataset values come from `computeCategoryTotals`; colors from `CATEGORY_COLORS`; labels from category keys
    - Handle empty transaction array (Chart.js empty/placeholder state)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.5 Implement `showFormErrors(errors)` and `clearFormErrors()` in `js/app.js`
    - `showFormErrors`: for each key in `errors`, locate the corresponding error `<span>` next to the field and set its text content
    - `clearFormErrors`: clear all error `<span>` elements
    - _Requirements: 1.5_

  - [x] 5.6 Implement `resetForm()` in `js/app.js`
    - Call `form.reset()` on the Input Form element
    - _Requirements: 1.6_

- [x] 6. Implement the Controller and wire everything together
  - [x] 6.1 Implement `initApp()` in `js/app.js`
    - Called on `DOMContentLoaded`
    - Load transactions from Storage, then call `renderTransactionList`, `renderTotalBalance`, `renderPieChart`
    - Attach submit handler to Input Form and delegate delete clicks from `#transaction-list`
    - _Requirements: 2.3, 4.4, 5.4, 6.3, 6.4_

  - [x] 6.2 Implement `handleAddTransaction(event)` in `js/app.js`
    - `event.preventDefault()`; read form field values; call `validate`
    - On invalid: `showFormErrors(result.errors)`; return
    - On valid: `clearFormErrors()`, `resetForm()`, create Transaction object with `crypto.randomUUID()` (fallback to `Date.now().toString(36) + Math.random().toString(36).slice(2)`), push to in-memory array, `saveTransactions`, then call all three render functions
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 4.2, 5.2, 6.1_

  - [x] 6.3 Implement `handleDeleteTransaction(id)` in `js/app.js`
    - Filter out the transaction by id; call `saveTransactions`; call all three render functions
    - _Requirements: 3.1, 3.2, 4.3, 5.3, 6.2_

  - [ ]* 6.4 Write property test — Property 3: Form resets after successful submission
    - **Property 3: Form resets after successful submission**
    - **Validates: Requirements 1.6**
    - Use jsdom; simulate valid form submission; assert all form fields are empty/default after submission

  - [ ]* 6.5 Write property test — Property 5: Transaction list load from storage
    - **Property 5: Transaction list load from storage**
    - **Validates: Requirements 2.3, 6.3**
    - Seed localStorage with a generated transaction array; call `initApp()`; assert every seeded transaction appears in the rendered list

  - [ ]* 6.6 Write property test — Property 7: Delete removes transaction from DOM and storage
    - **Property 7: Delete removes transaction from DOM and storage**
    - **Validates: Requirements 3.2, 6.2**
    - Generate a transaction array in localStorage; call `handleDeleteTransaction(id)` for a random item; assert item is absent from DOM and from `loadTransactions()`

- [x] 7. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` (or `node --test`) and confirm all property-based and unit tests pass
  - Fix any regressions before proceeding
  - Ask the user if any questions arise

- [x] 8. Add unit tests for edge cases and structural requirements
  - [ ]* 8.1 Write unit tests for Validator boundary conditions
    - Amount exactly `0` → rejected; amount `Number.EPSILON` → accepted
    - Empty string name → rejected; whitespace-only name → rejected
    - Unknown category string → rejected
    - _Requirements: 1.4, 1.5_

  - [ ]* 8.2 Write unit tests for Storage error handling
    - Parse error in localStorage (malformed JSON) → `loadTransactions()` returns `[]`
    - `localStorage` quota exceeded → `saveTransactions()` logs warning without throwing
    - _Requirements: 6.3, 6.4_

  - [ ]* 8.3 Write unit tests for Renderer empty-state and structural checks
    - `renderTransactionList([])` outputs placeholder message in DOM
    - `css/app.css` sets `overflow-y: scroll` on transaction list container (check file content)
    - `index.html` contains `<script>` tag with Chart.js CDN URL
    - _Requirements: 2.2, 2.5, 5.6_

- [x] 9. Final checkpoint — Ensure all tests pass and app is fully wired
  - Run the full test suite; confirm 0 failures
  - Manually verify `index.html` opens correctly in a browser (no build step required)
  - Ensure all tests pass, ask the user if questions arise

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 7 and 9) ensure incremental validation
- Property tests validate the 12 universal correctness properties from the design document
- Unit tests cover specific examples, boundary conditions, and structural checks
- `module.exports` guards allow the same `app.js` to run in the browser and in Node.js/Vitest without modification
- All 12 properties from the design are covered: Properties 1–2 in task 2, Property 3 in task 6.4, Property 4 and 6 in task 5.2, Property 5 in task 6.5, Property 7 in task 6.6, Property 8 in task 4.2, Property 9 in task 4.3, Property 10 in task 4.4, Property 11 in task 4.5, Property 12 in task 3.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.1", "5.3"] },
    { "id": 4, "tasks": ["5.2", "5.4", "5.5", "5.6"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["6.4", "6.5", "6.6", "8.1", "8.2", "8.3"] }
  ]
}
```
