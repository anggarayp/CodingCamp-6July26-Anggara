# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a self-contained, client-side single-page application (SPA) implemented in plain HTML, CSS, and Vanilla JavaScript. It enables users to record expense transactions categorized as Food, Transport, or Fun; view a running total balance; browse a scrollable transaction history; and see a live pie chart of their spending distribution — all persisted to browser `localStorage` with no backend or build step required.

The design follows a **module pattern** where a single `app.js` file encapsulates all state and behavior behind clearly separated concerns: data management, DOM rendering, chart management, and validation. External dependency is limited to Chart.js loaded via CDN.

---

## Architecture

The application is structured as a thin, event-driven MVC-like arrangement entirely within the browser:

```
┌─────────────────────────────────────────────────┐
│                  index.html                      │
│  ┌───────────────┐  ┌──────────────────────────┐ │
│  │  Input Form   │  │  Transaction List + UI   │ │
│  └───────┬───────┘  └──────────────┬───────────┘ │
│          │  submit/click events    │              │
│          ▼                         ▼              │
│  ┌─────────────────────────────────────────────┐ │
│  │               app.js (Controller)           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │ │
│  │  │Validator │ │ Storage  │ │  Renderer   │ │ │
│  │  │          │ │(localStorage)│ (DOM + Chart)│ │ │
│  │  └──────────┘ └──────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│          │                                        │
│          ▼                                        │
│  ┌──────────────────┐                            │
│  │  localStorage    │  (persisted transaction    │
│  │  ("transactions")│   array as JSON)           │
│  └──────────────────┘                            │
└─────────────────────────────────────────────────┘
```

**Data flow on user action:**

1. User fills Input Form → clicks Submit.
2. `Validator` checks all fields.
3. If valid: `Storage` saves updated array → `Renderer` repaints Transaction List, Total Balance, and Pie Chart.
4. If invalid: `Renderer` shows inline field errors.

**Data flow on page load:**

1. `Storage.load()` reads the JSON array from `localStorage`.
2. `Renderer` initializes Transaction List, Total Balance, and Pie Chart from that array.

---

## Components and Interfaces

### 1. `Validator`

Responsible for checking Input Form field values before a transaction is created.

```js
/**
 * Validates form inputs.
 * @param {string} name  - Item name value.
 * @param {string|number} amount - Amount value from the input field.
 * @param {string} category - Selected category value.
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validate(name, amount, category)
```

Rules:
- `name`: non-empty after trimming.
- `amount`: must parse to a finite number **greater than 0**.
- `category`: must be one of `"Food"`, `"Transport"`, `"Fun"`.

Returns `{ valid: true, errors: {} }` on success, or `{ valid: false, errors: { fieldName: "message" } }` on failure.

---

### 2. `Storage`

Wraps `localStorage` read/write with a single defined key.

```js
const STORAGE_KEY = "ebv_transactions";

/** @returns {Transaction[]} */
function loadTransactions()

/** @param {Transaction[]} transactions */
function saveTransactions(transactions)
```

- `loadTransactions()`: reads `localStorage.getItem(STORAGE_KEY)`, parses JSON, returns array. Returns `[]` if key is absent or parse fails.
- `saveTransactions(transactions)`: calls `localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))`.

---

### 3. `Renderer`

Handles all DOM mutations and chart updates. Never touches business logic.

```js
/** Renders the full transaction list into #transaction-list */
function renderTransactionList(transactions)

/** Updates the #total-balance display */
function renderTotalBalance(transactions)

/** Creates or updates the Chart.js pie chart */
function renderPieChart(transactions)

/** Shows inline validation error messages next to form fields */
function showFormErrors(errors)

/** Clears all inline error messages from the form */
function clearFormErrors()

/** Resets all Input Form fields */
function resetForm()
```

`renderPieChart` maintains a module-level `chartInstance` variable. If a chart already exists it calls `chartInstance.destroy()` before creating a new one to avoid "Canvas is already in use" errors.

---

### 4. Controller (`app.js` main logic)

Wires DOM events to validator + storage + renderer.

```js
function handleAddTransaction(event)   // form submit handler
function handleDeleteTransaction(id)   // delete button click handler
function initApp()                     // called on DOMContentLoaded
```

`initApp()` sequence:
1. `const transactions = loadTransactions()`
2. `renderTransactionList(transactions)`
3. `renderTotalBalance(transactions)`
4. `renderPieChart(transactions)`

`handleAddTransaction(event)`:
1. `event.preventDefault()`
2. Read form values.
3. `const result = validate(name, amount, category)`
4. If `!result.valid`: `showFormErrors(result.errors)`, return.
5. `clearFormErrors()`, `resetForm()`
6. Create `Transaction` object with `crypto.randomUUID()` (or `Date.now()` fallback).
7. Append to in-memory array.
8. `saveTransactions(transactions)`
9. `renderTransactionList(transactions)`, `renderTotalBalance(transactions)`, `renderPieChart(transactions)`

`handleDeleteTransaction(id)`:
1. Filter out transaction by id.
2. `saveTransactions(transactions)`
3. `renderTransactionList(transactions)`, `renderTotalBalance(transactions)`, `renderPieChart(transactions)`

---

### 5. File Structure

```
index.html          ← single HTML entry point; loads CDN scripts, app.css, app.js
css/
  app.css           ← all styles; single consistent theme
js/
  app.js            ← all application logic (validator, storage, renderer, controller)
```

No additional files, no build output, no node_modules.

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier (UUID or timestamp string).
 * @property {string} name      - Item name, non-empty trimmed string.
 * @property {number} amount    - Positive numeric amount (stored as a JS number).
 * @property {string} category  - One of "Food" | "Transport" | "Fun".
 */
```

**Storage format** — the array is stored as a JSON string under the key `"ebv_transactions"`:

```json
[
  { "id": "abc-123", "name": "Lunch", "amount": 35000, "category": "Food" },
  { "id": "def-456", "name": "Bus ticket", "amount": 5000, "category": "Transport" }
]
```

### Category Color Map

```js
const CATEGORY_COLORS = {
  Food:      "#FF6384",
  Transport: "#36A2EB",
  Fun:       "#FFCE56"
};
```

Colors are fixed and consistent across all renders. These values are the canonical Chart.js default palette colors, making them familiar to users.

### Derived values (not stored)

- **Total Balance**: `transactions.reduce((sum, t) => sum + t.amount, 0)`
- **Category Totals** (for pie chart):
  ```js
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(t => totals[t.category] += t.amount);
  ```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction submission grows the list

*For any* non-empty item name, positive numeric amount, and valid category, submitting the form should result in the transaction list length increasing by exactly one.

**Validates: Requirements 1.3**

---

### Property 2: Invalid input is rejected and list is unchanged

*For any* combination of form inputs where at least one field is invalid (empty name, non-positive amount, or missing category), submitting the form should leave the transaction list unchanged and display at least one inline error message.

**Validates: Requirements 1.4, 1.5**

---

### Property 3: Form resets after successful submission

*For any* valid transaction submitted through the form, all form fields should be empty (or reset to their default placeholder state) immediately after submission.

**Validates: Requirements 1.6**

---

### Property 4: Transaction list renders all fields for every item

*For any* array of transactions, each rendered list item should contain the item's name, a currency-formatted amount, and its category label.

**Validates: Requirements 2.1**

---

### Property 5: Transaction list load from storage

*For any* array of transactions serialized to localStorage, initializing the application should render every stored transaction in the Transaction List without omission.

**Validates: Requirements 2.3, 6.3**

---

### Property 6: Delete button present for every transaction

*For any* non-empty set of transactions rendered in the list, every list item should contain exactly one delete button.

**Validates: Requirements 3.1**

---

### Property 7: Delete removes transaction from DOM and storage

*For any* transaction currently in the list, clicking its delete button should remove it from the DOM transaction list and ensure the transaction is absent from the deserialized localStorage array.

**Validates: Requirements 3.2, 6.2**

---

### Property 8: Total balance equals the arithmetic sum of amounts

*For any* array of transactions (including the empty array), the displayed Total Balance should equal the precise arithmetic sum of all transaction amounts (and zero for the empty array).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 9: Currency formatting is consistent

*For any* non-negative numeric total, the formatted currency string should match the expected locale pattern (e.g., `Rp` prefix with thousands separators) and never produce `NaN`, `undefined`, or an empty string.

**Validates: Requirements 4.5**

---

### Property 10: Pie chart data matches category totals

*For any* array of transactions, the dataset values supplied to the Chart.js pie chart should equal the sum of amounts for each respective category (`Food`, `Transport`, `Fun`), with no category omitted.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 11: Category color mapping is injective and stable

*For any* invocation of the color mapping function, each of the three categories (`Food`, `Transport`, `Fun`) should receive a distinct color value, and repeated calls should return the same color for the same category.

**Validates: Requirements 5.5**

---

### Property 12: Storage round-trip preserves transactions

*For any* array of Transaction objects, serializing and then deserializing (save then load) should produce an array equal to the original — preserving all field values without data loss or mutation.

**Validates: Requirements 6.1, 6.2**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Empty item name | Inline error shown next to name field; form not submitted |
| Amount ≤ 0 or non-numeric | Inline error shown next to amount field; form not submitted |
| No category selected | Inline error shown next to category field; form not submitted |
| `localStorage` parse failure on load | `loadTransactions()` catches the exception and returns `[]`; app starts with empty state |
| `localStorage` quota exceeded on save | `saveTransactions()` wraps `setItem` in a try/catch; logs a console warning; UI continues to reflect in-memory state |
| Chart already instantiated on re-render | Previous `Chart` instance is destroyed before creating a new one |
| `crypto.randomUUID` unavailable | Falls back to `Date.now().toString(36) + Math.random().toString(36).slice(2)` for ID generation |

---

## Testing Strategy

### PBT Applicability Assessment

This feature includes pure logic functions (validator, sum calculation, category aggregation, currency formatter, storage serialization) that are well-suited for property-based testing. PBT is appropriate here because:
- Behavior varies meaningfully with input (different names, amounts, categories, array sizes).
- 100+ iterations will surface edge cases (special characters, large numbers, floating-point, Unicode in names).
- All logic is in-browser pure functions that run cheaply without network calls.

### Testing Library

**[fast-check](https://fast-check.dev/)** — a TypeScript/JavaScript property-based testing library.

Since this project uses no build tools, tests can be run in a Node.js test runner (e.g., `node --test`) or a lightweight test harness such as Vitest. The production `app.js` functions are exported (or the test file imports via `require`) for isolated unit testing. DOM-dependent rendering functions are tested with **jsdom**.

### Dual Testing Approach

**Unit / example tests** cover:
- Specific valid transaction submission example.
- Specific invalid submission examples (empty name, zero amount, negative amount).
- Empty-state placeholder rendering.
- CSS `overflow-y: scroll` is set on the transaction list container.
- `<script>` tag with Chart.js CDN URL present in `index.html`.

**Property-based tests** cover Properties 1–12 listed above with a minimum of **100 iterations each**.

Each property test carries a comment tag:

```js
// Feature: expense-budget-visualizer, Property N: <property_text>
```

### Property Test Configuration

```js
import fc from "fast-check";
import { validate, loadTransactions, saveTransactions,
         computeTotal, computeCategoryTotals,
         formatCurrency, CATEGORY_COLORS } from "../js/app.js";

// Minimum iterations
fc.configureGlobal({ numRuns: 100 });
```

### Arbitraries (Generators)

| Generator | Description |
|---|---|
| `fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0)` | Valid item name |
| `fc.float({ min: 0.01, max: 1_000_000 })` | Valid positive amount |
| `fc.constantFrom("Food", "Transport", "Fun")` | Valid category |
| `fc.record({ name, amount, category })` | Full valid transaction (without id) |
| `fc.array(transactionArb)` | Array of 0–N valid transactions |
| `fc.oneof(fc.constant(""), fc.string().filter(s => s.trim() === ""))` | Invalid (blank) name |
| `fc.oneof(fc.constant(0), fc.float({ max: -0.001 }), fc.constant(NaN))` | Invalid amount |

### Coverage Goals

- All 12 correctness properties tested as property-based tests.
- Validator boundary conditions covered (amount exactly 0, amount = `Number.EPSILON`).
- Storage serialization covers transactions with special characters and Unicode in the name field.
- Currency formatter covers 0, large numbers, and fractional amounts.
