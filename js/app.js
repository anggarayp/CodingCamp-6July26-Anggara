// Expense & Budget Visualizer — app.js

// --- Validator ---

/**
 * Validates form inputs before a transaction is created.
 * Category is now any non-empty string (supports custom categories).
 *
 * @param {string} name       - Item name value from the form field.
 * @param {string|number} amount - Amount value from the form field.
 * @param {string} category   - Selected category value.
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validate(name, amount, category) {
  const errors = {};

  // Validate name: must be non-empty after trimming
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.name = "Item name is required.";
  }

  // Validate amount: must parse to a finite number greater than 0
  const parsedAmount = Number(amount);
  if (!isFinite(parsedAmount) || parsedAmount <= 0) {
    errors.amount = "Amount must be a positive number.";
  }

  // Validate category: must be a non-empty string (supports custom categories)
  if (typeof category !== "string" || category.trim().length === 0) {
    errors.category = "Please select or add a valid category.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: {} };
}

// --- Storage ---

const STORAGE_KEY = "ebv_transactions";
const STORAGE_KEY_CATEGORIES = "ebv_categories";

/**
 * Loads the transaction array from localStorage.
 * Returns an empty array if the key is absent or if JSON parsing fails.
 *
 * @returns {Array<{id: string, name: string, amount: number, category: string}>}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persists the transaction array to localStorage.
 * Wraps setItem in a try/catch; logs a console warning on quota error without throwing.
 *
 * @param {Array<{id: string, name: string, amount: number, category: string}>} transactions
 */
function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.warn("Storage quota exceeded — transactions could not be saved:", e);
    throw e;
  }
}

/**
 * Loads custom category names from localStorage.
 * Returns an empty array if absent or on parse failure.
 *
 * @returns {string[]}
 */
function loadCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persists the custom categories array to localStorage.
 *
 * @param {string[]} cats
 */
function saveCategories(cats) {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(cats));
  } catch (e) {
    console.warn("Storage quota exceeded — categories could not be saved:", e);
  }
}

// --- Renderer ---

/**
 * Computes the sum of all transaction amounts.
 * Returns 0 for an empty array.
 *
 * @param {Array<{amount: number}>} transactions
 * @returns {number}
 */
function computeTotal(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Computes the total amount per category.
 * Builds totals dynamically from the transactions array plus the three base categories.
 *
 * @param {Array<{amount: number, category: string}>} transactions
 * @returns {Object.<string, number>}
 */
function computeCategoryTotals(transactions) {
  const BASE_CATEGORIES = ["Food", "Transport", "Fun"];
  const totals = {};
  BASE_CATEGORIES.forEach((cat) => { totals[cat] = 0; });

  transactions.forEach((t) => {
    if (!(t.category in totals)) {
      totals[t.category] = 0;
    }
    totals[t.category] += t.amount;
  });
  return totals;
}

/**
 * Formats a numeric amount as Indonesian Rupiah currency string.
 * Never returns NaN, undefined, or empty string.
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  const safeAmount = typeof amount === "number" && isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(safeAmount);
  } catch (e) {
    // Fallback for environments that don't support Intl with IDR
    return "Rp " + safeAmount.toLocaleString("id-ID");
  }
}

/** Consistent color mapping for each spending category */
const CATEGORY_COLORS = {
  Food: "#FF6384",
  Transport: "#36A2EB",
  Fun: "#FFCE56",
};

/**
 * Returns a color for a given category.
 * Uses CATEGORY_COLORS for preset categories; generates a stable HSL color for custom ones.
 *
 * @param {string} category
 * @returns {string}
 */
function getColor(category) {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  // Generate a consistent hue from the category name via char code sum
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash += category.charCodeAt(i);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/** Module-level Chart.js instance — destroyed and recreated on each render */
let chartInstance = null;

/**
 * Renders all transactions into the #transaction-list element.
 * Shows a placeholder message when the array is empty.
 * Supports an optional sortBy parameter to control display order.
 *
 * @param {Array<{id: string, name: string, amount: number, category: string}>} transactions
 * @param {string} [sortBy='none'] - Sort mode: 'none', 'amount-desc', 'amount-asc', 'category-asc', 'category-desc'
 */
function renderTransactionList(transactions, sortBy = "none") {
  const list = document.getElementById("transaction-list");
  list.innerHTML = "";

  if (transactions.length === 0) {
    const placeholder = document.createElement("li");
    placeholder.className = "empty-placeholder";
    placeholder.textContent = "No transactions yet.";
    list.appendChild(placeholder);
    return;
  }

  // Sort a copy — never mutate the source array
  let sorted = [...transactions];
  if (sortBy === "amount-desc") {
    sorted.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === "amount-asc") {
    sorted.sort((a, b) => a.amount - b.amount);
  } else if (sortBy === "category-asc") {
    sorted.sort((a, b) => a.category.localeCompare(b.category));
  } else if (sortBy === "category-desc") {
    sorted.sort((a, b) => b.category.localeCompare(a.category));
  } else {
    // Default: newest first
    sorted = [...transactions].reverse();
  }

  sorted.forEach((t) => {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.innerHTML = `
      <span class="transaction-name">${escapeHtml(t.name)}</span>
      <span class="transaction-amount">${formatCurrency(t.amount)}</span>
      <span class="transaction-category">${escapeHtml(t.category)}</span>
      <button class="btn-delete" data-id="${escapeHtml(t.id)}" aria-label="Delete ${escapeHtml(t.name)}">Delete</button>
    `;
    list.appendChild(li);
  });
}

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Updates the #total-balance element with the computed and formatted total.
 *
 * @param {Array<{amount: number}>} transactions
 */
function renderTotalBalance(transactions) {
  const total = computeTotal(transactions);
  document.getElementById("total-balance").textContent = formatCurrency(total);
}

/**
 * Creates or re-creates the Chart.js pie chart from the current transactions.
 * Destroys the previous instance first to avoid "Canvas is already in use" errors.
 * Labels and colors are derived dynamically from computeCategoryTotals.
 *
 * @param {Array<{amount: number, category: string}>} transactions
 */
function renderPieChart(transactions) {
  const canvas = document.getElementById("expense-chart");
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const totals = computeCategoryTotals(transactions);
  const labels = Object.keys(totals);
  const data = labels.map((label) => totals[label]);
  const colors = labels.map((label) => getColor(label));

  chartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

/**
 * Displays inline validation error messages next to their respective form fields.
 *
 * @param {{ name?: string, amount?: string, category?: string }} errors
 */
function showFormErrors(errors) {
  document.getElementById("error-name").textContent = errors.name || "";
  document.getElementById("error-amount").textContent = errors.amount || "";
  document.getElementById("error-category").textContent = errors.category || "";
}

/**
 * Clears all inline validation error messages from the form.
 */
function clearFormErrors() {
  document.getElementById("error-name").textContent = "";
  document.getElementById("error-amount").textContent = "";
  document.getElementById("error-category").textContent = "";
}

/**
 * Resets all form fields to their default empty/placeholder state.
 */
function resetForm() {
  document.getElementById("transaction-form").reset();
}

// --- Custom Categories ---

/** Base categories that are always present and cannot be removed */
const BASE_CATEGORIES = ["Food", "Transport", "Fun"];

/**
 * Rebuilds the #item-category <select> options from base + custom categories.
 *
 * @param {string[]} customCats
 */
function populateCategorySelect(customCats) {
  const select = document.getElementById("item-category");
  if (!select) return;

  // Keep the placeholder option then rebuild
  select.innerHTML = '<option value="">-- Select a category --</option>';
  const allCats = [...BASE_CATEGORIES, ...customCats];
  allCats.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/**
 * Handles the "Add Category" button click.
 * Validates the input, adds the category to the list, persists, and rebuilds the select.
 *
 * @param {string[]} customCats - Mutable array of custom category names.
 */
function handleAddCategory(customCats) {
  const input = document.getElementById("new-category");
  const errorEl = document.getElementById("error-new-category");
  const raw = input.value.trim();

  errorEl.textContent = "";

  if (raw.length === 0) {
    errorEl.textContent = "Category name cannot be empty.";
    return;
  }

  const allCats = [...BASE_CATEGORIES, ...customCats];
  if (allCats.map((c) => c.toLowerCase()).includes(raw.toLowerCase())) {
    errorEl.textContent = "That category already exists.";
    return;
  }

  customCats.push(raw);
  saveCategories(customCats);
  populateCategorySelect(customCats);
  input.value = "";
}

// --- Theme ---

/**
 * Reads the saved theme from localStorage and applies it.
 * Updates the toggle button icon accordingly.
 */
function initTheme() {
  const savedTheme = localStorage.getItem("ebv_theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
  updateThemeIcon();
}

/**
 * Updates the theme toggle button icon to reflect the current mode.
 */
function updateThemeIcon() {
  const btn = document.getElementById("btn-theme-toggle");
  if (!btn) return;
  btn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}

/**
 * Toggles dark mode on/off, persists the preference, and updates the icon.
 */
function handleThemeToggle() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("ebv_theme", isDark ? "dark" : "light");
  updateThemeIcon();
}

// --- Controller ---

/** In-memory transaction array — the single source of truth at runtime */
let transactions = [];

/** In-memory custom categories array */
let customCategories = [];

/**
 * Initialises the application on DOMContentLoaded:
 * loads stored data, renders all UI components, and wires event listeners.
 */
function initApp() {
  // Theme
  initTheme();

  // Load persisted data
  const stored = loadTransactions();
  stored.forEach((t) => transactions.push(t));

  customCategories = loadCategories();
  populateCategorySelect(customCategories);

  // Initial render
  const sortSelect = document.getElementById("sort-select");
  const currentSort = sortSelect ? sortSelect.value : "none";

  renderTransactionList(transactions, currentSort);
  renderTotalBalance(transactions);
  renderPieChart(transactions);

  // Form submit
  document.getElementById("transaction-form").addEventListener("submit", handleAddTransaction);

  // Delete (event delegation)
  document.getElementById("transaction-list").addEventListener("click", (e) => {
    if (e.target.matches("[data-id]")) {
      handleDeleteTransaction(e.target.dataset.id);
    }
  });

  // Add custom category
  const btnAddCategory = document.getElementById("btn-add-category");
  if (btnAddCategory) {
    btnAddCategory.addEventListener("click", () => handleAddCategory(customCategories));
  }

  const newCategoryInput = document.getElementById("new-category");
  if (newCategoryInput) {
    newCategoryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddCategory(customCategories);
      }
    });
  }

  // Theme toggle
  const btnTheme = document.getElementById("btn-theme-toggle");
  if (btnTheme) {
    btnTheme.addEventListener("click", handleThemeToggle);
  }

  // Sort control
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      renderTransactionList(transactions, sortSelect.value);
    });
  }
}

// Register initApp for browser; the export block below handles test environments
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initApp);
}

/**
 * Handles the form submit event to add a new transaction.
 *
 * @param {Event} event
 */
function handleAddTransaction(event) {
  event.preventDefault();
  const name = document.getElementById("item-name").value;
  const amount = document.getElementById("item-amount").value;
  const category = document.getElementById("item-category").value;

  const result = validate(name, amount, category);
  if (!result.valid) {
    showFormErrors(result.errors);
    return;
  }

  clearFormErrors();
  resetForm();

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

  const transaction = { id, name: name.trim(), amount: Number(amount), category };
  transactions.push(transaction);
  saveTransactions(transactions);

  const sortSelect = document.getElementById("sort-select");
  const currentSort = sortSelect ? sortSelect.value : "none";
  renderTransactionList(transactions, currentSort);
  renderTotalBalance(transactions);
  renderPieChart(transactions);
}

/**
 * Handles a delete button click by removing the transaction from memory,
 * persisting the change, and refreshing all UI components.
 * If saving fails the UI is left unchanged (Requirement 3.2).
 *
 * @param {string} id - The id of the transaction to remove.
 */
function handleDeleteTransaction(id) {
  const index = transactions.findIndex((t) => t.id === id);
  if (index === -1) return;

  const updated = transactions.filter((t) => t.id !== id);
  try {
    saveTransactions(updated);
  } catch (e) {
    // If save fails, do NOT update UI (Requirement 3.2)
    return;
  }

  transactions.length = 0;
  updated.forEach((t) => transactions.push(t));

  const sortSelect = document.getElementById("sort-select");
  const currentSort = sortSelect ? sortSelect.value : "none";
  renderTransactionList(transactions, currentSort);
  renderTotalBalance(transactions);
  renderPieChart(transactions);
}

// ES module exports for Vitest testing
export {
  validate,
  loadTransactions,
  saveTransactions,
  computeTotal,
  computeCategoryTotals,
  formatCurrency,
  CATEGORY_COLORS,
  getColor,
  loadCategories,
  saveCategories,
};
