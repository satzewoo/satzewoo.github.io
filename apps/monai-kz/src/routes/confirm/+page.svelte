<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		txStore,
		walletStore,
		addTransaction,
		clearPending
	} from '$lib/stores/transactions.svelte.js';
	import { CATEGORIES, fmtUsd } from '$lib/types.js';

	onMount(() => {
		if (!txStore.pending) goto(base || '/');
	});

	const pending = $derived(txStore.pending);
	const lowConfidence = $derived((pending?.aiConfidence ?? 1) < 0.6);

	const availableCategories = $derived(
		Object.entries(CATEGORIES).map(([slug, c]) => ({ slug, ...c }))
	);

	let showCategoryPicker = $state(false);

	function save() {
		if (!pending) return;
		const confirmed = { ...pending, id: 't_' + Date.now() };
		addTransaction(confirmed);
		clearPending();
		goto(base || '/');
	}

	function cancel() {
		clearPending();
		goto(base || '/');
	}

	/** @param {string} slug */
	function pickCategory(slug) {
		if (!pending) return;
		pending.category = /** @type {any} */ (slug);
		showCategoryPicker = false;
	}

	/** @param {string} walletId */
	function pickWallet(walletId) {
		if (!pending) return;
		pending.walletId = walletId;
	}
</script>

{#if pending}
	{@const cat = pending.category ? CATEGORIES[pending.category] : null}
	<div class="confirm">
		<header>
			<div style="width: 40px"></div>
			<button class="icon-circle close" type="button" onclick={cancel} aria-label="Отмена">
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<line x1="6" y1="6" x2="18" y2="18" />
					<line x1="6" y1="18" x2="18" y2="6" />
				</svg>
			</button>
		</header>

		<section class="hero">
			<div class="merchant">
				{pending.merchant ?? pending.counterparty ?? cat?.ru ?? 'Трата'}
			</div>
			<div class="amount tabular">
				<span class="cur">$</span><span class="num">{fmtUsd(pending.amountKztMinor)}</span>
			</div>
			<button
				class="cat-pill"
				type="button"
				onclick={() => (showCategoryPicker = !showCategoryPicker)}
			>
				<span class="cat-icon">{cat?.icon ?? '•'}</span>
				<span>{cat?.ru ?? 'Выбери категорию'}</span>
			</button>
		</section>

		{#if pending.rawInput}
			<div class="raw subtle">«{pending.rawInput}»</div>
		{/if}

		{#if showCategoryPicker}
			<div class="picker">
				{#each availableCategories as c (c.slug)}
					<button
						class="pick-item"
						class:active={c.slug === pending.category}
						type="button"
						onclick={() => pickCategory(c.slug)}
					>
						<span class="pi-icon">{c.icon}</span>
						<span class="pi-label">{c.ru}</span>
					</button>
				{/each}
			</div>
		{/if}

		<div class="wallets">
			<div class="field-label subtle">Кошелёк</div>
			<div class="wallet-row">
				{#each walletStore.items as w (w.id)}
					<button
						class="wchip"
						class:active={w.id === pending.walletId}
						type="button"
						onclick={() => pickWallet(w.id)}
					>
						<span class="wdot" style="background: {w.color}"></span>
						{w.name}
					</button>
				{/each}
			</div>
		</div>

		<div class="meta">
			{#if pending.isInstallment}
				<div class="meta-row">
					<span class="subtle">Рассрочка</span>
					<span>{pending.installmentMonths ?? 12} мес</span>
				</div>
			{/if}
			<div class="meta-row">
				<span class="subtle">AI confidence</span>
				<span class="conf" class:low={lowConfidence}>
					{Math.round(pending.aiConfidence * 100)}%
				</span>
			</div>
		</div>

		{#if lowConfidence}
			<div class="warn">Низкая уверенность — проверь категорию перед сохранением.</div>
		{/if}

		<label class="note">
			<span class="subtle">Заметка</span>
			<input type="text" placeholder="опционально" bind:value={pending.note} />
		</label>

		<div class="actions">
			<button class="primary" type="button" onclick={save} disabled={pending.amountMinor <= 0}>
				Сохранить
			</button>
		</div>
	</div>
{/if}

<style>
	.confirm {
		padding: 14px 20px 40px;
		min-height: 100vh;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.hero {
		padding: 40px 0 28px;
	}
	.merchant {
		font-size: 34px;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		margin-bottom: 4px;
	}
	.amount {
		font-size: 42px;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		margin-bottom: 20px;
	}
	.amount .cur {
		color: var(--fg-subtle);
		font-weight: 500;
		font-size: 34px;
		margin-right: 2px;
	}
	.cat-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		font-size: 14px;
		font-weight: 500;
		color: var(--fg);
	}
	.cat-icon {
		font-size: 16px;
	}

	.raw {
		padding: 10px 14px;
		margin-bottom: 16px;
		background: var(--bg-soft);
		border-radius: var(--radius-sm);
		font-style: italic;
	}

	.picker {
		max-height: 260px;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		padding: 12px;
		margin-bottom: 16px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}
	.pick-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 10px 6px;
		border-radius: 12px;
		font-size: 11px;
		text-align: center;
	}
	.pick-item.active {
		background: var(--bg-soft);
	}
	.pi-icon {
		font-size: 22px;
	}
	.pi-label {
		color: var(--fg-muted);
	}

	.wallets {
		margin-bottom: 16px;
	}
	.field-label {
		padding: 0 4px 8px;
	}
	.wallet-row {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		padding-bottom: 2px;
	}
	.wallet-row::-webkit-scrollbar {
		display: none;
	}
	.wchip {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		font-size: 13px;
		color: var(--fg-muted);
	}
	.wchip.active {
		border-color: var(--fg);
		color: var(--fg);
		background: var(--bg-soft);
	}
	.wdot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.meta {
		padding: 14px 16px;
		margin-bottom: 14px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}
	.meta-row {
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
		font-size: 14px;
	}
	.conf.low {
		color: var(--danger);
	}

	.warn {
		padding: 12px 14px;
		background: rgba(221, 91, 71, 0.1);
		color: var(--danger);
		border-radius: var(--radius-sm);
		font-size: 13px;
		margin-bottom: 14px;
	}

	.note {
		display: block;
		padding: 0 4px;
		margin-bottom: 24px;
	}
	.note span {
		display: block;
		margin-bottom: 6px;
	}
	.note input {
		width: 100%;
		padding: 12px 14px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 15px;
		outline: none;
	}
	.note input:focus {
		border-color: var(--accent-soft);
	}

	.actions {
		display: flex;
		gap: 10px;
	}
	.primary {
		flex: 1;
		padding: 16px;
		background: var(--fg);
		color: var(--bg-elev);
		border-radius: var(--radius-pill);
		font-size: 16px;
		font-weight: 600;
	}
	.primary:disabled {
		opacity: 0.3;
	}
</style>
