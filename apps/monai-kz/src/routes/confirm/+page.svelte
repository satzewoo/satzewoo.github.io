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
	import { CATEGORIES, formatMoney } from '$lib/types.js';

	// Redirect home if user lands here directly
	onMount(() => {
		if (!txStore.pending) goto(base || '/');
	});

	const pending = $derived(txStore.pending);
	const lowConfidence = $derived((pending?.aiConfidence ?? 1) < 0.6);

	const availableCategories = $derived(
		Object.entries(CATEGORIES)
			.filter(([, c]) => c)
			.map(([slug, c]) => ({ slug, ...c }))
	);

	let showCategoryPicker = $state(false);

	function save() {
		if (!pending) return;
		// Commit — assign a real id and add via store
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

	function toggleKind() {
		if (!pending) return;
		pending.kind = pending.kind === 'expense' ? 'income' : 'expense';
	}
</script>

{#if pending}
	{@const cat = pending.category ? CATEGORIES[pending.category] : null}
	{@const wallet = walletStore.items.find((w) => w.id === pending.walletId)}
	<div class="confirm">
		<header>
			<button class="back" type="button" onclick={cancel} aria-label="Отмена">✕</button>
			<div class="title">Подтверди</div>
			<div style="width: 36px"></div>
		</header>

		{#if pending.rawInput}
			<div class="raw subtle">«{pending.rawInput}»</div>
		{/if}

		<div class="amount-card card">
			<button class="kind-toggle" type="button" onclick={toggleKind} title="Расход / доход">
				{pending.kind === 'expense' ? '−' : pending.kind === 'income' ? '+' : '↔'}
			</button>
			<input
				class="amount-input tabular"
				type="number"
				inputmode="decimal"
				bind:value={() => pending.amountMinor / 100,
					(v) => {
						pending.amountMinor = Math.round(Number(v) * 100);
					}}
			/>
			<div class="currency">{pending.currency}</div>
		</div>

		<div class="chips">
			<button class="chip" type="button" onclick={() => (showCategoryPicker = !showCategoryPicker)}>
				<span class="chip-icon" style="color: {cat?.color ?? '#888'}">{cat?.icon ?? '•'}</span>
				<span>{cat?.ru ?? 'Категория'}</span>
			</button>

			<div class="wallet-picker">
				{#each walletStore.items as w (w.id)}
					<button
						class="wchip"
						class:active={w.id === pending.walletId}
						type="button"
						onclick={() => pickWallet(w.id)}
						style="--bank: {w.color}"
					>
						{w.name}
					</button>
				{/each}
			</div>
		</div>

		{#if showCategoryPicker}
			<div class="picker">
				{#each availableCategories as c (c.slug)}
					<button
						class="pick-item"
						class:active={c.slug === pending.category}
						type="button"
						onclick={() => pickCategory(c.slug)}
					>
						<span class="pi-icon" style="background: {c.color}20; color: {c.color}">{c.icon}</span>
						<span>{c.ru}</span>
					</button>
				{/each}
			</div>
		{/if}

		<div class="meta">
			{#if pending.merchant}
				<div class="meta-row">
					<span class="subtle">Мерчант</span>
					<span>{pending.merchant}</span>
				</div>
			{/if}
			{#if pending.counterparty}
				<div class="meta-row">
					<span class="subtle">Кому</span>
					<span>{pending.counterparty}</span>
				</div>
			{/if}
			{#if pending.isInstallment}
				<div class="meta-row">
					<span class="subtle">Рассрочка</span>
					<span>{pending.installmentMonths ?? 12} мес</span>
				</div>
			{/if}
			{#if pending.currency !== 'KZT'}
				<div class="meta-row">
					<span class="subtle">≈ в KZT</span>
					<span class="tabular">{formatMoney(pending.amountKztMinor)}</span>
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
			<div class="warn">Низкая уверенность — проверь сумму и категорию перед сохранением.</div>
		{/if}

		<label class="note">
			<span class="subtle">Заметка</span>
			<input type="text" placeholder="опционально" bind:value={pending.note} />
		</label>

		<div class="actions">
			<button class="secondary" type="button" onclick={cancel}>Отменить</button>
			<button class="primary" type="button" onclick={save} disabled={pending.amountMinor <= 0}>
				Сохранить
			</button>
		</div>
	</div>
{/if}

<style>
	.confirm {
		padding: 16px 16px 40px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}
	.back {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--bg-elev);
		box-shadow: var(--shadow-neu-sm);
		font-size: 16px;
		color: var(--fg-muted);
	}
	.title {
		font-weight: 600;
	}
	.raw {
		padding: 10px 14px;
		margin-bottom: 16px;
		background: transparent;
		border-left: 3px solid var(--accent);
		font-style: italic;
	}

	.amount-card {
		padding: 22px 20px;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
	}
	.kind-toggle {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: rgba(232, 122, 58, 0.12);
		color: var(--accent);
		font-size: 22px;
		font-weight: 700;
	}
	.amount-input {
		flex: 1;
		background: transparent;
		border: none;
		font-size: 36px;
		font-weight: 700;
		outline: none;
		min-width: 0;
		color: var(--fg);
		letter-spacing: -0.02em;
	}
	.amount-input::-webkit-outer-spin-button,
	.amount-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}
	.currency {
		font-size: 18px;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 14px;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: var(--bg-elev);
		box-shadow: var(--shadow-neu-sm);
		border-radius: 100px;
		font-size: 14px;
		font-weight: 500;
	}
	.chip-icon {
		font-size: 16px;
	}
	.wallet-picker {
		display: flex;
		gap: 6px;
		flex: 1;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.wallet-picker::-webkit-scrollbar {
		display: none;
	}
	.wchip {
		flex: 0 0 auto;
		padding: 10px 12px;
		background: var(--bg-elev);
		border-radius: 100px;
		font-size: 13px;
		color: var(--fg-muted);
		border: 1px solid transparent;
		box-shadow: var(--shadow-neu-sm);
	}
	.wchip.active {
		border-color: var(--bank);
		color: var(--fg);
	}

	.picker {
		max-height: 220px;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		padding: 12px;
		margin-bottom: 14px;
		background: var(--bg-elev);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-neu-inset);
	}
	.pick-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 10px;
		font-size: 13px;
		text-align: left;
	}
	.pick-item.active {
		background: rgba(232, 122, 58, 0.12);
	}
	.pi-icon {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 14px;
		flex-shrink: 0;
	}

	.meta {
		padding: 14px 16px;
		margin-bottom: 14px;
		background: var(--bg-elev);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-neu-sm);
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
		background: rgba(196, 82, 58, 0.1);
		color: var(--danger);
		border-radius: var(--radius-sm);
		font-size: 13px;
		margin-bottom: 14px;
	}

	.note {
		display: block;
		padding: 0 4px;
		margin-bottom: 20px;
	}
	.note span {
		display: block;
		margin-bottom: 6px;
		padding: 0 4px;
	}
	.note input {
		width: 100%;
		padding: 12px 14px;
		background: var(--bg-elev);
		border: none;
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-neu-inset);
		font-size: 15px;
		outline: none;
	}

	.actions {
		display: flex;
		gap: 10px;
	}
	.secondary,
	.primary {
		flex: 1;
		padding: 16px;
		border-radius: var(--radius-md);
		font-size: 16px;
		font-weight: 600;
		box-shadow: var(--shadow-neu-sm);
	}
	.secondary {
		background: var(--bg-elev);
		color: var(--fg-muted);
	}
	.primary {
		background: var(--accent);
		color: white;
	}
	.primary:disabled {
		opacity: 0.5;
	}
</style>
