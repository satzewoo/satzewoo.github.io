/**
 * Transactions store — uses Svelte 5 runes.
 * State lives in a module-level $state() rune and is mutated by exported fns.
 */

import { seedTransactions, seedWallets } from '../seed.js';

/** @type {import('../types.js').Transaction[]} */
const initialTx = loadTx() ?? seedTransactions;

/** @type {import('../types.js').Wallet[]} */
const initialWallets = loadWallets() ?? seedWallets;

export const txStore = $state({
	/** @type {import('../types.js').Transaction[]} */
	items: initialTx,
	/** Transaction being previewed on the confirmation screen */
	/** @type {import('../types.js').Transaction | null} */
	pending: null
});

export const walletStore = $state({
	/** @type {import('../types.js').Wallet[]} */
	items: initialWallets
});

/**
 * Add a confirmed transaction.
 * @param {import('../types.js').Transaction} tx
 */
export function addTransaction(tx) {
	txStore.items = [tx, ...txStore.items];
	// update wallet balance
	const wallet = walletStore.items.find((w) => w.id === tx.walletId);
	if (wallet) {
		const delta = tx.kind === 'income' ? tx.amountMinor : -tx.amountMinor;
		wallet.balanceMinor += delta;
	}
	persistTx();
	persistWallets();
}

/** @param {string} id */
export function deleteTransaction(id) {
	const tx = txStore.items.find((t) => t.id === id);
	if (!tx) return;
	// revert wallet balance
	const wallet = walletStore.items.find((w) => w.id === tx.walletId);
	if (wallet) {
		const delta = tx.kind === 'income' ? -tx.amountMinor : tx.amountMinor;
		wallet.balanceMinor += delta;
	}
	txStore.items = txStore.items.filter((t) => t.id !== id);
	persistTx();
	persistWallets();
}

/** @param {import('../types.js').Transaction} tx */
export function setPending(tx) {
	txStore.pending = tx;
}

export function clearPending() {
	txStore.pending = null;
}

/** LocalStorage persistence — prototype-grade, replace with SQLite in native app */
const TX_KEY = 'monai.tx.v1';
const W_KEY = 'monai.wallets.v1';

function persistTx() {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(TX_KEY, JSON.stringify(txStore.items));
	} catch {
		/* ignore quota errors in prototype */
	}
}

function persistWallets() {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(W_KEY, JSON.stringify(walletStore.items));
	} catch {
		/* ignore */
	}
}

/** @returns {import('../types.js').Transaction[] | null} */
function loadTx() {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(TX_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

/** @returns {import('../types.js').Wallet[] | null} */
function loadWallets() {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(W_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function resetToSeed() {
	txStore.items = seedTransactions;
	walletStore.items = seedWallets;
	persistTx();
	persistWallets();
}
