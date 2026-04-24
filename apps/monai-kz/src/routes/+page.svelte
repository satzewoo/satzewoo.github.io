<script>
	import { base } from '$app/paths';
	import { txStore, walletStore, resetToSeed } from '$lib/stores/transactions.svelte.js';
	import { CATEGORIES, fmtUsd, fmtUsdCompact } from '$lib/types.js';
	import TransactionCard from '$lib/components/TransactionCard.svelte';
	import MicButton from '$lib/components/MicButton.svelte';

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

</script>

<div class="home">
	<header>
		<button class="icon-circle" aria-label="Меню">
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="4" y1="7" x2="20" y2="7" />
				<line x1="4" y1="12" x2="20" y2="12" />
				<line x1="4" y1="17" x2="14" y2="17" />
			</svg>
		</button>
		<button class="icon-circle" type="button" onclick={resetToSeed} aria-label="Настройки / сброс" title="Сбросить к сид-данным">
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
			</svg>
		</button>
	</header>

	<section class="total">
		<div class="total-label subtle">Total</div>
		<div class="total-amount">
			<span class="num tabular">{fmtUsd(totalMonthMinor)}</span>
			<span class="cur">$</span>
		</div>
		<button class="chip period" type="button">
			this month
			<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</button>
	</section>

	<section class="chart">
		{#if topCategories.length === 0}
			<div class="chart-empty subtle">No expenses this month yet</div>
		{:else}
			{#each topCategories as cat, i (cat.slug)}
				{@const meta = CATEGORIES[/** @type {keyof typeof CATEGORIES} */ (cat.slug)]}
				{@const pct = Math.max(12, Math.round((cat.total / maxCatTotal) * 100))}
				<div class="bar-wrap">
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

	<section class="recent">
		{#each groupedRecent as group}
			<div class="group-head">
				<span class="muted">{group.label}</span>
				<span class="muted tabular">{fmtUsd(group.sum)}$</span>
			</div>
			<div class="group-list">
				{#each group.items as tx (tx.id)}
					<TransactionCard {tx} />
				{/each}
			</div>
		{/each}
	</section>

	<div class="fab">
		<a class="fab-text" href="{base}/record?mode=text" aria-label="Текстом">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</a>
		<MicButton href="{base}/record" size={68} />
	</div>
</div>

<style>
	.home {
		padding: 14px 20px 140px;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.total {
		text-align: center;
		padding: 6px 0 22px;
	}
	.total-label {
		margin-bottom: 2px;
		font-size: 13px;
	}
	.total-amount {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
		margin-bottom: 10px;
	}
	.num {
		font-size: 52px;
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.cur {
		font-size: 28px;
		color: var(--fg-subtle);
		font-weight: 500;
	}
	.period {
		cursor: pointer;
	}

	.chart {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 10px;
		height: 240px;
		padding: 8px 0 6px;
		margin-bottom: 18px;
	}
	.chart-empty {
		width: 100%;
		text-align: center;
		padding: 80px 0;
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
		border: 1.5px dashed var(--border-strong);
		display: flex;
		align-items: flex-end;
		padding: 3px;
		overflow: hidden;
	}
	.bar-fill {
		width: 100%;
		border-radius: calc(var(--radius-lg) - 4px);
		transition: height 220ms ease;
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
		color: var(--fg);
	}

	.recent {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.group-head {
		display: flex;
		justify-content: space-between;
		padding: 14px 6px 4px;
		font-size: 13px;
	}
	.group-list {
		display: flex;
		flex-direction: column;
	}

	.fab {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
		padding: 16px 20px calc(18px + env(safe-area-inset-bottom));
		background: linear-gradient(to top, var(--bg) 0%, var(--bg) 60%, rgba(247, 246, 242, 0) 100%);
		pointer-events: none;
	}
	.fab > :global(*) {
		pointer-events: auto;
	}
	.fab-text {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		display: grid;
		place-items: center;
		color: var(--fg);
		text-decoration: none;
		order: 2;
	}
</style>
