<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import MicButton from '$lib/components/MicButton.svelte';
	import { parseTransaction, toKzt } from '$lib/ai/mock-parser.js';
	import { setPending, walletStore } from '$lib/stores/transactions.svelte.js';

	let mode = $derived($page.url.searchParams.get('mode') ?? 'voice');

	let listening = $state(false);
	let transcript = $state('');
	let interim = $state('');
	let error = $state(/** @type {string | null} */ (null));
	let parsing = $state(false);
	/** @type {any} */
	let recognition = null;

	const examples = [
		'Обед в Додо пицце 4500 тенге',
		'Жібердім маме 10к',
		'Закинул на Каспи 5000 за такси',
		'Той ресторан задаток 500 мың',
		'0-0-12 холодильник самсунг 450000',
		'Садақа мешітке 20 000',
		'Netflix 15 долларов'
	];

	/** @param {string} code */
	function friendlyError(code) {
		switch (code) {
			case 'network':
				return 'Speech service недоступен (в Brave Shields часто блокирует Google). Попробуй Chrome/Safari или текстовый режим.';
			case 'not-allowed':
			case 'service-not-allowed':
				return 'Нет доступа к микрофону. Разреши в настройках браузера.';
			case 'no-speech':
				return 'Не услышал речь — попробуй ещё раз.';
			case 'audio-capture':
				return 'Микрофон не найден.';
			case 'aborted':
				return '';
			default:
				return `Ошибка микрофона: ${code}`;
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
		recognition.lang = 'ru-RU';
		recognition.interimResults = true;
		recognition.continuous = false;
		recognition.onresult = (
			/** @type {{ resultIndex: number, results: SpeechRecognitionResultList }} */ ev
		) => {
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
			if (transcript.trim()) void submit(transcript);
		};
		return recognition;
	}

	function toggleListening() {
		error = null;
		const rec = ensureRecognition();
		if (!rec) {
			error = 'Web Speech API не поддерживается. Попробуй Chrome или Safari iOS 14.5+.';
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
		await new Promise((r) => setTimeout(r, 300));
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
		goto(`${base}/confirm`);
	}

	function handleTextSubmit(/** @type {SubmitEvent} */ ev) {
		ev.preventDefault();
		if (!transcript.trim()) return;
		void submit(transcript);
	}

	function back() {
		if (listening && recognition) recognition.stop();
		goto(base || '/');
	}
</script>

<div class="record">
	<header>
		<button class="icon-circle back" type="button" onclick={back} aria-label="Назад">
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6" />
			</svg>
		</button>
		<div class="title">{mode === 'text' ? 'Текстом' : 'Голосом'}</div>
		<div style="width: 40px"></div>
	</header>

	{#if mode === 'voice'}
		<div class="stage">
			<div class="status subtle">
				{#if parsing}
					Разбираю…
				{:else if listening}
					Слушаю, говори…
				{:else if transcript}
					Записано
				{:else}
					Нажми и расскажи о трате
				{/if}
			</div>

			<div class="mic-wrap">
				<MicButton onclick={toggleListening} active={listening} size={120} />
			</div>

			<div class="transcript" class:dim={!transcript && !interim}>
				{#if transcript || interim}
					<span>{transcript}</span>
					<span class="interim">{interim ? ' ' + interim : ''}</span>
				{:else}
					<span>«Обед в Додо 4500 тенге»</span>
				{/if}
			</div>

			{#if error}
				<div class="error">{error}</div>
			{/if}
		</div>
	{:else}
		<form class="text-form" onsubmit={handleTextSubmit}>
			<label class="subtle" for="text-input">Опиши трату</label>
			<textarea
				id="text-input"
				bind:value={transcript}
				placeholder="Жібердім маме 10к"
				rows="3"
				autofocus
			></textarea>
			<button class="primary" type="submit" disabled={!transcript.trim() || parsing}>
				{parsing ? 'Разбираю…' : 'Разобрать'}
			</button>
		</form>
	{/if}

	<div class="examples">
		<div class="subtle ex-head">Или попробуй пример:</div>
		<div class="ex-row">
			{#each examples as ex}
				<button
					class="ex"
					type="button"
					onclick={() => {
						transcript = ex;
						if (mode === 'voice') void submit(ex);
					}}
				>
					{ex}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.record {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		padding: 14px 20px 32px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.title {
		font-weight: 600;
		font-size: 15px;
	}

	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30px 12px 20px;
	}
	.status {
		margin-bottom: 32px;
		font-size: 14px;
		min-height: 20px;
	}
	.mic-wrap {
		margin-bottom: 36px;
	}
	.transcript {
		min-height: 60px;
		text-align: center;
		font-size: 18px;
		line-height: 1.5;
		max-width: 340px;
		font-weight: 500;
	}
	.transcript.dim {
		color: var(--fg-subtle);
	}
	.interim {
		color: var(--fg-muted);
		font-style: italic;
	}
	.error {
		color: var(--danger);
		font-size: 13px;
		margin-top: 20px;
		text-align: center;
		max-width: 320px;
		line-height: 1.45;
	}

	.text-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px 0;
	}
	.text-form label {
		padding: 0 4px;
	}
	textarea {
		background: var(--bg-elev);
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		padding: 16px;
		font-size: 17px;
		resize: none;
		outline: none;
	}
	textarea:focus {
		border-color: var(--accent-soft);
		box-shadow: 0 0 0 3px rgba(237, 111, 75, 0.12);
	}
	.primary {
		background: var(--fg);
		color: var(--bg-elev);
		padding: 14px 18px;
		border-radius: var(--radius-pill);
		font-size: 15px;
		font-weight: 600;
	}
	.primary:disabled {
		opacity: 0.3;
	}

	.examples {
		margin-top: auto;
		padding: 20px 0 0;
	}
	.ex-head {
		margin-bottom: 10px;
		padding: 0 4px;
	}
	.ex-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.ex {
		background: var(--bg-elev);
		padding: 8px 14px;
		border-radius: var(--radius-pill);
		font-size: 13px;
		color: var(--fg);
		border: 1px solid var(--border);
	}
	.ex:active {
		background: var(--bg-soft);
	}
</style>
