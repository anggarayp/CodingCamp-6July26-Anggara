# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by category. Users can add transactions with a name, amount, and category; view all transactions in a scrollable list; see their total balance update in real time; and visualize spending distribution across categories through an interactive pie chart. All data is persisted in the browser's Local Storage. The application is built with HTML, CSS, and Vanilla JavaScript — no backend server, no framework, no build step required.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an Item Name, Amount, and Category.
- **Transaction_List**: The scrollable UI component that displays all saved Transactions.
- **Input_Form**: The HTML form used to capture a new Transaction's Item Name, Amount, and Category.
- **Category**: One of three predefined expense categories: `Food`, `Transport`, or `Fun`.
- **Total_Balance**: The computed sum of all Transaction amounts displayed at the top of the page.
- **Pie_Chart**: A visual chart rendered via Chart.js that shows spending distribution by Category.
- **Storage**: The browser's Local Storage API used to persist Transaction data client-side.
- **Validator**: The client-side validation logic that checks Input_Form fields before submission.

---

## Requirements

### Requirement 1: Add Transaction via Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for Item Name, a numeric field for Amount, and a dropdown selector for Category.
2. THE Input_Form Category selector SHALL offer exactly three options: `Food`, `Transport`, and `Fun`.
3. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount, THE App SHALL create a new Transaction and add it to the Transaction_List.
4. WHEN the user submits the Input_Form, THE Validator SHALL verify that the Item Name field is not empty, the Amount field contains a positive numeric value, and a Category is selected.
5. IF the Validator detects that any required field is empty or the Amount is not a positive number, THEN THE App SHALL display an inline error message next to the invalid field and SHALL NOT create a Transaction.
6. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty/placeholder state, clearing any validation error messages that were previously displayed.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction as a list item showing the Item Name, Amount (formatted as currency), and Category.
2. WHILE the number of Transactions exceeds the visible height of the Transaction_List container, THE Transaction_List SHALL be scrollable vertically.
3. WHEN the App loads, THE Transaction_List SHALL render all Transactions previously saved in Storage.
4. WHEN a new Transaction is added, THE Transaction_List SHALL append the new item without requiring a page reload.
5. THE Transaction_List SHALL display a placeholder message when no Transactions exist.

---

### Requirement 3: Delete Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can correct mistakes or remove irrelevant entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete button for each Transaction item.
2. WHEN the user clicks the delete button on a Transaction item and Storage deletion succeeds, THE App SHALL remove that Transaction from the Transaction_List, update the Total_Balance, and update the Pie_Chart; IF Storage deletion fails, THEN THE App SHALL leave the Transaction_List, Total_Balance, and Pie_Chart unchanged.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total balance at the top of the page, so that I can quickly understand how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Total_Balance as the sum of all Transaction amounts at the top of the page.
2. WHEN a Transaction is added, THE App SHALL recalculate and update the Total_Balance display immediately.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Total_Balance display immediately.
4. WHEN the App loads with no Transactions in Storage, THE App SHALL display a Total_Balance of `0`.
5. THE Total_Balance SHALL be formatted as a numeric currency value (e.g., `Rp 50,000` or `$50.00` depending on locale configuration).

---

### Requirement 5: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a Pie_Chart that shows the proportional spending for each Category relative to the total of all Transactions.
2. WHEN a Transaction is added, THE App SHALL update the Pie_Chart to reflect the new spending distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE App SHALL update the Pie_Chart to reflect the updated spending distribution without requiring a page reload.
4. WHEN the App loads with no Transactions in Storage, THE App SHALL display the Pie_Chart in an empty or placeholder state.
5. THE Pie_Chart SHALL assign a distinct, consistent color to each Category (`Food`, `Transport`, `Fun`).
6. THE Pie_Chart SHALL be rendered using the Chart.js library; THE App SHALL load the Chart.js library via a CDN link.

---

### Requirement 6: Data Persistence via Local Storage

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is successfully created, THE App SHALL serialize the updated Transaction array and write it to Storage under a defined key.
2. WHEN a Transaction is deleted, THE App SHALL serialize the updated Transaction array and write it to Storage under the same defined key.
3. WHEN the App loads, THE App SHALL read the Transaction array from Storage and initialize the Transaction_List, Total_Balance, and Pie_Chart from the stored data; IF Storage read succeeds but any component initialization fails, THEN THE App SHALL continue running with the remaining components in their default state.
4. IF Storage contains no data for the defined key, THEN THE App SHALL initialize with an empty Transaction array.
5. THE App SHALL store Transaction data exclusively in the browser's Local Storage API with no server-side calls.

---

### Requirement 7: File Structure and Technical Constraints

**User Story:** As a developer, I want the codebase to follow a clear, minimal file structure, so that the project is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be implemented using exactly one HTML file, one CSS file located in a `css/` directory, and one JavaScript file located in a `js/` directory.
2. THE App SHALL use only HTML, CSS, and Vanilla JavaScript with no front-end frameworks, build tools, or third-party JavaScript libraries other than those explicitly listed in these requirements (e.g., Chart.js).
3. THE App SHALL function correctly in modern versions of Chrome, Firefox, Edge, and Safari without any installation or server setup.
4. THE App SHALL load all external libraries (e.g., Chart.js) via CDN links in the HTML file.

---

### Requirement 8: Performance and Responsiveness

**User Story:** As a user, I want the application to respond instantly to my actions, so that I do not experience any noticeable lag while managing my expenses.

#### Acceptance Criteria

1. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Total_Balance, and Pie_Chart within 100 milliseconds on a modern desktop browser.
2. THE App SHALL complete its initial load and render from Local Storage within 520 milliseconds on a modern desktop browser with no network latency for local assets.
3. WHILE the App is running, THE App SHALL maintain smooth UI interactions with no layout shifts or repaints that cause visible flickering.

---

### Requirement 9: Visual Design and Usability

**User Story:** As a user, I want a clean and readable interface, so that I can use the application comfortably without confusion.

#### Acceptance Criteria

1. THE App SHALL apply a single, consistent visual theme across all UI components using the single CSS file.
2. THE App SHALL use a font size of at least 14px for all body text to ensure readability.
3. THE App SHALL provide clear visual hierarchy by distinguishing the Total_Balance display, Input_Form, Transaction_List, and Pie_Chart as visually separate sections.
4. THE App SHALL display category labels alongside their corresponding color in the Pie_Chart legend.
    