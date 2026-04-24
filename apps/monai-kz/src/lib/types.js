/**
 * @typedef {'expense' | 'income' | 'transfer'} TxKind
 * @typedef {'KZT' | 'USD' | 'EUR' | 'RUB' | 'CNY' | 'TRY'} Currency
 */

/** Allowed category slugs — from spec §5.2 */
export const CATEGORIES = /** @type {const} */ ({
	food: { ru: 'Еда', kk: 'Тамақ', icon: '🍜', color: '#E87A3A' },
	groceries: { ru: 'Продукты', kk: 'Азық-түлік', icon: '🛒', color: '#4A8C5F' },
	transport_taxi: { ru: 'Такси', kk: 'Такси', icon: '🚕', color: '#D4A82E' },
	transport_fuel: { ru: 'Бензин', kk: 'Жанармай', icon: '⛽', color: '#7A6B5D' },
	transport_public: { ru: 'Транспорт', kk: 'Қоғамдық көлік', icon: '🚌', color: '#5D7A6B' },
	rent: { ru: 'Аренда', kk: 'Жалдау', icon: '🏠', color: '#8B6B4A' },
	utilities: { ru: 'Коммуналка', kk: 'Коммуналдық', icon: '💡', color: '#C4A45A' },
	internet: { ru: 'Интернет', kk: 'Интернет', icon: '📡', color: '#5A85C4' },
	entertainment: { ru: 'Развлечения', kk: 'Ойын-сауық', icon: '🎬', color: '#B55A9E' },
	health: { ru: 'Здоровье', kk: 'Денсаулық', icon: '💊', color: '#5AB5A5' },
	clothes: { ru: 'Одежда', kk: 'Киім', icon: '👕', color: '#9E5AB5' },
	toi_events: { ru: 'Той', kk: 'Той', icon: '🎉', color: '#E85A8C' },
	sadaqa: { ru: 'Sadaqa', kk: 'Садақа', icon: '🤲', color: '#5A8CE8' },
	mobile_transfer: { ru: 'Переводы', kk: 'Ақша аудару', icon: '💸', color: '#6C7A8B' },
	subscriptions: { ru: 'Подписки', kk: 'Жазылымдар', icon: '🔁', color: '#8B7A6C' },
	education: { ru: 'Образование', kk: 'Білім', icon: '📚', color: '#4A6B8C' },
	kids: { ru: 'Дети', kk: 'Балалар', icon: '🧸', color: '#E8B05A' },
	gifts: { ru: 'Подарки', kk: 'Сыйлықтар', icon: '🎁', color: '#C45A5A' },
	home: { ru: 'Дом/Техника', kk: 'Үй/Техника', icon: '🛋️', color: '#7A8B6C' },
	other_expense: { ru: 'Другое', kk: 'Басқа', icon: '•', color: '#A8A29B' },
	salary: { ru: 'Зарплата', kk: 'Жалақы', icon: '💰', color: '#4A8C5F' },
	freelance: { ru: 'Фриланс', kk: 'Фриланс', icon: '💻', color: '#5A8CE8' },
	cashback: { ru: 'Кэшбэк', kk: 'Кэшбэк', icon: '↩️', color: '#D4A82E' },
	refund: { ru: 'Возврат', kk: 'Қайтару', icon: '↪️', color: '#7A6B5D' },
	other_income: { ru: 'Иной доход', kk: 'Басқа кіріс', icon: '+', color: '#A8A29B' }
});

/** @typedef {keyof typeof CATEGORIES} CategorySlug */

/**
 * @typedef {object} Wallet
 * @property {string} id
 * @property {string} name
 * @property {'cash' | 'card' | 'deposit' | 'credit_line'} type
 * @property {Currency} currency
 * @property {number} balanceMinor  // in minor units (tiyn/cents)
 * @property {string | null} bankCode  // kaspi/halyk/bcc/freedom/jusan/forte
 * @property {string} color
 */

/**
 * @typedef {object} Transaction
 * @property {string} id
 * @property {string} walletId
 * @property {CategorySlug | null} category
 * @property {TxKind} kind
 * @property {number} amountMinor
 * @property {Currency} currency
 * @property {number} amountKztMinor
 * @property {string | null} merchant
 * @property {string | null} counterparty
 * @property {string | null} note
 * @property {number} occurredAt  // unix ms
 * @property {'voice' | 'text' | 'sms_paste' | 'manual'} source
 * @property {string | null} rawInput
 * @property {number} aiConfidence  // 0..1
 * @property {boolean} isInstallment
 * @property {number | null} installmentMonths
 */

/**
 * Format KZT minor units (tiyn) to "12 340 ₸"
 * @param {number} minor
 * @param {Currency} [currency]
 */
export function formatMoney(minor, currency = 'KZT') {
	const major = Math.round(minor / 100);
	const sign = currency === 'KZT' ? '₸' : currency === 'USD' ? '$' : currency;
	const formatted = major.toLocaleString('ru-RU').replace(/,/g, ' ');
	return currency === 'USD' || currency === 'EUR' ? `${sign}${formatted}` : `${formatted} ${sign}`;
}

/** @param {number} ts */
export function formatRelativeTime(ts) {
	const diff = Date.now() - ts;
	const min = 60_000;
	const hour = 60 * min;
	const day = 24 * hour;
	if (diff < min) return 'только что';
	if (diff < hour) return `${Math.floor(diff / min)} мин назад`;
	if (diff < day) return `${Math.floor(diff / hour)} ч назад`;
	if (diff < 7 * day) return `${Math.floor(diff / day)} д назад`;
	return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
