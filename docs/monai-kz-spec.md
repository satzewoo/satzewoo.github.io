# MonAi KZ — Спецификация MVP

**Версия**: v0.2 · **Дата**: 2026-04-24 · **Owner**: Product

Улучшенный клон [MonAi](https://get-monai.app) для рынка Казахстана. AI-first трекер расходов с голосовым и текстовым вводом, парсингом SMS/Push от локальных банков, приватным локальным хранением и синхронизацией через iCloud/Google Drive.

> **Changelog v0.1 → v0.2** — в конце документа.

---

## 1. Концепция и позиционирование

**Тезис**: «Записал расход голосом за 2 секунды — AI сам разобрал сумму, категорию, валюту и контрагента. Данные хранятся у тебя, а не у нас».

**Ключевые отличия от оригинального MonAi**:
- Парсер SMS/Push от **Kaspi, Halyk, BCC, Freedom, Jusan, ForteBank**.
- Казахский + русский + смешанный («шала-казахский») ввод.
- Локальные категории: Той, Sadaqa, Mobile Transfers. **Рассрочка — атрибут транзакции, не категория** (см. §4.3).
- Автоконвертация валют по курсу **Нацбанка РК** (официальный XML-фид).

**Целевая аудитория**: городские жители РК 22–45 лет, пользователи Kaspi/Halyk, доход от 300 тыс. ₸/мес, iOS-first.

**North-star метрика (ревизия v0.2)**:
- **Primary**: 5 tx/active-user/week к неделе W4 (реалистичный бенчмарк personal finance apps).
- **Secondary**: D30 retention ≥ 35%, free→paid conversion ≥ 4%.

---

## 2. Локальная специфика (КЗ 2026)

| Блок | Требование |
|---|---|
| Banking API | Открытого PSD2-аналога нет. **iOS**: только копипаст SMS/Push через Share Sheet (платформа не даёт читать SMS программно). **Android**: `NotificationListenerService` читает push автоматически — **killer-фича для Android-релиза** (M4). OCR скриншотов как fallback для обеих. |
| Языки | `ru`, `kk`, `mixed` (шала). NLU должен терпеть латиницу, кириллицу, транслит. |
| Валюты | База — `KZT`. Автоконверт USD/RUB/EUR/CNY/TRY по курсу НБ РК (кеш 24ч). |
| Категории | +Той/Мероприятия, +Sadaqa, +Mobile Transfer (P2P родственнику/другу), +Коммуналка, +Такси (Yandex/inDrive). |
| Регуляторика | **94-V «О персональных данных» РК**: хранение ПДн — на устройстве; обработка голоса/текста через OpenAI = трансграничная передача → см. §5.5 (consent, DPA, Zero Retention endpoint, возможная регистрация оператора ПДн в МЦРИАП). |
| Платёжки | Подписка через App Store / Play Store (обходим локальный эквайринг на старте). |

---

## 3. User Stories

### US-1. Голосовой ввод на русском
**Как** пользователь, **я хочу** продиктовать «Обед в Додо пицце 4500 тенге», **чтобы** транзакция сохранилась как расход 4500 ₸, категория «Еда», мерчант «Dodo Pizza», дата = сегодня.
*AC*:
- **iOS 26+**: локальный `SpeechAnalyzer` → текст ≤ 0.8с; парсинг через Apple Foundation Models (on-device) ≤ 0.7с. **Target: полный цикл ≤ 1.5с**.
- **Облачный путь (iOS < 26 / Android)**: Whisper API + GPT-4o-mini. **P50 ≤ 3с, P95 ≤ 5с** (включая сеть KZ→US).
- Карточка предзаполнена, юзер подтверждает одним тапом.

### US-2. Парсинг Kaspi Push
**Как** пользователь, **я хочу** скопировать push из Kaspi («Оплата Magnum 12 340 ₸. Баланс: 234 500 ₸»), вставить в приложение — **чтобы** транзакция распозналась и добавилась в «Продукты».
*AC*: Распознаётся сумма, мерчант, остаток на карте (идёт в `wallets.balance_minor`). Duplicate-detection по (сумма + мерчант + время ±5 мин + **source** — голосовой ввод и SMS того же события не должны дублироваться).

### US-3. Шала-казахский ввод
**Как** билингв, **я хочу** написать «Жібердім маме 10к», **чтобы** AI понял: **expense**, 10 000 ₸, категория `mobile_transfer`, counterparty = «мама».
*AC*: AI понимает «жібердім/жибердим» = отправил (это **expense**, не transfer — деньги покидают мои кошельки); «к/мың» = тысяча; family terms (апа/мама/әке/аға/іні…) → counterparty.

### US-4. Той-бюджет
**Как** жених, **я хочу** создать бюджет «Той — 2 500 000 ₸» на 3 месяца и раскидать по подкатегориям (ресторан, той-бастар, кольца, музыка), **чтобы** видеть оставшийся лимит после каждой траты.
*AC*: Progress bar по подкатегориям; push-алерт при 80% и 100%; «прожитый день» показывает сколько ещё можно тратить.

### US-5. Рассрочка Kaspi 0-0-12
**Как** пользователь, **я хочу** занести покупку холодильника в рассрочку на 12 месяцев, **чтобы** каждый месяц автоматически появлялось обязательство и учитывалось в месячном балансе.
*AC*: Одна покупка = 1 parent tx с `is_installment=true, installment_months=12` и **категорией реального товара** (`home`/`appliances`), + 12 scheduled child tx. Раздел «Рассрочки» — это **фильтр** `is_installment=true`, а не отдельная категория. Отмена удаляет будущие child tx.

### US-6. Sadaqa / благотворительность
**Как** практикующий мусульманин, **я хочу** отмечать переводы в благотворительность отдельной категорией с годовым отчётом, **чтобы** отслеживать закят и sadaqa.
*AC*: Отдельная категория `sadaqa`; годовой отчёт за хиджру/григорианский год на выбор; экспорт PDF.

### US-7. Офлайн-ввод
**Как** пользователь в метро без интернета, **я хочу** записать трату голосом — **чтобы** она обработалась локально (iOS 26+ / Android с ML Kit) или отложилась в очередь.
*AC*: Запись сохраняется локально; при появлении сети Whisper/LLM вызываются из очереди; UX не блокируется.

### US-8. FX-перевод между своими кошельками
**Как** пользователь, **я хочу** перевести $100 с долларового кошелька на Kaspi (получилось 46 000 ₸), **чтобы** оба движения учлись и не задвоились в аналитике.
*AC*: Создаются **две связанные записи** (`transfer_pair_id`) с разными `amount_minor` и `currency`: leg_out = –100 USD, leg_in = +46 000 KZT. Аналитика показывает обе, но исключает пару из «расходы/доходы».

---

## 4. Схема базы данных

Хранилище — **SQLite** на устройстве (GRDB.swift на iOS / Room на Android). Синхронизация:
- **iOS**: **CloudKit Private Database** (E2E от Apple, ключи на устройстве, нам ничего не городить).
- **Android**: зашифрованный дамп БД в Google Drive App Data (AES-GCM, ключ в Android Keystore).
- **Cross-device**: если юзер ставит на iOS + Android одновременно — используется пароль-фраза (Argon2id → AES-GCM) для шифрования общего дампа в облаке на выбор.

### 4.1 `wallets`

| Поле | Тип | Примечание |
|---|---|---|
| `id` | TEXT (UUID) | PK |
| `name` | TEXT | «Kaspi Gold», «Наличные», «Halyk Bonus» |
| `type` | TEXT | `cash` / `card` / `deposit` / `credit_line` / `crypto` |
| `currency` | TEXT | ISO 4217, по умолчанию `KZT` |
| `balance_minor` | INTEGER | в тиынах (×100), избегаем float |
| `bank_code` | TEXT? | `kaspi` / `halyk` / `bcc` / `freedom` / `jusan` / `forte` / `null` |
| `icon` | TEXT | имя SF Symbol / material icon |
| `color` | TEXT | HEX |
| `is_archived` | INTEGER | 0/1 |
| `created_at` | INTEGER | unix ms |
| `updated_at` | INTEGER | unix ms |

### 4.2 `categories`

Иерархическая (parent_id), максимум 2 уровня (enforced на уровне приложения).

| Поле | Тип | Примечание |
|---|---|---|
| `id` | TEXT | PK |
| `parent_id` | TEXT? | FK → categories.id |
| `name_ru` | TEXT | |
| `name_kk` | TEXT | |
| `kind` | TEXT | `expense` / `income` / `transfer` |
| `icon` | TEXT | |
| `color` | TEXT | |
| `is_system` | INTEGER | системные нельзя удалить |
| `sort_order` | INTEGER | |

**Сид системных категорий (expense)**: Еда, Продукты, Транспорт (Такси, Бензин, Общественный), Жильё (Аренда, Коммуналка, Интернет), Развлечения, Здоровье, Одежда, **Той/Мероприятия**, **Sadaqa**, **Mobile Transfers**, Подписки, Образование, Дети, Подарки, Дом/Техника.

> **Убрано в v0.2**: категория `installment` (стала атрибутом транзакции) и `self_transfer` (противоречила `kind=transfer` — у self-переводов нет category_id вообще).

### 4.3 `transactions`

| Поле | Тип | Примечание |
|---|---|---|
| `id` | TEXT | PK |
| `wallet_id` | TEXT | FK |
| `category_id` | TEXT? | NULL для `kind=transfer` (self-перевод) |
| `kind` | TEXT | `expense` / `income` / `transfer` |
| `amount_minor` | INTEGER | в минорной единице валюты **данной ноги** |
| `currency` | TEXT | валюта этой ноги |
| `fx_rate_to_kzt` | REAL | курс НБ РК на момент сохранения |
| `amount_kzt_minor` | INTEGER | для сводной аналитики |
| `merchant` | TEXT? | «Magnum», «Dodo Pizza» |
| `counterparty` | TEXT? | для P2P: «мама», «Айдар» |
| `note` | TEXT? | произвольный коммент |
| `occurred_at` | INTEGER | unix ms |
| `created_at` | INTEGER | |
| `source` | TEXT | `voice` / `text` / `sms_paste` / `push_paste` / `ocr` / `manual` / `notif_listener` |
| `raw_input` | TEXT? | исходная фраза/SMS для ре-парсинга |
| `ai_confidence` | REAL | 0..1 |
| `transfer_pair_id` | TEXT? | связывает две ноги перевода (see §4.3.1) |
| **`is_installment`** | INTEGER | **0/1 — атрибут, не категория** |
| `installment_parent_id` | TEXT? | self-ref для child-tx рассрочки |
| `installment_month` | INTEGER? | 1..N |
| `installment_total` | INTEGER? | N месяцев |
| `is_scheduled` | INTEGER | 0/1 — плановое (ещё не наступило) |
| `geo_lat`, `geo_lng` | REAL? | опционально |
| `tags_json` | TEXT? | JSON-массив строк |

**Индексы**: `(wallet_id, occurred_at DESC)`, `(category_id, occurred_at)`, `(installment_parent_id)`, `(transfer_pair_id)`, `(is_installment) WHERE is_installment=1`.

#### 4.3.1 FX-переводы — две независимые ноги

Перевод $100 (USD-кошелёк) → 46 000 ₸ (Kaspi Gold) создаёт **две строки** с одинаковым `transfer_pair_id`:

| kind | wallet_id | amount_minor | currency | amount_kzt_minor |
|---|---|---|---|---|
| `transfer` | usd_wallet | -10000 (в центах) | USD | -4600000 |
| `transfer` | kaspi_gold | +4600000 (в тиынах) | KZT | +4600000 |

Аналитика: пара **исключается** из expense/income расчётов (считаем только `kind IN ('expense','income')`).

### 4.4 `budgets`

| Поле | Тип | Примечание |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | «Той», «Еда на октябрь» |
| `category_ids_json` | TEXT | JSON-массив; пусто = все расходы |
| `amount_minor` | INTEGER | лимит в KZT |
| `period` | TEXT | `weekly` / `monthly` / `custom` |
| `start_date` | INTEGER | |
| `end_date` | INTEGER? | null для recurring |
| `rollover` | INTEGER | 0/1 — переносить остаток |
| `alert_thresholds_json` | TEXT | `[0.8, 1.0]` |
| `is_archived` | INTEGER | 0/1 |

### 4.5 Вспомогательные таблицы

- `fx_rates` — кеш курсов НБ РК (`currency`, `rate_to_kzt`, `fetched_at`).
- `sms_parse_log` — сырые SMS/push для улучшения парсера (только с согласия юзера, локально).
- `sync_meta` — метаданные последней успешной синхронизации (checksum, device_id, timestamp).
- `scheduled_recurring` — повторяющиеся транзакции (аренда, подписки).

### 4.6 ER-связи

```
wallets 1─∞ transactions ∞─1 categories
                │
                ├── transfer_pair_id ──► transactions (self-ref, 1:1 other leg)
                └── installment_parent_id ──► transactions (self-ref, 1:N children)

budgets ∞─∞ categories (через category_ids_json)
```

---

## 5. Логика AI-агента

### 5.1 Архитектура пайплайна

```
[Voice] ─┬─► iOS 26+: SpeechAnalyzer (on-device)  ─┐
         └─► иначе: Whisper API (cloud)           │
                                                  ▼
[Text / paste SMS/Push] ──────────────────► [Preprocessor: lang detect, number normalize]
                                                  │
                                                  ▼
                                   ┌──────────────┴──────────────┐
                                   ▼                             ▼
                    iOS 26+: Apple Foundation Models    Cloud: GPT-4o-mini
                    (on-device, JSON output)             (Zero Retention endpoint, JSON schema)
                                   │                             │
                                   └──────────────┬──────────────┘
                                                  ▼
                                  [Validator: schema + business rules + category matcher]
                                                  │
                                                  ▼
                        [Preview card → user confirms (1 tap for conf ≥ 0.6)]
```

**Выбор моделей**:
- **Voice on-device (iOS 26+)**: `SpeechAnalyzer` API — бесплатно, офлайн, точность для ru/kk хорошая.
- **Voice cloud**: `whisper-1` API для длинных/сложных записей или старых iOS / Android.
- **Parser on-device (iOS 26+)**: Apple Foundation Models (`FoundationModels` framework) — ~3B модель, 0 MB к бандлу, бесплатно.
- **Parser cloud**: `gpt-4o-mini` с `response_format: json_schema` через **OpenAI Zero Retention endpoint** (обязательно для 94-V).

**Кеш**: идентичный `raw_input` → cached parse (24ч, локально). Ускоряет повторные вставки одного SMS.

### 5.2 Системный промпт (production)

```text
You are "MonAi KZ Parser" — a financial transaction extraction engine for
Kazakhstan users. You receive a raw phrase (voice transcript, typed text, or
copy-pasted bank SMS/push) in Russian, Kazakh, English, or mixed code-switched
language ("шала-казахский") and output a STRICT JSON object describing the
transaction.

# OUTPUT SCHEMA (return ONLY this JSON, no prose):
{
  "kind": "expense" | "income" | "transfer",
  "amount": number,               // positive, major units (тенге, not тиын)
  "currency": "KZT" | "USD" | "EUR" | "RUB" | "CNY" | "TRY",
  "category_slug": string,        // from allowed list below
  "subcategory_slug": string|null,
  "merchant": string|null,        // normalized brand name, null if unknown
  "counterparty": string|null,    // for P2P: "мама", "Айдар", "брат"
  "wallet_hint": string|null,     // "kaspi", "halyk", "cash", null
  "occurred_at_hint": string|null,// ISO-8601 if explicit date, else null
  "is_installment": boolean,
  "installment_months": number|null,
  "confidence": number,           // 0..1
  "language_detected": "ru"|"kk"|"mixed"|"en",
  "notes": string|null
}

# ALLOWED category_slug VALUES (for expense, unless noted):
food, groceries, transport_taxi, transport_fuel, transport_public,
rent, utilities, internet, entertainment, health, clothes, toi_events,
sadaqa, mobile_transfer, subscriptions, education, kids, gifts,
home, other_expense,
salary, freelance, cashback, refund, other_income     // income kinds

# (NOTE: "installment" is NOT a category — use is_installment flag + real
# product category like "home", "clothes", "transport_fuel", etc.)
# (NOTE: "self_transfer" is NOT a category — use kind="transfer" with
# category_slug=null.)

# PARSING RULES:
1. Numbers:
   - "10к", "10к тг", "10 тыс", "10 мың", "10 000" → 10000
   - "1.5млн", "1,5 млн", "1500к" → 1500000
   - "полтинник" → 50 (context!), "сотка" → 100 or 100000 (judge by context)
2. Currency defaults to KZT if not specified. Recognize: тг, ₸, тенге, теңге,
   KZT; $, usd, долларов, доллар; €, eur, евро; руб, rub, рублей; юань, cny.
3. Kazakh/mixed verbs:
   - "жібердім / жибердим / жолдадым / аудардым" = sent → kind=expense,
     category=mobile_transfer if P2P to a person; kind=transfer (no category)
     if between own wallets ("kaspi'ға салдым", "депозитке аудардым").
   - "төледім / төлеп / толедим" = paid → expense
   - "алдым / сатып алдым" = bought → expense
   - "түсті / келді (ақша)" = received → income
4. Kazakh family terms → counterparty:
   апа/мама/анашым → mother; әке/папа/әке → father; аға → elder brother;
   іні → younger brother; апай/әпке → elder sister; сіңлі → younger sister;
   бала/балаға → child; әйел → wife; күйеу → husband; ата-ана → parents.
5. Merchants — normalize common KZ brands:
   - magnum, small, galmart, anvar, skif → groceries
   - додо/dodo, kfc, burger king, салем бро → food
   - yandex go, indrive, bolt, яндекс такси → transport_taxi
   - kaspi/каспи (as destination of own money) → kind=transfer (no category)
6. Installments: "в рассрочку на N месяцев", "0-0-12", "рассрочка 12 мес",
   "бөліп төлеу"
   → is_installment=true, installment_months=N (default 12 if 0-0-12 without
   explicit N). CATEGORY must still reflect the product (e.g. холодильник →
   "home", куртка → "clothes"). NEVER use "installment" as category_slug.
7. Той/events keywords: той, тойбастар, беташар, сүндет той, құда түсу,
   свадьба, юбилей, кыз узату → category=toi_events.
8. Sadaqa keywords: садақа, sadaqa, закят, zakat, милостыня,
   пожертвование в мечеть, фитр → category=sadaqa.
9. Bank SMS patterns:
   - "Kaspi.kz. Оплата Magnum 12 340 ₸. Баланс: X ₸"
     → expense, 12340, KZT, groceries, merchant=Magnum, wallet_hint=kaspi
   - "Halyk: Пополнение карты *1234 на 150 000 KZT"
     → income, 150000, KZT, wallet_hint=halyk
   - "BCC: Перевод на карту *9876 50 000 тг"
     → transfer, 50000, KZT, wallet_hint=bcc, category_slug=null
10. Ambiguity rules:
    - If amount missing → confidence < 0.3, amount=0, notes="amount missing".
    - If category unclear → category_slug="other_expense", confidence ≤ 0.5.
    - NEVER invent a merchant; null if not explicit.
11. Do NOT output prose, explanations, or markdown fences. ONLY the JSON object.
12. Keep text fields in the ORIGINAL language (don't translate "Magnum" →
    "Магнум"; leave as-is).
```

### 5.3 Примеры (few-shot для evals)

| Вход | kind | amount | category_slug | extras |
|---|---|---|---|---|
| «Обед в Додо пицце 4500 тенге» | expense | 4500 | food | merchant=Dodo Pizza |
| «Жібердім маме 10к» | expense | 10000 | mobile_transfer | counterparty=mother |
| «Закинул на Каспи 5000» | transfer | 5000 | null | wallet_hint=kaspi |
| «Kaspi.kz. Оплата Magnum 12 340 ₸. Баланс 234 500 ₸» | expense | 12340 | groceries | merchant=Magnum, wallet_hint=kaspi |
| «Той ресторан задаток 500 мың» | expense | 500000 | toi_events | — |
| «0-0-12 холодильник самсунг 450000» | expense | 450000 | **home** | is_installment=true, months=12 |
| «Зарплата түсті 650к» | income | 650000 | salary | lang=kk |
| «Садақа мешітке 20 000» | expense | 20000 | sadaqa | — |
| «Yandex Go 1200» | expense | 1200 | transport_taxi | merchant=Yandex Go |
| «Netflix 15$» | expense | 15 | subscriptions | currency=USD |

### 5.4 Пост-обработка на клиенте

- **Category matcher**: `category_slug` → локальный `categories.id`; если slug неизвестен, чип «Выбрать категорию».
- **Duplicate guard**: для `source=sms_paste` проверяем `(amount_minor, merchant, occurred_at ± 5 мин)`. Дополнительно: если в последние 10 мин уже есть `voice` tx с той же суммой ± 2%, предлагаем **объединить**, а не создавать новую.
- **Confidence gate**: `confidence < 0.6` → карточка открывается в **режиме редактирования**, а не auto-save.
- **FX**: если `currency ≠ KZT` — тянем `fx_rates` (кеш 24ч, обновление 1×/день с `nationalbank.kz`), вычисляем `amount_kzt_minor`.
- **Installment expansion**: при `is_installment=true` триггерим создание N scheduled child-tx через сервис `InstallmentScheduler`.

### 5.5 Privacy & cost

**Обязательные меры для соответствия 94-V «О ПДн» РК**:
1. **Consent на онбординге** — явная галочка: «Я понимаю, что текст голосовых запросов и скопированных SMS отправляется на серверы OpenAI (США) для распознавания. Сырые банковские SMS по умолчанию обезличиваются (маски для номеров карт/счетов) перед отправкой».
2. **Zero Retention endpoint** OpenAI — промпты не хранятся и не используются для обучения (DPA подписан с OpenAI Ireland).
3. **Proxy на своём backend** (serverless в ЕС, например Vercel Frankfurt) — никакого логирования `raw_input`, только метрика latency/errors.
4. **Обезличивание SMS** перед отправкой: regex маскирует `*1234` → `*XXXX`, ФИО отправителя → `[PERSON]`.
5. **Fully on-device mode** (Pro-фича): iOS 26+ использует Apple Foundation Models + SpeechAnalyzer, ничего не уходит в сеть. Для параноиков и офлайна.
6. **Регистрация оператора ПДн** в МЦРИАП — проконсультироваться с юристом на этапе M2; для MVP с явным consent достаточно уведомительного порядка.

**Себестоимость (cloud path)**:
- ~120 токенов input + 80 output на tx → **$0.00017/tx** с `gpt-4o-mini`.
- При 30 tx/user/month → **~$0.005/user/month**.
- Whisper: ~$0.006/min; средняя запись 4с → ~$0.0004/tx.
- **Итого COGS: ~$0.006/user/month** при medium-use. На годовую подписку в 11 900 ₸ — gross margin ~99%.

---
