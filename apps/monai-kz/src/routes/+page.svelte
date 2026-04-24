<script>
	import { base } from '$app/paths';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { txStore, walletStore, resetToSeed, addTransaction, clearPending } from '$lib/stores/transactions.svelte.js';
	import { CATEGORIES, fmtUsd, fmtUsdCompact } from '$lib/types.js';
	import TransactionCard from '$lib/components/TransactionCard.svelte';
	import MicButton from '$lib/components/MicButton.svelte';
	import { goto } from '$app/navigation';

	const BAR_COLORS = ['var(--bar-tan)', 'var(--bar-sky)', 'var(--bar-rose)', 'var(--bar-lime)'];

	function startOfMonth(d = new Date()) {
		const x = new Date(d);
		x.setDate(1);
		x.setHours(0, 0, 0, 0);
		return x.getTime();
	}

	const monthStart = $derived(startOfMonth());

	const monthExpenses = $derived(
		txStore.items.filter((t) => t.kind === 'expense' && t.occurredAt >= monthStart)
	);

	const totalMonthMinor = $derived(
		monthExpenses.reduce((sum, t) => sum + t.amountKztMinor, 0)
	);

	const byCategory = $derived.by(() => {
		/** @type {Map<string, { slug: string, total: number, count: number }>} */
		const map = new Map();
		for (const t of monthExpenses) {
			const slug = t.category ?? 'other_expense';
			const e = map.get(slug) ?? { slug, total: 0, count: 0 };
			e.total += t.amountKztMinor;
			e.count += 1;
			map.set(slug, e);
		}
		return [...map.values()].sort((a, b) => b.total - a.total);
	});

	const topCategories = $derived(byCategory.slice(0, 4));
	const maxCatTotal = $derived(topCategories[0]?.total ?? 1);

	const recentExpenses = $derived(
		txStore.items.filter((t) => t.kind === 'expense').slice(0, 12)
	);

	const groupedRecent = $derived.by(() => {
		/** @type {Record<string, { label: string, items: typeof recentExpenses, sum: number }>} */
		const groups = {};
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayTs = today.getTime();
		const yesterdayTs = todayTs - 86_400_000;
		for (const tx of recentExpenses) {
			let key, label;
			if (tx.occurredAt >= todayTs) {
				key = 'today';
				label = 'Today';
			} else if (tx.occurredAt >= yesterdayTs) {
				key = 'yesterday';
				label = 'Yesterday';
			} else {
				const d = new Date(tx.occurredAt);
				key = 'd' + d.toDateString();
				label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			}
			const g = groups[key] ?? { label, items: [], sum: 0 };
			g.items.push(tx);
			g.sum += tx.amountKztMinor;
			groups[key] = g;
		}
		return Object.values(groups);
	});

	const isEmpty = $derived(monthExpenses.length === 0);

	const pendingTx = $derived(txStore.pending);

	function quickSave() {
		if (!pendingTx) return;
		const confirmed = { ...pendingTx, id: 't_' + Date.now() };
		addTransaction(confirmed);
		clearPending();
	}
	function openReview() {
		goto(`${base}/confirm`);
	}
	function dismissPending() {
		clearPending();
	}
</script>

<div class="home">
	<header>
		<div style="width: 40px"></div>
		<button class="icon-circle" type="button" onclick={resetToSeed} aria-label="Настройки" title="Сбросить сид-данные">
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
			</svg>
		</button>
	</header>

	<section class="total">
		<div class="total-amount">
			<span class="num tabular">{fmtUsd(totalMonthMinor)}</span>
			<span class="cur">$</span>
		</div>
		<div class="filters">
			<button class="chip filter" type="button">
				this month
				<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
			</button>
			<span class="muted in">in</span>
			<button class="chip filter" type="button">
				Personal
				<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
			</button>
		</div>
	</section>

	<section class="chart" class:empty={isEmpty}>
		{#if isEmpty}
			<div class="ghost-bars" aria-hidden="true">
				{#each [85, 62, 45, 28] as h}
					<div class="ghost-bar" style="--h: {h}%"></div>
				{/each}
			</div>
			<div class="empty-label">Your transactions will show up here</div>
		{:else}
			{#each topCategories as cat, i (cat.slug)}
				{@const meta = CATEGORIES[/** @type {keyof typeof CATEGORIES} */ (cat.slug)]}
				{@const pct = Math.max(14, Math.round((cat.total / maxCatTotal) * 100))}
				<div class="bar-wrap" in:fly={{ y: 16, duration: 360, delay: i * 60, easing: quintOut }}>
					<div class="bar-track">
						<div
							class="bar-fill"
							style="height: {pct}%; background: {BAR_COLORS[i % BAR_COLORS.length]}"
						></div>
					</div>
					<div class="bar-emoji">{meta?.icon ?? '•'}</div>
					<div class="bar-amt tabular">{fmtUsdCompact(cat.total)}$</div>
				</div>
			{/each}
		{/if}
	</section>

	{#if isEmpty}
		<div class="promo" in:fade={{ duration: 300, delay: 200 }}>
			<div class="promo-body">
				<div class="promo-title">Join the AI-Reports Beta</div>
				<div class="promo-sub muted">Be one of the first to test chattin…</div>
			</div>
			<button class="promo-toggle" aria-label="Развернуть">
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
			</button>
		</div>
	{:else}
		<section class="recent">
			{#each groupedRecent as group}
				<div class="group-head">
					<span class="muted">{group.label}</span>
					<span class="muted tabular">{fmtUsd(group.sum)}$</span>
				</div>
				<div class="group-list">
					{#each group.items as tx (tx.id)}
						<div in:fly={{ y: 10, duration: 260, easing: quintOut }}>
							<TransactionCard {tx} />
						</div>
					{/each}
				</div>
			{/each}
		</section>
	{/if}

	{#if pendingTx}
		{@const pcat = pendingTx.category ? CATEGORIES[pendingTx.category] : null}
		<div class="pending" in:fly={{ y: 60, duration: 320, easing: quintOut }} out:fly={{ y: 60, duration: 200 }}>
			<button class="pending-body" type="button" onclick={openReview}>
				<div class="pending-icon">{pcat?.icon ?? '•'}</div>
				<div class="pending-text">
					<div class="pending-title">Save instantly?</div>
					<div class="pending-sub muted">{pendingTx.merchant ?? pendingTx.counterparty ?? pcat?.ru ?? 'Транзакция'} · ${fmtUsd(pendingTx.amountKztMinor)}</div>
				</div>
			</button>
			<button class="pbtn ok" type="button" onclick={quickSave} aria-label="Сохранить">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			</button>
			<button class="pbtn no" type="button" onclick={dismissPending} aria-label="Отмена">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
			</button>
		</div>
	{/if}

	<div class="fab" class:with-pending={pendingTx}>
		<div class="fab-left">
			<a class="fab-pill" href="{base}/record?mode=text" aria-label="Добавить">
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			</a>
			<button class="fab-pill" type="button" aria-label="Поиск">
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
			</button>
		</div>
		<MicButton href="{base}/record" size={68} />
	</div>
</div>

<style>
	.home {
		padding: 14px 20px 160px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 18px;
	}

	.total {
		padding: 8px 0 18px;
	}
	.total-amount {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
		margin-bottom: 14px;
	}
	.num {
		font-size: 60px;
		font-weight: 800;
		letter-spacing: -0.045em;
		line-height: 1;
	}
	.cur {
		font-size: 30px;
		color: var(--fg-subtle);
		font-weight: 500;
	}
	.filters {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.filter {
		background: var(--bg-soft);
		font-weight: 600;
	}
	.in {
		font-size: 13px;
		padding: 0 2px;
	}

	.chart {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 10px;
		height: 240px;
		padding: 8px 0 6px;
		margin-bottom: 22px;
		position: relative;
	}
	.chart.empty {
		justify-content: space-between;
	}
	.ghost-bars {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		height: 100%;
	}
	.ghost-bar {
		flex: 1;
		max-width: 72px;
		height: var(--h);
		background: var(--bar-ghost);
		border-radius: var(--radius-lg);
	}
	.empty-label {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-weight: 600;
		font-size: 16px;
		color: var(--fg);
		text-align: center;
		padding: 0 20px;
	}
	.bar-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		min-width: 0;
	}
	.bar-track {
		flex: 1;
		width: 100%;
		max-width: 72px;
		border-radius: var(--radius-lg);
		background: var(--bar-ghost);
		display: flex;
		align-items: flex-end;
		overflow: hidden;
	}
	.bar-fill {
		width: 100%;
		border-radius: var(--radius-lg);
		transition: height 420ms var(--ease-spring);
	}
	.bar-emoji {
		font-size: 22px;
		margin-top: 8px;
		line-height: 1;
	}
	.bar-amt {
		font-size: 13px;
		font-weight: 700;
		margin-top: 2px;
	}

	.promo {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 18px;
		background: var(--bg-soft);
		border-radius: var(--radius-md);
		margin-bottom: 20px;
	}
	.promo-body { flex: 1; min-width: 0; }
	.promo-title { font-weight: 700; font-size: 15px; }
	.promo-sub { font-size: 13px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.promo-toggle {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		color: var(--fg-muted);
	}

	.recent {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.group-head {
		display: flex;
		justify-content: space-between;
		padding: 10px 6px 4px;
		font-size: 13px;
	}
	.group-list {
		display: flex;
		flex-direction: column;
	}

	.pending {
		position: fixed;
		left: 20px;
		right: 20px;
		bottom: calc(104px + env(safe-area-inset-bottom));
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		max-width: 400px;
		margin: 0 auto;
		z-index: 10;
		box-shadow: var(--shadow-md);
	}
	.pending-body {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		text-align: left;
		min-width: 0;
	}
	.pending-icon {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: var(--bg-softer);
		display: grid;
		place-items: center;
		font-size: 20px;
		flex-shrink: 0;
	}
	.pending-text { flex: 1; min-width: 0; }
	.pending-title { font-weight: 700; font-size: 14px; }
	.pending-sub {
		font-size: 12px;
		margin-top: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pbtn {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: white;
		flex-shrink: 0;
	}
	.pbtn.ok { background: var(--success); }
	.pbtn.no { background: var(--accent-pressed); }

	.fab {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px calc(18px + env(safe-area-inset-bottom));
		background: linear-gradient(to top, var(--bg) 0%, var(--bg) 60%, rgba(10, 10, 9, 0) 100%);
		pointer-events: none;
		max-width: 440px;
		margin: 0 auto;
	}
	.fab > :global(*) {
		pointer-events: auto;
	}
	.fab-left {
		display: flex;
		gap: 8px;
		padding: 4px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
	}
	.fab-pill {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: var(--fg);
		text-decoration: none;
		background: transparent;
	}
	.fab-pill:active { background: var(--bg-soft); }
</style>
