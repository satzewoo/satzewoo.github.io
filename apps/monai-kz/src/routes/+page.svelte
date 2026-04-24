<script>
	import { base } from '$app/paths';
	import { txStore, walletStore, resetToSeed } from '$lib/stores/transactions.svelte.js';
	import { formatMoney } from '$lib/types.js';
	import TransactionCard from '$lib/components/TransactionCard.svelte';
	import MicButton from '$lib/components/MicButton.svelte';

	const totalKzt = $derived(walletStore.items.reduce((sum, w) => sum + w.balanceMinor, 0));

	const todaySpentKzt = $derived.by(() => {
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);
		const ts = startOfDay.getTime();
		return txStore.items
			.filter((t) => t.kind === 'expense' && t.occurredAt >= ts)
			.reduce((sum, t) => sum + t.amountKztMinor, 0);
	});

	const recentTx = $derived(txStore.items.slice(0, 20));
</script>

<div class="home">
	<header>
		<div class="brand">
			<span class="dot"></span>
			MonAi <span class="muted">KZ</span>
		</div>
		<button class="icon-btn" type="button" onclick={resetToSeed} title="Сбросить к сид-данным" aria-label="Сброс">
			↻
		</button>
	</header>

	<section class="hero card">
		<div class="hero-label subtle">Общий баланс</div>
		<div class="hero-balance tabular">{formatMoney(totalKzt)}</div>
		<div class="hero-sub">
			<span class="subtle">Сегодня потрачено</span>
			<span class="tabular">{formatMoney(todaySpentKzt)}</span>
		</div>
	</section>

	<section class="wallets">
		{#each walletStore.items as wallet (wallet.id)}
			<div class="wallet-chip" style="--bank: {wallet.color}">
				<div class="wname">{wallet.name}</div>
				<div class="wamt tabular">{formatMoney(wallet.balanceMinor, wallet.currency)}</div>
			</div>
		{/each}
	</section>

	<section class="tx-list">
		<div class="section-head">
			<h2 class="h2">Последние</h2>
			<span class="subtle">{txStore.items.length} всего</span>
		</div>
		{#if recentTx.length === 0}
			<div class="empty subtle">Пока пусто — нажми микрофон и расскажи о трате</div>
		{:else}
			<div class="card tx-card">
				{#each recentTx as tx (tx.id)}
					<TransactionCard {tx} />
				{/each}
			</div>
		{/if}
	</section>

	<div class="fab">
		<a class="text-btn" href="{base}/record?mode=text" aria-label="Текстом">abc</a>
		<MicButton href="{base}/record" />
		<div class="spacer"></div>
	</div>
</div>

<style>
	.home {
		padding: 16px 16px 140px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 18px;
	}
	.brand {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.02em;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 4px rgba(232, 122, 58, 0.18);
	}
	.icon-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--bg-elev);
		box-shadow: var(--shadow-neu-sm);
		font-size: 18px;
		color: var(--fg-muted);
		display: grid;
		place-items: center;
	}

	.hero {
		padding: 24px;
		margin-bottom: 14px;
	}
	.hero-label {
		margin-bottom: 6px;
	}
	.hero-balance {
		font-size: 38px;
		font-weight: 700;
		letter-spacing: -0.03em;
		margin-bottom: 12px;
	}
	.hero-sub {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
	}

	.wallets {
		display: flex;
		gap: 10px;
		margin-bottom: 22px;
		overflow-x: auto;
		padding-bottom: 4px;
		scrollbar-width: none;
	}
	.wallets::-webkit-scrollbar {
		display: none;
	}
	.wallet-chip {
		flex: 0 0 auto;
		min-width: 140px;
		padding: 12px 14px;
		background: var(--bg-elev);
		border-radius: var(--radius-sm);
		border-left: 3px solid var(--bank);
		box-shadow: var(--shadow-neu-sm);
	}
	.wname {
		font-size: 12px;
		color: var(--fg-muted);
		margin-bottom: 4px;
	}
	.wamt {
		font-size: 15px;
		font-weight: 600;
	}

	.tx-list {
		margin-top: 8px;
	}
	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
		padding: 0 4px;
	}
	.tx-card {
		padding: 6px;
	}
	.empty {
		text-align: center;
		padding: 40px 20px;
	}

	.fab {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 24px;
		padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
		background: linear-gradient(
			to top,
			var(--bg) 0%,
			var(--bg) 60%,
			rgba(243, 239, 232, 0) 100%
		);
		pointer-events: none;
	}
	.fab > :global(*) {
		pointer-events: auto;
	}
	.text-btn {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--bg-elev);
		box-shadow: var(--shadow-neu-sm);
		color: var(--fg-muted);
		font-size: 16px;
		font-weight: 600;
		font-family: var(--font-mono);
		display: grid;
		place-items: center;
		text-decoration: none;
		-webkit-user-select: none;
		user-select: none;
	}
	.spacer {
		width: 52px;
	}
</style>
