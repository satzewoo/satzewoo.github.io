/**
 * Seed data for the prototype — realistic KZ user profile.
 * Transactions span the last 7 days with a mix of categories.
 */

/** @type {import('./types.js').Wallet[]} */
export const seedWallets = [
	{
		id: 'w_kaspi',
		name: 'Kaspi Gold',
		type: 'card',
		currency: 'KZT',
		balanceMinor: 234_500_00,
		bankCode: 'kaspi',
		color: '#F14635'
	},
	{
		id: 'w_halyk',
		name: 'Halyk Bonus',
		type: 'card',
		currency: 'KZT',
		balanceMinor: 120_000_00,
		bankCode: 'halyk',
		color: '#00A651'
	},
	{
		id: 'w_cash',
		name: 'Наличные',
		type: 'cash',
		currency: 'KZT',
		balanceMinor: 15_000_00,
		bankCode: null,
		color: '#7A6B5D'
	}
];

const now = Date.now();
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

/** @type {import('./types.js').Transaction[]} */
export const seedTransactions = [
	{
		id: 't1',
		walletId: 'w_kaspi',
		category: 'groceries',
		kind: 'expense',
		amountMinor: 12_340_00,
		currency: 'KZT',
		amountKztMinor: 12_340_00,
		merchant: 'Magnum',
		counterparty: null,
		note: null,
		occurredAt: now - 25 * minute,
		source: 'sms_paste',
		rawInput: 'Kaspi.kz. Оплата Magnum 12 340 ₸. Баланс: 234 500 ₸',
		aiConfidence: 0.98,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't2',
		walletId: 'w_kaspi',
		category: 'food',
		kind: 'expense',
		amountMinor: 4_500_00,
		currency: 'KZT',
		amountKztMinor: 4_500_00,
		merchant: 'Dodo Pizza',
		counterparty: null,
		note: null,
		occurredAt: now - 3 * hour,
		source: 'voice',
		rawInput: 'Обед в Додо пицце 4500 тенге',
		aiConfidence: 0.94,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't3',
		walletId: 'w_kaspi',
		category: 'mobile_transfer',
		kind: 'expense',
		amountMinor: 10_000_00,
		currency: 'KZT',
		amountKztMinor: 10_000_00,
		merchant: null,
		counterparty: 'мама',
		note: null,
		occurredAt: now - 8 * hour,
		source: 'text',
		rawInput: 'Жібердім маме 10к',
		aiConfidence: 0.91,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't4',
		walletId: 'w_halyk',
		category: 'transport_taxi',
		kind: 'expense',
		amountMinor: 1_200_00,
		currency: 'KZT',
		amountKztMinor: 1_200_00,
		merchant: 'Yandex Go',
		counterparty: null,
		note: null,
		occurredAt: now - 1 * day,
		source: 'sms_paste',
		rawInput: 'Halyk: Оплата Yandex Go 1 200 KZT',
		aiConfidence: 0.96,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't5',
		walletId: 'w_kaspi',
		category: 'toi_events',
		kind: 'expense',
		amountMinor: 500_000_00,
		currency: 'KZT',
		amountKztMinor: 500_000_00,
		merchant: 'Grand Restaurant',
		counterparty: null,
		note: 'задаток за ресторан',
		occurredAt: now - 2 * day,
		source: 'voice',
		rawInput: 'Той ресторан задаток 500 мың',
		aiConfidence: 0.88,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't6',
		walletId: 'w_kaspi',
		category: 'subscriptions',
		kind: 'expense',
		amountMinor: 15_00 * 100,
		currency: 'USD',
		amountKztMinor: 8_100_00,
		merchant: 'Netflix',
		counterparty: null,
		note: null,
		occurredAt: now - 3 * day,
		source: 'voice',
		rawInput: 'Netflix 15 долларов',
		aiConfidence: 0.93,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't7',
		walletId: 'w_kaspi',
		category: 'sadaqa',
		kind: 'expense',
		amountMinor: 20_000_00,
		currency: 'KZT',
		amountKztMinor: 20_000_00,
		merchant: null,
		counterparty: 'мешеть',
		note: null,
		occurredAt: now - 4 * day,
		source: 'text',
		rawInput: 'Садақа мешітке 20 000',
		aiConfidence: 0.89,
		isInstallment: false,
		installmentMonths: null
	},
	{
		id: 't8',
		walletId: 'w_kaspi',
		category: 'salary',
		kind: 'income',
		amountMinor: 650_000_00,
		currency: 'KZT',
		amountKztMinor: 650_000_00,
		merchant: null,
		counterparty: null,
		note: 'за октябрь',
		occurredAt: now - 5 * day,
		source: 'text',
		rawInput: 'Зарплата түсті 650к',
		aiConfidence: 0.97,
		isInstallment: false,
		installmentMonths: null
	}
];
