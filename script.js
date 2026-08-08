javascript
"use strict";

const STORAGE_KEY = "expense-tracker-expenses";

const CATEGORIES = new Set([
    "Food",
    "Transport",
    "Entertainment",
    "Shopping",
    "Bills",
    "Other"
]);

const MAX_DESCRIPTION_LENGTH = 100;
const MAX_AMOUNT = 100_000_000;

const elements = {
    form: document.getElementById("expense-form"),
    description: document.getElementById("description"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    date: document.getElementById("date"),

    search: document.getElementById("search"),
    filterCategory: document.getElementById("filter-category"),

    list: document.getElementById("expense-list"),
    clearAll: document.getElementById("clear-all"),

    total: document.getElementById("total"),
    count: document.getElementById("count"),
    average: document.getElementById("average")
};

let expenses = loadExpenses();

initialize();

function initialize() {
    elements.date.value = getToday();

    elements.form.addEventListener("submit", handleSubmit);
    elements.search.addEventListener("input", render);
    elements.filterCategory.addEventListener("change", render);
    elements.clearAll.addEventListener("click", clearAllExpenses);

    render();
}

function handleSubmit(event) {
    event.preventDefault();

    const description = elements.description.value.trim();
    const amount = Number(elements.amount.value);
    const category = elements.category.value;
    const date = elements.date.value;

    if (!isValidDescription(description)) {
        alert("Please enter a valid description.");
        elements.description.focus();
        return;
    }

    if (!isValidAmount(amount)) {
        alert("Please enter a valid amount.");
        elements.amount.focus();
        return;
    }

    if (!CATEGORIES.has(category)) {
        alert("Please select a valid category.");
        elements.category.focus();
        return;
    }

    if (!isValidDate(date)) {
        alert("Please select a valid date.");
        elements.date.focus();
        return;
    }

    const expense = {
        id: createId(),
        description,
        amount,
        category,
        date
    };

    expenses.push(expense);

    saveExpenses();

    elements.form.reset();
    elements.date.value = getToday();

    render();
    elements.description.focus();
}


/* =========================================
   VALIDATION
   ========================================= */

function isValidDescription(description) {
    return (
        typeof description === "string" &&
        description.length > 0 &&
        description.length <= MAX_DESCRIPTION_LENGTH
    );
}

function isValidAmount(amount) {
    return (
        Number.isFinite(amount) &&
        amount > 0 &&
        amount <= MAX_AMOUNT
    );
}

function isValidDate(date) {
    if (typeof date !== "string" || !date) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00`);

    return !Number.isNaN(parsed.getTime());
}

function createId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
}

function loadExpenses() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isValidExpense);

    } catch (error) {
        console.warn("Could not load expenses:", error);
        return [];
    }
}

function saveExpenses() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(expenses)
        );

    } catch (error) {
        console.warn("Could not save expenses:", error);
        alert(
            "Your browser could not save the expense data."
        );
    }
}

function isValidExpense(expense) {
    if (!expense || typeof expense !== "object") {
        return false;
    }

    return (
        typeof expense.id === "string" &&
        isValidDescription(expense.description) &&
        isValidAmount(expense.amount) &&
        CATEGORIES.has(expense.category) &&
        isValidDate(expense.date)
    );
}

function deleteExpense(id) {
    const originalLength = expenses.length;

    expenses = expenses.filter(
        expense => expense.id !== id
    );

    if (expenses.length === originalLength) {
        return;
    }

    saveExpenses();
    render();
}

function clearAllExpenses() {
    if (expenses.length === 0) {
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete all expenses?"
    );

    if (!confirmed) {
        return;
    }

    expenses = [];

    saveExpenses();
    render();
}

function getFilteredExpenses() {
    const search = elements.search.value
        .trim()
        .toLowerCase();

    const category = elements.filterCategory.value;

    return expenses
        .filter(expense => {

            const matchesSearch =
                expense.description
                    .toLowerCase()
                    .includes(search);

            const matchesCategory =
                category === "All" ||
                expense.category === category;

            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            return b.date.localeCompare(a.date);
        });
}

function render() {
    renderExpenses();
    updateSummary();
}

function renderExpenses() {
    elements.list.replaceChildren();

    const filteredExpenses = getFilteredExpenses();

    if (filteredExpenses.length === 0) {
        const empty = document.createElement("div");

        empty.className = "empty";
        empty.textContent =
            expenses.length === 0
                ? "No expenses yet."
                : "No expenses match your search.";

        elements.list.appendChild(empty);

        return;
    }

    const fragment = document.createDocumentFragment();

    for (const expense of filteredExpenses) {
        fragment.appendChild(
            createExpenseElement(expense)
        );
    }

    elements.list.appendChild(fragment);
}

function createExpenseElement(expense) {
    const article = document.createElement("article");

    article.className = "expense";

    const description = document.createElement("div");
    description.className = "expense-description";
    description.textContent = expense.description;

    const category = document.createElement("div");
    category.className = "expense-category";
    category.textContent = expense.category;

    const date = document.createElement("time");
    date.className = "expense-date";
    date.dateTime = expense.date;
    date.textContent = formatDate(expense.date);

    const amount = document.createElement("div");
    amount.className = "expense-amount";
    amount.textContent = formatCurrency(expense.amount);

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
        "aria-label",
        `Delete ${expense.description}`
    );

    deleteButton.addEventListener(
        "click",
        () => deleteExpense(expense.id)
    );

    article.append(
        description,
        category,
        date,
        amount,
        deleteButton
    );

    return article;
}

function updateSummary() {
    const total = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const count = expenses.length;

    const average = count > 0
        ? total / count
        : 0;

    elements.total.textContent =
        formatCurrency(total);

    elements.count.textContent =
        String(count);

    elements.average.textContent =
        formatCurrency(average);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);
}

function formatDate(date) {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(parsed);
}

function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
