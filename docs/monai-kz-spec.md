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
