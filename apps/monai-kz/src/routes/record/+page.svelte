<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { parseTransaction, toKzt } from '$lib/ai/mock-parser.js';
	import { setPending, walletStore, addTransaction } from '$lib/stores/transactions.svelte.js';
	import { CATEGORIES } from '$lib/types.js';

	const quickCategories = /** @type {const} */ ([
		'food', 'groceries', 'transport_taxi', 'transport_fuel', 'entertainment',
		'clothes', 'health', 'gifts', 'home', 'subscriptions', 'other_expense'
	]);

	let description = $state('');
	let amountStr = $state('');
	let pickedCategory = $state(/** @type {string | null} */ (null));

	let mode = $derived($page.url.searchParams.get('mode') ?? 'voice');

	const LANG_KEY = 'monai.speechLang';
	const LANGS = /** @type {const} */ ([
		{ code: 'ru-RU', label: 'RU' },
		{ code: 'kk-KZ', label: 'KZ' }
	]);

	let listening = $state(false);
	let transcript = $state('');
	let interim = $state('');
	let error = $state(/** @type {string | null} */ (null));
	let parsing = $state(false);
	let lang = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) ?? 'ru-RU' : 'ru-RU'
	);
	/** @type {any} */
	let recognition = null;

	/** @param {string} code */
	function setLang(code) {
		lang = code;
		if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, code);
		if (listening && recognition) recognition.stop();
		recognition = null;
	}

	const examples = [
		'Обед в Додо пицце 4500 тенге',
		'Жібердім маме 10к',
		'Закинул на Каспи 5000 за такси',
		'Той ресторан 500 мың',
		'Netflix 15 долларов'
	];

	/** @param {string} code */
	function friendlyError(code) {
		switch (code) {
			case 'network':
				return 'Speech service недоступен (Brave Shields часто блокирует Google). Попробуй Chrome/Safari или текстовый режим.';
			case 'not-allowed':
			case 'service-not-allowed':
				return 'Нет доступа к микрофону. Разреши в настройках.';
			case 'no-speech':
				return 'Не услышал речь — попробуй ещё раз.';
			case 'audio-capture':
				return 'Микрофон не найден.';
			case 'aborted':
				return '';
			default:
				return `Ошибка: ${code}`;
		}
	}

	function ensureRecognition() {
		if (typeof window === 'undefined') return null;
		const SR =
			/** @type {any} */ (window).SpeechRecognition ??
			/** @type {any} */ (window).webkitSpeechRecognition;
		if (!SR) return null;
		if (recognition) return recognition;
		recognition = new SR();
		recognition.lang = lang;
		recognition.interimResults = true;
		recognition.continuous = false;
		recognition.onresult = (/** @type {any} */ ev) => {
			let finalText = '';
			let interimText = '';
			for (let i = ev.resultIndex; i < ev.results.length; i++) {
				const res = ev.results[i];
				if (res.isFinal) finalText += res[0].transcript;
				else interimText += res[0].transcript;
			}
			if (finalText) transcript = (transcript + ' ' + finalText).trim();
			interim = interimText;
		};
		recognition.onerror = (/** @type {any} */ ev) => {
			error = friendlyError(ev.error);
			listening = false;
		};
		recognition.onend = () => {
			listening = false;
			interim = '';
		};
		return recognition;
	}

	function toggleListening() {
		error = null;
		const rec = ensureRecognition();
		if (!rec) {
			error = 'Web Speech API не поддерживается. Попробуй Chrome или Safari.';
			return;
		}
		if (listening) {
			rec.stop();
		} else {
			transcript = '';
			interim = '';
			try {
				rec.start();
				listening = true;
			} catch (e) {
				error = 'Не удалось запустить запись: ' + String(e);
			}
		}
	}

	/** @param {string} text */
	async function submit(text) {
		parsing = true;
		await new Promise((r) => setTimeout(r, 250));
		const result = parseTransaction(text);
		const defaultWallet =
			walletStore.items.find((w) => w.bankCode === result.walletHint) ?? walletStore.items[0];
		const amountMinor = result.amount * 100;
		const amountKztMinor = toKzt(result.amount, result.currency) * 100;
		setPending({
			id: 'pending_' + Date.now(),
			walletId: defaultWallet.id,
			category: /** @type {any} */ (result.categorySlug),
			kind: result.kind,
			amountMinor,
			currency: result.currency,
			amountKztMinor,
			merchant: result.merchant,
			counterparty: result.counterparty,
			note: result.notes,
			occurredAt: Date.now(),
			source: mode === 'text' ? 'text' : 'voice',
			rawInput: text,
			aiConfidence: result.confidence,
			isInstallment: result.isInstallment,
			installmentMonths: result.installmentMonths
		});
		parsing = false;
		goto(base || '/');
	}

	function accept() {
		if (listening && recognition) recognition.stop();
		const text = transcript.trim();
		if (!text) return;
		void submit(text);
	}

	function back() {
		if (listening && recognition) recognition.stop();
		goto(base || '/');
	}

	const amountNum = $derived(Number(amountStr.replace(/[^\d.]/g, '')) || 0);
	const canSaveManual = $derived(description.trim().length > 0 && amountNum > 0);

	function saveManual() {
		if (!canSaveManual) return;
		const slug = pickedCategory ?? 'other_expense';
		const tiyn = Math.round(amountNum * 100);
		addTransaction({
			id: 't_' + Date.now(),
			walletId: walletStore.items[0].id,
			category: /** @type {any} */ (slug),
			kind: 'expense',
			amountMinor: tiyn,
			currency: 'KZT',
			amountKztMinor: tiyn,
			merchant: description.trim(),
			counterparty: null,
			note: null,
			occurredAt: Date.now(),
			source: 'manual',
			rawInput: null,
			aiConfidence: 1,
			isInstallment: false,
			installmentMonths: null
		});
		description = '';
		amountStr = '';
		pickedCategory = null;
		goto(base || '/');
	}

	function handleManualSubmit(/** @type {SubmitEvent} */ ev) {
		ev.preventDefault();
		saveManual();
	}
</script>

{#if mode === 'voice'}
	<div
		class="overlay"
		in:scale={{ start: 0.85, duration: 320, easing: quintOut }}
		out:fade={{ duration: 180 }}
	>
		<div class="gradient" class:listening></div>

		<div class="top-row">
			<div class="lang-switch" role="group" aria-label="Язык">
				{#each LANGS as l}
					<button
						class="lang-btn"
						class:active={lang === l.code}
						type="button"
						onclick={() => setLang(l.code)}
					>
						{l.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="stage">
			{#if error}
				<div class="error" in:fade>{error}</div>
			{:else if parsing}
				<div class="hint" in:fade>Разбираю…</div>
			{:else if transcript || interim}
				<div class="transcript" in:fade>
					{transcript}
					<span class="interim">{interim ? ' ' + interim : ''}</span>
				</div>
			{:else if listening}
				<div class="hint pulse-text" in:fade>Слушаю, говори…</div>
			{:else}
				<div class="hint" in:fade>Нажми микрофон и расскажи</div>
			{/if}

			{#if !transcript && !interim && !listening && !parsing}
				<div class="examples" in:fade={{ delay: 120 }}>
					{#each examples as ex}
						<button
							class="ex"
							type="button"
							onclick={() => {
								transcript = ex;
								void submit(ex);
							}}
						>
							{ex}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="mic-zone">
			{#if listening}
				<span class="ring ring-1" aria-hidden="true"></span>
				<span class="ring ring-2" aria-hidden="true"></span>
				<span class="ring ring-3" aria-hidden="true"></span>
			{/if}
			<button
				class="mic"
				class:active={listening}
				type="button"
				onclick={toggleListening}
				aria-label="Микрофон"
			>
				<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="9" y="2" width="6" height="12" rx="3" />
					<path d="M5 10v2a7 7 0 0 0 14 0v-2" />
					<line x1="12" y1="19" x2="12" y2="22" />
				</svg>
			</button>
		</div>

		<div class="bottom-row">
			<button class="corner cancel" type="button" onclick={back} aria-label="Отмена">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
			</button>
			<button
				class="corner accept"
				class:ready={!!transcript.trim() && !parsing}
				type="button"
				onclick={accept}
				disabled={!transcript.trim() || parsing}
				aria-label="Принять"
			>
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			</button>
		</div>
	</div>
{:else}
	<div class="sheet-back" in:fade={{ duration: 180 }} out:fade={{ duration: 150 }} onclick={back} role="presentation"></div>
	<form
		class="sheet"
		onsubmit={handleManualSubmit}
		in:fly={{ y: '100%', duration: 360, easing: cubicOut }}
		out:fly={{ y: '100%', duration: 220, easing: cubicOut }}
	>
		<button class="sheet-close icon-circle" type="button" onclick={back} aria-label="Закрыть">
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
		</button>

		<div class="sheet-meta">
			<button class="chip meta-chip" type="button">Today
				<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
			</button>
			<button class="chip meta-chip" type="button">Once
				<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
			</button>
		</div>

		<input
			class="sheet-input desc"
			type="text"
			bind:value={description}
			placeholder="Description"
			autocomplete="off"
			autofocus
		/>
		<input
			class="sheet-input amt tabular"
			type="text"
			inputmode="decimal"
			bind:value={amountStr}
			placeholder="Amount"
			autocomplete="off"
		/>

		<div class="cat-row">
			<button
				class="cat-pill add"
				type="button"
				class:active={pickedCategory === null}
				onclick={() => (pickedCategory = null)}
				aria-label="Без категории"
			>
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			</button>
			{#each quickCategories as slug}
				{@const c = CATEGORIES[slug]}
				<button
					class="cat-pill"
					class:active={pickedCategory === slug}
					type="button"
					onclick={() => (pickedCategory = slug)}
				>
					<span class="cat-emoji">{c.icon}</span>
					<span class="cat-label">{c.ru}</span>
				</button>
			{/each}
		</div>

		<div class="sheet-actions">
			<button class="tag-btn" type="button" aria-label="Тег">
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="4" y1="9" x2="20" y2="9"/>
					<line x1="4" y1="15" x2="20" y2="15"/>
					<line x1="10" y1="3" x2="8" y2="21"/>
					<line x1="16" y1="3" x2="14" y2="21"/>
				</svg>
			</button>
			<button class="save-btn" type="submit" disabled={!canSaveManual}>
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				Save
			</button>
		</div>
	</form>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: calc(20px + env(safe-area-inset-top)) 20px calc(28px + env(safe-area-inset-bottom));
		overflow: hidden;
		transform-origin: center bottom;
	}
	.gradient {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 30% 20%, #f2a596 0%, transparent 55%),
			radial-gradient(circle at 80% 80%, #d5465c 0%, transparent 60%),
			linear-gradient(135deg, #ee7865 0%, #d94a62 100%);
		z-index: -1;
		transition: filter 400ms var(--ease-spring);
	}
	.gradient.listening {
		animation: grad-shift 5s ease-in-out infinite alternate;
	}
	@keyframes grad-shift {
		0% { filter: hue-rotate(0deg) saturate(1); }
		100% { filter: hue-rotate(-10deg) saturate(1.15); }
	}

	.top-row {
		display: flex;
		justify-content: flex-end;
	}
	.lang-switch {
		display: inline-flex;
		padding: 3px;
		border-radius: var(--radius-pill);
		background: rgba(0, 0, 0, 0.22);
		backdrop-filter: blur(8px);
	}
	.lang-btn {
		padding: 5px 12px;
		border-radius: var(--radius-pill);
		font-size: 12px;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.75);
		letter-spacing: 0.02em;
	}
	.lang-btn.active {
		background: rgba(255, 255, 255, 0.95);
		color: #c7384a;
	}

	.stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 20px 8px;
		text-align: center;
	}
	.hint {
		font-size: 20px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
	}
	.pulse-text {
		animation: pulse-text 1.4s ease-in-out infinite;
	}
	@keyframes pulse-text {
		0%, 100% { opacity: 0.55; }
		50% { opacity: 1; }
	}
	.transcript {
		font-size: 34px;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: #fff;
		max-width: 360px;
		text-wrap: balance;
	}
	.interim {
		color: rgba(255, 255, 255, 0.55);
		font-weight: 600;
	}
	.error {
		font-size: 15px;
		color: #fff;
		background: rgba(0, 0, 0, 0.25);
		border-radius: var(--radius-sm);
		padding: 10px 14px;
		max-width: 320px;
		line-height: 1.45;
	}

	.examples {
		margin-top: 40px;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
		max-width: 360px;
	}
	.ex {
		background: rgba(0, 0, 0, 0.22);
		color: #fff;
		padding: 7px 13px;
		border-radius: var(--radius-pill);
		font-size: 12px;
		backdrop-filter: blur(8px);
	}

	.mic-zone {
		position: relative;
		display: grid;
		place-items: center;
		height: 180px;
	}
	.mic {
		position: relative;
		width: 96px;
		height: 96px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.95);
		color: #c7384a;
		display: grid;
		place-items: center;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
		transition: transform 160ms var(--ease-spring);
		z-index: 2;
	}
	.mic:active { transform: scale(0.92); }
	.mic.active {
		background: #fff;
		color: #b72b44;
	}
	.ring {
		position: absolute;
		width: 96px;
		height: 96px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.45);
		pointer-events: none;
		animation: ring-pulse 2.2s ease-out infinite;
	}
	.ring-2 { animation-delay: 0.7s; }
	.ring-3 { animation-delay: 1.4s; }
	@keyframes ring-pulse {
		0%   { transform: scale(1);   opacity: 0.7; }
		100% { transform: scale(2.4); opacity: 0; }
	}

	.bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 8px;
	}
	.corner {
		width: 58px;
		height: 58px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		backdrop-filter: blur(8px);
		transition: background 160ms, transform 160ms;
	}
	.corner.cancel {
		background: rgba(0, 0, 0, 0.28);
	}
	.corner.accept {
		background: rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.5);
	}
	.corner.accept.ready {
		background: #fff;
		color: #c7384a;
	}
	.corner:active { transform: scale(0.9); }
	.corner:disabled { cursor: not-allowed; }

	/* Bottom-sheet text modal */
	.sheet-back {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 80;
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 90;
		background: var(--bg);
		border-top-left-radius: 28px;
		border-top-right-radius: 28px;
		padding: 22px 22px calc(22px + env(safe-area-inset-bottom));
		max-width: 440px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 18px;
		box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
	}
	.sheet-close {
		position: absolute;
		top: 16px;
		right: 16px;
		background: var(--bg-soft);
		border-color: transparent;
	}
	.sheet-meta {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}
	.meta-chip {
		background: var(--bg-soft);
		font-weight: 600;
		font-size: 13px;
	}
	.sheet-input {
		background: transparent;
		border: none;
		outline: none;
		font-size: 30px;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--fg);
		padding: 2px 0;
		width: 100%;
	}
	.sheet-input::placeholder {
		color: var(--fg-subtle);
		font-weight: 800;
	}
	.sheet-input.desc { margin-top: -8px; }
	.sheet-input.amt { margin-top: -12px; }

	.cat-row {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -22px;
		padding: 2px 22px 4px;
	}
	.cat-row::-webkit-scrollbar { display: none; }
	.cat-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 9px 14px;
		background: var(--bg-soft);
		border-radius: var(--radius-pill);
		font-size: 14px;
		color: var(--fg);
		font-weight: 600;
		flex-shrink: 0;
		border: 1.5px solid transparent;
		transition: border-color 140ms, background 140ms;
	}
	.cat-pill.active {
		border-color: var(--fg);
		background: var(--bg-softer);
	}
	.cat-pill.add {
		padding: 9px 12px;
		color: var(--fg-muted);
	}
	.cat-pill.add.active {
		color: var(--fg);
	}
	.cat-emoji { font-size: 16px; line-height: 1; }

	.sheet-actions {
		display: flex;
		gap: 10px;
		align-items: stretch;
	}
	.tag-btn {
		width: 52px;
		flex-shrink: 0;
		background: var(--bg-soft);
		border: 1.5px solid var(--border);
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
		color: var(--fg-muted);
	}
	.save-btn {
		flex: 1;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		padding: 14px 18px;
		background: var(--bg-softer);
		color: var(--fg);
		border-radius: var(--radius-md);
		font-size: 15px;
		font-weight: 700;
		transition: background 140ms, transform 140ms;
	}
	.save-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.save-btn:not(:disabled):active { transform: scale(0.98); }
</style>
