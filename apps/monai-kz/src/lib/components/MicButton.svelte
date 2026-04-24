<script>
	/** @type {{ onclick?: () => void, href?: string, active?: boolean, size?: number }} */
	let { onclick, href, active = false, size = 84 } = $props();
</script>

{#if href}
	<a
		class="mic"
		class:active
		{href}
		style="--size: {size}px"
		aria-label="Записать голосом"
		data-sveltekit-preload-data="tap"
	>
		<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="9" y="2" width="6" height="12" rx="3" />
			<path d="M5 10v2a7 7 0 0 0 14 0v-2" />
			<line x1="12" y1="19" x2="12" y2="22" />
		</svg>
		{#if active}
			<span class="pulse" aria-hidden="true"></span>
			<span class="pulse pulse-2" aria-hidden="true"></span>
		{/if}
	</a>
{:else}
	<button class="mic" class:active onclick={onclick} type="button" style="--size: {size}px" aria-label="Записать голосом">
		<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="9" y="2" width="6" height="12" rx="3" />
			<path d="M5 10v2a7 7 0 0 0 14 0v-2" />
			<line x1="12" y1="19" x2="12" y2="22" />
		</svg>
		{#if active}
			<span class="pulse" aria-hidden="true"></span>
			<span class="pulse pulse-2" aria-hidden="true"></span>
		{/if}
	</button>
{/if}

<style>
	.mic {
		position: relative;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: var(--accent);
		color: white;
		display: grid;
		place-items: center;
		text-decoration: none;
		-webkit-user-select: none;
		user-select: none;
		box-shadow:
			0 10px 24px rgba(232, 122, 58, 0.4),
			var(--shadow-neu-sm);
		transition:
			transform 120ms ease,
			box-shadow 120ms ease;
	}
	.mic:active {
		transform: scale(0.94);
		background: var(--accent-pressed);
	}
	.mic.active {
		background: var(--accent-pressed);
	}
	.pulse {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px solid var(--accent);
		animation: pulse 1.4s ease-out infinite;
		pointer-events: none;
	}
	.pulse-2 {
		animation-delay: 0.7s;
	}
	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}
</style>
