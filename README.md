# Зарuba — локальная версия

Полноценный MVP с Node.js + Express + SQLite. Работает без внешних сервисов — только `npm start`.

## Быстрый старт

```bash
cd zaruba
npm install
npm run seed    # заполнить тестовыми данными
npm run dev     # запустить на http://localhost:3000
```

## Тестовые аккаунты

| Телефон | Ник | Роль в seed |
|---------|-----|-------------|
| 79001112233 | Лёха Лютый | Организатор, 7 побед |
| 79002223344 | Димон Удар | Капитан команды Б |
| 79003334455 | Саня Рыжик | Игрок |
| 79004445566 | Маша Ствол | Организатор, 11 побед, MVP |
| 79005556677 | Артём Молния | Капитан команды Б (зеркало) |
| 79006667788 | Женя Тень | Судья live-матча |
| 79007778899 | Костя Ёжик | Фанат |
| 79008889900 | Паша Дуб | Игрок |

Код SMS: **123456** (мок)

## Что есть

- **Логин** по телефону + мок-SMS → онбординг
- **Карта** Яндекс/MapLibre (ключ в `js/constants.js`)
- **Создание зарубы** (Fast/Hard режимы, выбор на карте)
- **Команды** — создание, инвайт по ссылке, подтверждение капитаном
- **Live-матч** — голы, фолы, MVP, судейская панель
- **Фанаты** — привязка, поддержка чипсеками, чат
- **Магазин** — косметика, ачивки за чипсеки
- **Профиль** — прогресс, ачивки, история
- **Лидерборд** по харизме
- **Ежедневный челлендж** — 3 фаната = +50 чипсеков

## Стек

- **Backend**: Node.js + Express + better-sqlite3
- **Frontend**: HTML + JS + Tailwind CDN + Яндекс/MapLibre
- **Данные**: SQLite (`zaruba.db`), миграции при запуске

## Маршруты

| Путь | Назначение |
|------|------------|
| `/` | Лендинг (index.html) |
| `/arena.html` | Создание зарубы |
| `/zaruba.html?id=` | Страница матча |
| `/judge.html?id=` | Панель судьи |
| `/fan.html?zarubaId=&playerId=` | Лендинг фаната |
| `/invite.html?zarubaId=&teamId=` | Инвайт в команду |
| `/login.html` | Вход |
| `/onboarding.html` | Онбординг |
| `/profile.html?id=` | Профиль |
| `/shop.html` | Магазин |

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/users` | Список пользователей |
| GET | `/api/users/:id` | Получить пользователя |
| POST | `/api/users` | Создать пользователя |
| POST | `/api/users/find-by-phone` | Найти по телефону |
| GET | `/api/zarubas` | Список заруб |
| POST | `/api/zarubas` | Создать зарубу |
| POST | `/api/teams` | Создать команду |
| POST | `/api/teams/:id/join` | Вступить в команду |
| POST | `/api/zarubas/:id/goals` | Засчитать гол |
| POST | `/api/fans` | Привязать фаната |
| POST | `/api/chips/send` | Скинуть чипсеки |
| POST | `/api/messages` | Сообщение в чат |
| POST | `/api/shop/purchase` | Купить в магазин |
| POST | `/api/auth/telegram` | Авторизация через Telegram |
| GET | `/api/users/:id/referrals` | Рефералы пользователя |

## Telegram Mini App

Для запуска как Telegram Mini App:

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Настройте Web App: `/newapp` → URL: `https://ваш-домен/miniapp.html`
3. Установите токен: `TELEGRAM_BOT_TOKEN=ваш_токен npm run dev`
4. Для теста локально: откройте `http://localhost:3000/miniapp.html`

### Что адаптировано для Telegram

- **SPA-архитектура** — `miniapp.html` с hash-роутингом, без перезагрузок
- **Telegram.WebApp API** — MainButton, BackButton, haptic feedback, CloudStorage
- **Авторизация** — через Telegram user (без SMS), серверная валидация initData
- **Тема** — автоматическая (dark/light) из Telegram
- **Safe areas** — поддержка iPhone notch, env(safe-area-inset-*)
- **Touch targets** — минимум 44px для всех интерактивных элементов
- **Навигация** — Bottom Nav + BackButton для подстраниц

### Страницы Mini App

| Маршрут | Страница |
|---------|----------|
| `#/` | Главная (лента, live, лидерборд) |
| `#/login` | Вход (мок-SMS или Telegram auth) |
| `#/zaruba?id=` | Страница матча |
| `#/judge?id=` | Судейская панель |
| `#/create` | Создание зарубы |
| `#/shop` | Магазин |
| `#/profile?id=` | Профиль + реферальная ссылка |
| GET | `/api/leaderboard` | Таблица лидеров |
