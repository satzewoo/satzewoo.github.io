# MonAi KZ — Web Prototype

Web-прототип мобильного приложения из спеки `docs/monai-kz-spec.md`.

**Стек**: SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$props`), Vite 6, adapter-static.

## Запуск локально

```bash
cd apps/monai-kz
npm install
npm run dev
```

Открой http://localhost:5173 на телефоне в той же сети (Vite dev server слушает `--host`) или на десктопе — layout mobile-first, центрируется в узком фрейме на широком экране.

## Что работает

- **Главный экран** (`/`): общий баланс, расход за сегодня, список кошельков, 20 последних транзакций, FAB с микрофоном и текстовым вводом.
- **Запись** (`/record`): Web Speech API (`SpeechRecognition` с `ru-RU`), визуализация записи, fallback — готовые примеры для клика, текстовый режим (`/record?mode=text`).
- **Подтверждение** (`/confirm`): карточка с распознанной суммой/категорией/кошельком, редактирование, низкая confidence подсвечена красным, сохранение → обновление баланса.

## Mock AI

`src/lib/ai/mock-parser.js` — эвристический парсер, эмулирующий output `gpt-4o-mini` из спеки §5.2. Обрабатывает:
- Суммы: `10к`, `500 мың`, `1.5 млн`, `12 340`
- Мерчанты: Magnum, Dodo, Yandex Go, Netflix и т.д.
- Банки: Kaspi, Halyk, BCC, Freedom, Jusan, Forte
- Рассрочку: `0-0-12`, `бөліп төлеу`
- Казахские глаголы: `жібердім` / `түсті` / `төледім`
- Family terms: `мама`/`ана` → counterparty

В проде меняется на реальный вызов `POST /api/parse` → OpenAI Zero Retention endpoint (на iOS 26+ — Apple Foundation Models on-device).

## Хранилище

`src/lib/stores/transactions.svelte.js` — Svelte 5 runes-based store с `localStorage` персистентностью. В нативном приложении замещается на SQLite (GRDB.swift на iOS, Room на Android).

## Известные ограничения прототипа

- Web Speech API не работает в Firefox и некоторых браузерах. Safari iOS поддерживает с 14.5+.
- FX-переводы (US-8 из спеки) пока не реализованы — в UI одна нога.
- Бюджеты, Sadaqa-отчёт, Той-планировщик — не включены (это M2+ по roadmap).
- iCloud/Google Drive sync — только localStorage.

## Деплой на GitHub Pages

```bash
npm run build
```

Сгенерированный `build/` копируется в корень Pages-сайта. Автодеплой настроен в `.github/workflows/deploy-pages.yml` — при push в `main` с изменениями в `apps/monai-kz/**` приложение публикуется на корень GitHub Pages.
