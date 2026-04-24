<script>
	import { CATEGORIES, fmtUsd } from '$lib/types.js';

	/** @typedef {import('$lib/types.js').Transaction} Transaction */

	/** @type {{ tx: Transaction, onclick?: () => void }} */
	let { tx, onclick } = $props();

	const category = $derived(tx.category ? CATEGORIES[tx.category] : null);
	const isIncome = $derived(tx.kind === 'income');
</script>

<button class="row" {onclick} type="button">
	<div class="icon">
		<span class="emoji">{category?.icon ?? '•'}</span>
	</div>
	<div class="body">
		<div class="title">
			{tx.merchant ?? tx.counterparty ?? category?.ru ?? 'Без категории'}
		</div>
		{#if category}
			<div class="tag subtle">#{category.ru.toLowerCase()}</div>
		{/if}
	</div>
	<div class="amount tabular" class:pos={isIncome}>
		{isIncome ? '+' : ''}${fmtUsd(tx.amountKztMinor)}
	</div>
</button>

<style>
	.row {
		width: 100%;
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 10px 4px;
		background: transparent;
		text-align: left;
		transition: background 120ms ease;
		border-radius: 16px;
	}
	.row:active {
		background: rgba(0, 0, 0, 0.03);
	}
	.icon {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		border-radius: 14px;
		background: var(--bg-soft);
		display: grid;
		place-items: center;
	}
	.emoji {
		font-size: 22px;
		line-height: 1;
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.title {
		font-weight: 600;
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--fg);
	}
	.tag {
		margin-top: 1px;
		font-size: 12px;
	}
	.amount {
		font-weight: 700;
		font-size: 15px;
		color: var(--fg);
		white-space: nowrap;
	}
	.amount.pos {
		color: var(--success);
	}
</style>
