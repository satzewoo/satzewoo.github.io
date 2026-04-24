<script>
	import { CATEGORIES, formatMoney, formatRelativeTime } from '$lib/types.js';
	import { walletStore } from '$lib/stores/transactions.svelte.js';

	/** @typedef {import('$lib/types.js').Transaction} Transaction */

	/** @type {{ tx: Transaction, onclick?: () => void }} */
	let { tx, onclick } = $props();

	const category = $derived(tx.category ? CATEGORIES[tx.category] : null);
	const wallet = $derived(walletStore.items.find((w) => w.id === tx.walletId));
	const isNegative = $derived(tx.kind === 'expense');
	const sign = $derived(tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '−' : '→');
</script>

<button class="row" {onclick} type="button">
	<div class="icon" style="background: {category?.color ?? '#A8A29B'}20; color: {category?.color ?? '#A8A29B'}">
		{category?.icon ?? '•'}
	</div>
	<div class="body">
		<div class="top">
			<div class="title">
				{tx.merchant ?? tx.counterparty ?? category?.ru ?? 'Без категории'}
			</div>
			<div class="amount tabular" class:neg={isNegative} class:pos={tx.kind === 'income'}>
				{sign}{formatMoney(tx.amountMinor, tx.currency)}
			</div>
		</div>
		<div class="bot subtle">
			<span>{category?.ru ?? 'other'}{wallet ? ` · ${wallet.name}` : ''}</span>
			<span>{formatRelativeTime(tx.occurredAt)}</span>
		</div>
	</div>
</button>

<style>
	.row {
		width: 100%;
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 14px 16px;
		background: transparent;
		border-radius: var(--radius-md);
		text-align: left;
		transition: background 120ms ease;
	}
	.row:active {
		background: rgba(0, 0, 0, 0.03);
	}
	.icon {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 20px;
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
	}
	.title {
		font-weight: 600;
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.amount {
		font-weight: 600;
		font-size: 15px;
		color: var(--fg);
	}
	.amount.pos {
		color: var(--success);
	}
	.bot {
		display: flex;
		justify-content: space-between;
		margin-top: 2px;
	}
</style>
