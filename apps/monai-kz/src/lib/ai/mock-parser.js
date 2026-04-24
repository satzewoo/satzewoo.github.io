/**
 * Mock AI parser — heuristic implementation of the prod system prompt from spec §5.2.
 * Emulates GPT-4o-mini + Apple Foundation Models output using regex + lookups.
 * Returns an object matching the OUTPUT SCHEMA.
 *
 * Real implementation would call:
 *   POST /api/parse  →  proxied to OpenAI gpt-4o-mini with json_schema
 *   OR  FoundationModels.generate() on iOS 26+
 */

/**
 * @typedef {object} ParseResult
 * @property {'expense' | 'income' | 'transfer'} kind
 * @property {number} amount              // major units
 * @property {'KZT' | 'USD' | 'EUR' | 'RUB' | 'CNY' | 'TRY'} currency
 * @property {string} categorySlug
 * @property {string | null} merchant
 * @property {string | null} counterparty
 * @property {string | null} walletHint
 * @property {boolean} isInstallment
 * @property {number | null} installmentMonths
 * @property {number} confidence
 * @property {'ru' | 'kk' | 'mixed' | 'en'} languageDetected
 * @property {string | null} notes
 */

const FX_RATES = { USD: 540, EUR: 575, RUB: 5.5, CNY: 75, TRY: 14 };

/** @param {string} input */
export function parseTransaction(input) {
	const raw = input.trim();
	const text = raw.toLowerCase();

	const amount = extractAmount(text);
	const currency = extractCurrency(text);
	const merchant = extractMerchant(raw);
	const walletHint = extractWalletHint(text);
	const { isInstallment, installmentMonths } = extractInstallment(text);
	const counterparty = extractCounterparty(text);
	const languageDetected = detectLanguage(text);
	const { kind, categorySlug, confidence: catConf } = classifyCategory(text, merchant, counterparty, walletHint);

	const amountConf = amount > 0 ? 1 : 0;
	const confidence = Math.min(0.99, 0.4 + 0.35 * amountConf + 0.25 * catConf);

	return /** @type {ParseResult} */ ({
		kind,
		amount,
		currency,
		categorySlug,
		merchant,
		counterparty,
		walletHint,
		isInstallment,
		installmentMonths,
		confidence: Math.round(confidence * 100) / 100,
		languageDetected,
		notes: amount === 0 ? 'Уточните сумму' : null
	});
}

/** @param {string} text */
function extractAmount(text) {
	// "10к", "10 к", "10к тг", "10 тыс", "10 мың"
	const kMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:к\b|тыс\b|мың\b|мын\b|k\b)/);
	if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);

	// "1.5млн", "1,5 млн"
	const mMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:млн|млн\.|лям|м\b)/);
	if (mMatch) return Math.round(parseFloat(mMatch[1].replace(',', '.')) * 1_000_000);

	// plain number like "12 340", "4500", "12,340"
	const plain = text.match(/(\d{1,3}(?:[  ,]\d{3})+|\d{3,})/);
	if (plain) {
		const num = plain[1].replace(/[  ,]/g, '');
		return parseInt(num, 10);
	}
	// single digit amount (unlikely but possible)
	const single = text.match(/(\d+)/);
	if (single) return parseInt(single[1], 10);
	return 0;
}

/** @param {string} text */
function extractCurrency(text) {
	if (/\$|usd|доллар|dollar/i.test(text)) return 'USD';
	if (/€|eur|евро/i.test(text)) return 'EUR';
	if (/руб|rub|рублей/i.test(text)) return 'RUB';
	if (/юан|cny/i.test(text)) return 'CNY';
	if (/лир|try/i.test(text)) return 'TRY';
	return 'KZT';
}

/** @param {string} raw */
function extractMerchant(raw) {
	const text = raw.toLowerCase();
	/** @type {[RegExp, string][]} */
	const brands = [
		[/magnum|\bmagnum\s*cash/i, 'Magnum'],
		[/додо|dodo/i, 'Dodo Pizza'],
		[/kfc|кфс/i, 'KFC'],
		[/burger\s*king|бургер\s*кинг/i, 'Burger King'],
		[/starbucks|старбакс/i, 'Starbucks'],
		[/small\b/i, 'Small'],
		[/galmart|галмарт/i, 'Galmart'],
		[/anvar|анвар/i, 'Anvar'],
		[/skif|скиф/i, 'Skif'],
		[/yandex\s*go|яндекс\s*го|яндекс\s*такси/i, 'Yandex Go'],
		[/indrive|indriver|индрайв/i, 'inDrive'],
		[/bolt\b/i, 'Bolt'],
		[/netflix/i, 'Netflix'],
		[/spotify/i, 'Spotify'],
		[/yandex\s*plus|яндекс\s*плюс/i, 'Yandex Plus']
	];
	for (const [rx, name] of brands) {
		if (rx.test(text)) return name;
	}
	return null;
}

/** @param {string} text */
function extractWalletHint(text) {
	if (/kaspi|каспи/i.test(text)) return 'kaspi';
	if (/halyk|халык|народный/i.test(text)) return 'halyk';
	if (/bcc|центркредит/i.test(text)) return 'bcc';
	if (/freedom|фридом/i.test(text)) return 'freedom';
	if (/jusan|жусан/i.test(text)) return 'jusan';
	if (/forte|форте/i.test(text)) return 'forte';
	if (/наличн|cash/i.test(text)) return 'cash';
	return null;
}

/** @param {string} text */
function extractInstallment(text) {
	// "0-0-12", "рассрочка 12", "бөліп төлеу"
	const pattern = /0\s*-\s*0\s*-\s*(\d+)|рассрочк\w*\s*(?:на\s*)?(\d+)|бөліп\s*төлеу\s*(?:(\d+))?/i;
	const m = text.match(pattern);
	if (m) {
		const months = parseInt(m[1] ?? m[2] ?? m[3] ?? '12', 10);
		return { isInstallment: true, installmentMonths: months };
	}
	if (/рассрочк|в\s*кредит|бөліп/i.test(text)) {
		return { isInstallment: true, installmentMonths: 12 };
	}
	return { isInstallment: false, installmentMonths: null };
}

/** @param {string} text */
function extractCounterparty(text) {
	/** @type {[RegExp, string][]} */
	const family = [
		[/\b(ап(?:а|ай|ке|ама|еке)|мам(?:е|а|очке)|ана|анашы)\b/i, 'мама'],
		[/\b(әке|папа|ата|аташы)\b/i, 'папа'],
		[/\bаға\b/i, 'брат'],
		[/\b(іні|братишк)/i, 'младший брат'],
		[/\b(сіңлі|сестрен)/i, 'сестра'],
		[/\b(әйел|жене)\b/i, 'жена'],
		[/\b(күйе|муж)\b/i, 'муж'],
		[/\bбала(?:ға)?\b/i, 'ребёнку']
	];
	for (const [rx, who] of family) {
		if (rx.test(text)) return who;
	}
	// "жибердим <имя>" / "отправил <имя>"
	const nameM = text.match(/(?:жібердім|жибердим|жолдадым|отправил|перевёл|перевел)\s+([а-яёәіңғүұқөһ]{3,})/iu);
	if (nameM) return nameM[1];
	return null;
}

/** @param {string} text */
function detectLanguage(text) {
	const kz = /[әіңғүұқөһ]|жібер|төле|түст|мың|бөліп|садақа/i.test(text);
	const ru = /[а-яё]/i.test(text) && /\b(в|на|за|и|обед|купил|перевёл|такси|тысяч)\b/i.test(text);
	if (kz && ru) return 'mixed';
	if (kz) return 'kk';
	if (ru) return 'ru';
	return 'en';
}

/**
 * @param {string} text
 * @param {string | null} merchant
 * @param {string | null} counterparty
 * @param {string | null} walletHint
 * @returns {{ kind: 'expense' | 'income' | 'transfer', categorySlug: string, confidence: number }}
 */
function classifyCategory(text, merchant, counterparty, walletHint) {
	// Income first — strong signals
	if (/зарплат|жалақы|аванс|премия|salary|payroll/i.test(text)) {
		return { kind: 'income', categorySlug: 'salary', confidence: 0.95 };
	}
	if (/фриланс|заказ|freelance|гонорар/i.test(text)) {
		return { kind: 'income', categorySlug: 'freelance', confidence: 0.9 };
	}
	if (/кешбэк|кэшбэк|cashback|бонус/i.test(text)) {
		return { kind: 'income', categorySlug: 'cashback', confidence: 0.85 };
	}
	if (/(?:түсті|келді|поступил|зачислен)/i.test(text) && !counterparty) {
		return { kind: 'income', categorySlug: 'other_income', confidence: 0.7 };
	}

	// Self-transfer — no counterparty, wallet hint
	const selfTransferHint = /закинул|пополн|перевёл\s+на\s+(kaspi|халык|халyk|свой)|аудардым\s+(kaspi|өз)/i;
	if (selfTransferHint.test(text) && !counterparty) {
		return { kind: 'transfer', categorySlug: 'other_expense', confidence: 0.75 };
	}

	// Категории (expense)
	if (merchant === 'Magnum' || merchant === 'Small' || merchant === 'Galmart' || merchant === 'Anvar' || merchant === 'Skif') {
		return { kind: 'expense', categorySlug: 'groceries', confidence: 0.95 };
	}
	if (merchant === 'Dodo Pizza' || merchant === 'KFC' || merchant === 'Burger King' || merchant === 'Starbucks') {
		return { kind: 'expense', categorySlug: 'food', confidence: 0.95 };
	}
	if (merchant === 'Yandex Go' || merchant === 'inDrive' || merchant === 'Bolt') {
		return { kind: 'expense', categorySlug: 'transport_taxi', confidence: 0.95 };
	}
	if (merchant === 'Netflix' || merchant === 'Spotify' || merchant === 'Yandex Plus') {
		return { kind: 'expense', categorySlug: 'subscriptions', confidence: 0.95 };
	}

	if (/садақа|sadaqa|закят|zakat|милостын|мешет|фитр/i.test(text)) {
		return { kind: 'expense', categorySlug: 'sadaqa', confidence: 0.93 };
	}
	if (/той\b|тойбастар|беташар|сүндет|құда|свадьб|юбилей|кыз\s+узату/i.test(text)) {
		return { kind: 'expense', categorySlug: 'toi_events', confidence: 0.92 };
	}
	if (/обед|ужин|завтрак|перекус|ресторан|кафе|пицц/i.test(text)) {
		return { kind: 'expense', categorySlug: 'food', confidence: 0.85 };
	}
	if (/продукт|магазин|азық/i.test(text)) {
		return { kind: 'expense', categorySlug: 'groceries', confidence: 0.8 };
	}
	if (/такси|taxi|поездк/i.test(text)) {
		return { kind: 'expense', categorySlug: 'transport_taxi', confidence: 0.88 };
	}
	if (/бензин|заправк|топливо|жанармай/i.test(text)) {
		return { kind: 'expense', categorySlug: 'transport_fuel', confidence: 0.9 };
	}
	if (/аренд|квартир|жалд/i.test(text)) {
		return { kind: 'expense', categorySlug: 'rent', confidence: 0.9 };
	}
	if (/коммуналк|свет|газ|вода|отоплен/i.test(text)) {
		return { kind: 'expense', categorySlug: 'utilities', confidence: 0.88 };
	}
	if (/интернет|wi-?fi|provider/i.test(text)) {
		return { kind: 'expense', categorySlug: 'internet', confidence: 0.85 };
	}
	if (/кино|концерт|театр|spotify|netflix|подписк/i.test(text)) {
		return { kind: 'expense', categorySlug: 'subscriptions', confidence: 0.8 };
	}
	if (/лекарств|аптек|врач|больниц/i.test(text)) {
		return { kind: 'expense', categorySlug: 'health', confidence: 0.88 };
	}
	if (/одежд|куртк|рубашк|платье|обув/i.test(text)) {
		return { kind: 'expense', categorySlug: 'clothes', confidence: 0.85 };
	}
	if (/холодильник|телевизор|стиральн|пылесос|техник|мебель/i.test(text)) {
		return { kind: 'expense', categorySlug: 'home', confidence: 0.88 };
	}

	// P2P transfer to person (kind=expense, category=mobile_transfer per v0.2 spec)
	if (counterparty || /жібер|жибер|жолдад|отправ|перевё?л/i.test(text)) {
		return { kind: 'expense', categorySlug: 'mobile_transfer', confidence: 0.85 };
	}

	return { kind: 'expense', categorySlug: 'other_expense', confidence: 0.4 };
}

/** @param {number} amount @param {string} currency */
export function toKzt(amount, currency) {
	if (currency === 'KZT') return amount;
	const rate = FX_RATES[/** @type {keyof typeof FX_RATES} */ (currency)] ?? 1;
	return Math.round(amount * rate);
}
