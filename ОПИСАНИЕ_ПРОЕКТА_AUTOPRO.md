# Полное описание проекта AutoPro

Документ предназначен для передачи контекста AI-ассистентам (например, ChatGPT): полная картина проекта, стек, структура, API, данные и технические детали.

---

## 1. Назначение проекта

**AutoPro** — веб-приложение (CRM) для учёта и планирования работ **автосервиса**. Объединяет в одном интерфейсе:

- запись клиентов на обслуживание и расписание;
- склад запчастей (учёт и списание);
- учёт механиков (сотрудников);
- каталог услуг;
- историю завершённых обслуживаний;
- отчёты (выручка, разбивка по услугам и механикам, зарплатный фонд);
- встроенные уведомления о событиях в системе.

Целевая среда: небольшой автосервис или учебный/курсовой проект. База данных на первом этапе — один JSON-файл на бэкенде.

---

## 2. Структура проекта (файлы и папки)

```
autopro/
├── package.json              # Корневой package: скрипт npm run dev (concurrently)
├── package-lock.json
├── README.md                 # Инструкция по запуску и авторизации
├── .gitignore
├── Курсовая_AutoPro.md       # Текст курсовой работы по проекту
├── ОПИСАНИЕ_ПРОЕКТА_AUTOPRO.md  # Этот файл
│
├── backend/
│   ├── package.json          # Зависимости: без express/cors в явном виде в dependencies (см. раздел 4)
│   ├── package-lock.json
│   ├── server.js             # Единственный файл сервера: Express, CORS, все маршруты API
│   └── data.json             # Единое хранилище данных (clients, services, parts, mechanics, appointments, history, notifications)
│
└── frontend/
    ├── index.html            # Точка входа HTML, <div id="app">, скрипт /src/main.js
    ├── package.json          # Vue 3, Vue Router, Pinia, Vite, Axios
    ├── package-lock.json
    ├── vite.config.js        # Плагин Vue, alias @ -> src, proxy /api -> localhost:3000, port 5173
    ├── logo-wrench.png       # Логотип в сайдбаре (если есть)
    └── src/
        ├── main.js           # createApp, Pinia, router, main.css
        ├── App.vue           # Только <router-view />
        ├── router/
        │   └── index.js      # Маршруты, beforeEach (auth + ограничение по роли ASSISTANT)
        ├── store/
        │   └── auth.js       # Pinia store: token, user, login/logout, initFromStorage
        ├── layouts/
        │   └── MainLayout.vue # Сайдбар (меню), шапка (роль, уведомления, выход), <RouterView />
        ├── views/
        │   ├── LoginPage.vue
        │   ├── DashboardPage.vue
        │   ├── ClientsPage.vue
        │   ├── ServicesPage.vue
        │   ├── PartsPage.vue
        │   ├── HistoryPage.vue
        │   ├── SchedulePage.vue
        │   ├── MechanicsPage.vue
        │   └── ReportsPage.vue
        ├── utils/
        │   └── inputFilters.js # nameOnly, vinOnly, digitsOnly, digitsOnlyMax, formatPhone
        └── assets/
            └── main.css      # Глобальные стили, переменные, компоненты (карточки, кнопки, уведомления, сетка расписания и т.д.)
```

Расширения: только `.js`, `.vue`, `.json`, `.html`, `.css`, `.md`. Отдельных конфигов для линтеров/форматтеров в списке файлов нет.

---

## 3. Технологический стек

### 3.1. Фронтенд

| Технология   | Версия (примерно) | Назначение |
|-------------|-------------------|------------|
| Vue.js      | 3.x               | Фреймворк, реактивность, компоненты |
| Vue Router  | 5.x               | Маршрутизация (history mode) |
| Pinia       | 3.x               | Хранение состояния (авторизация) |
| Vite        | 7.x               | Сборка и dev-сервер |
| Axios       | 1.x               | HTTP-запросы к API |
| @vitejs/plugin-vue | 6.x        | Плагин Vite для Vue |

- Язык: JavaScript (не TypeScript).
- Стили: один глобальный CSS-файл `main.css` (переменные, классы, анимации). Фиолетовая палитра (#7c3aed и оттенки), карточки, кнопки, модальные окна.
- Сборка: Vite. Прокси: все запросы с пути `/api` перенаправляются на `http://localhost:3000`. Порт фронта: 5173.
- Алиас: `@` → `frontend/src`.

### 3.2. Бэкенд

| Технология | Назначение |
|------------|------------|
| Node.js    | Среда выполнения |
| Express    | HTTP-сервер, маршруты, middleware |
| cors       | Middleware CORS (подключён в server.js как `require("cors")`) |
| fs / path  | Чтение и запись `data.json` |

- Язык: JavaScript (CommonJS: `require`/`module.exports`). В `backend/package.json` указано `"type": "commonjs"`.
- База данных: нет СУБД. Все данные в одном файле `backend/data.json`. Функции `readData()` и `writeData()` читают/пишут JSON синхронно.
- Порт: `process.env.PORT || 3000`.

### 3.3. Запуск

- В корне: `npm run dev` — через `concurrently` запускаются `npm run dev --prefix backend` и `npm run dev --prefix frontend`.
- Backend: `nodemon server.js` (при `npm run dev`) или `node server.js` (при `npm start`).
- Фронт открывается по адресу `http://localhost:5173`, API — `http://localhost:3000`. Браузер обращается к API через прокси Vite, поэтому запросы идут на тот же origin (5173), а Vite проксирует `/api` на 3000.

---

## 4. Зависимости (package.json)

### Корень (autopro/package.json)

- **devDependencies:** `concurrently` (запуск backend + frontend одной командой).
- **scripts:** `dev`, `frontend`, `backend`.

### Frontend (frontend/package.json)

- **dependencies:** `vue`, `vue-router`, `pinia`, `axios`.
- **devDependencies:** `vite`, `@vitejs/plugin-vue`.
- **scripts:** `dev`, `build`, `preview`.

### Backend (backend/package.json)

- **devDependencies:** `nodemon`.
- **scripts:** `dev` (nodemon server.js), `start` (node server.js).
- В коде используются `express` и `cors`; если они не указаны в `dependencies`, их нужно добавить (`express`, `cors`) для корректной установки через `npm install` в папке backend.

---

## 5. Авторизация и роли

- **Вход:** один маршрут — `POST /api/login`. Тело: `role`, `employeeId`, `password`, `captcha` (поля `a`, `b`, `answer` — сумма двух чисел).
- **Роли в API:** `MANAGER` и `ASSISTANT` (в интерфейсе отображаются как «Менеджер» и «Механик»).
- **Проверка учётных данных (зашиты в server.js):**
  - MANAGER: `employeeId === "manager1"`, `password === "password123"`.
  - ASSISTANT: `employeeId === "mech1"`, `password === "password123"`.
- **Токен:** после успешного входа возвращается фиксированный токен `autopro-demo-token`. Клиент сохраняет его в `localStorage` под ключом `autopro-token` и отправляет в заголовке `Authorization: Bearer <token>`.
- **Middleware auth:** все маршруты под префиксом `/api`, кроме `/api/login`, проходят через проверку заголовка; при неверном/отсутствующем токене возвращается 401.
- **Ограничение по роли на фронте:** для роли `ASSISTANT` в роутере разрешены только маршруты: `dashboard`, `clients`, `services`, `history`, `parts`. Доступ к `schedule`, `mechanics`, `reports` для ASSISTANT редиректит на dashboard. Меню в MainLayout для ASSISTANT строится по этому же списку (`visibleMenu`).

---

## 6. API (бэкенд)

Базовый URL API: `http://localhost:3000` (при работе через Vite прокси — запросы с фронта идут на тот же хост с путём `/api/...`).

Все маршруты ниже — с префиксом `/api`, для всех кроме login требуется заголовок `Authorization: Bearer autopro-demo-token`.

| Метод | Путь | Описание |
|-------|------|----------|
| POST  | /api/login | Вход (role, employeeId, password, captcha). Возвращает token и user. |
| GET   | /api/dashboard | Сводка: partsCount, partsTotalValue, appointments, monthlyActiveAppointments, activeRevenue, dailyWork, todaysAppointments, activeMechanics. |
| GET   | /api/clients | Список клиентов. |
| POST  | /api/clients | Создание клиента (name, phone, note). |
| PUT   | /api/clients/:id | Обновление клиента. |
| DELETE| /api/clients/:id | Удаление клиента. |
| GET   | /api/services | Список услуг. |
| POST  | /api/services | Создание услуги (name, description, duration, price). |
| PUT   | /api/services/:id | Обновление услуги. |
| DELETE| /api/services/:id | Удаление услуги. |
| GET   | /api/parts | Список запчастей. |
| POST  | /api/parts | Добавление позиции (article, name, price, quantity). Добавляет уведомление. |
| PUT   | /api/parts/:id | Обновление; при изменении quantity — уведомление. |
| DELETE| /api/parts/:id | Удаление; уведомление. |
| GET   | /api/mechanics | Список механиков. |
| POST  | /api/mechanics | Добавление (fullName, position, hireDate, active). Уведомление. |
| PUT   | /api/mechanics/:id | Обновление; при смене active — уведомление. |
| DELETE| /api/mechanics/:id | Удаление. |
| GET   | /api/appointments | Все записи. |
| POST  | /api/appointments | Создание записи; при status COMPLETED — списание запчастей; запись в history; уведомление. |
| PUT   | /api/appointments/:id | Обновление; при переходе в COMPLETED — списание requiredParts; при смене статуса — уведомление. |
| DELETE| /api/appointments/:id | Удаление записи; уведомление. |
| GET   | /api/history | История. Query: plate (фильтр по госномеру). Только записи со status COMPLETED. В ответе — элементы с полными данными appointment. |
| GET   | /api/notifications | Список уведомлений (последние 50 в data.json). |
| DELETE| /api/notifications | Очистка списка уведомлений. |
| GET   | /api/reports | Отчёты. Query: period (формат YYYY-MM). Возвращает period, revenue, completedCount, byService, totalPayroll, byMechanic. |

Логика списания запчастей: при сохранении записи (POST/PUT) со статусом `COMPLETED` вызывается `applyPartsWriteOff(data, requiredParts)`: для каждой позиции в `requiredParts` (partId, quantity) уменьшается `quantity` соответствующей запчасти в `data.parts`. Уведомления пишутся в `data.notifications` (id — timestamp, message, timestamp), хранятся до 50 записей.

---

## 7. Структура данных (data.json)

Файл: `backend/data.json`. Корневые ключи:

- **clients** — массив. Элемент: `id`, `name`, `phone`, `note`.
- **services** — массив. Элемент: `id`, `name`, `description`, `duration`, `price`.
- **parts** — массив. Элемент: `id`, `article`, `name`, `price`, `quantity`.
- **mechanics** — массив. Элемент: `id`, `fullName`, `position`, `hireDate`, `active`, опционально `baseSalary`, `bonusPerService`.
- **appointments** — массив. Элемент: `id`, `datetime` (ISO строка), `clientName`, `phone`, `carModel`, `carYear`, `licensePlate`, `vin`, `serviceId`, `mechanicId`, `status`, `comment`, `requiredParts` (массив объектов `{ partId, quantity }`). Статусы: например CREATED, IN_PROGRESS, COMPLETED, CANCELLED.
- **history** — массив. Элемент: `id`, `appointmentId`, `datetime`, `licensePlate`, `serviceId`, `mechanicId`, `status`. Используется для отчётов и экрана «История»; на фронте в истории показываются только элементы со status COMPLETED.
- **notifications** — массив. Элемент: `id` (число, например Date.now()), `message`, `timestamp` (ISO строка). На бэкенде ограничение — последние 50.

ID для новых записей генерируются функцией `nextId(items)` как max(id) + 1 по соответствующему массиву.

---

## 8. Маршруты фронтенда (Vue Router)

- **/** — страница входа (`LoginPage`). При уже авторизованном пользователе — редирект на dashboard.
- **/app** — обёртка `MainLayout`, дочерние маршруты:
  - `/app` (пустой) → редирект на `/app/dashboard`
  - `/app/dashboard` — обзор (DashboardPage)
  - `/app/clients` — клиенты (ClientsPage)
  - `/app/services` — каталог услуг (ServicesPage)
  - `/app/parts` — склад запчастей (PartsPage)
  - `/app/history` — история обслуживаний (HistoryPage)
  - `/app/schedule` — расписание (SchedulePage)
  - `/app/mechanics` — механики (MechanicsPage)
  - `/app/reports` — отчёты (ReportsPage)
- **Любой другой путь** — редирект на `/`.

Мета: `meta: { requiresAuth: true }` у группы `/app`. Навигационный гард проверяет токен и роль; для ASSISTANT скрыты schedule, mechanics, reports.

---

## 9. Ключевые функции по страницам

- **LoginPage:** выбор роли (Менеджер/Механик), поля employeeId, пароль, капча (a + b = ?). Отправка POST /api/login, сохранение токена и user в Pinia и localStorage, установка Authorization в axios, переход на dashboard.
- **DashboardPage:** запрос GET /api/dashboard; отображение картоток (выручка по активным заказам, запчасти, записи), расписание на сегодня, активные механики, график работ за месяц (по дням).
- **SchedulePage:** календарь по месяцам, выбор дня, сетка по часам (например 9–21), создание/редактирование/удаление записей. В форме записи: клиент, телефон, авто, год, госномер, VIN, услуга, механик, статус, комментарий, необходимые детали (requiredParts — выбор из списка запчастей + количество). При завершении записи (статус COMPLETED) бэкенд списывает запчасти. Двойной клик по записи — модальное окно с деталями и кнопками редактирования/удаления.
- **ServicesPage:** CRUD услуг (название, описание, длительность, цена).
- **PartsPage:** список запчастей, добавление (артикул, название, цена, количество), удаление; кнопка «Распечатать» (печать списка).
- **MechanicsPage:** список механиков, добавление (ФИО, должность, дата приёма), переключение активности (active), удаление. В отчётах используются baseSalary и bonusPerService (могут храниться в data.json или задаваться на бэкенде по умолчанию).
- **HistoryPage:** GET /api/history с опциональным фильтром по госномеру; отображаются только завершённые работы; двойной клик — детали записи (как в расписании).
- **ReportsPage:** выбор периода (YYYY-MM), GET /api/reports; отображение выручки, количества завершённых заявок, разбивка по услугам, фонд оплаты труда механиков (оклад + доплата за работы), таблицы и график по дням.
- **MainLayout:** сайдбар с логотипом и пунктами меню (в зависимости от роли), шапка с подписью роли, кнопкой уведомлений (иконка + точка при непросмотренных), выпадающая панель уведомлений (список + «Очистить уведомления»), кнопка «Выйти» (logout + переход на /).

---

## 10. Утилиты и ограничения ввода

Файл `frontend/src/utils/inputFilters.js`:

- **nameOnly(value)** — только буквы (латиница, кириллица), пробелы, дефис, апостроф (для имён/ФИО).
- **vinOnly(value, maxLength=17)** — только буквы и цифры, обрезка до 17 символов (VIN).
- **digitsOnly(value)** — только цифры.
- **digitsOnlyMax(value, maxLength)** — только цифры с ограничением длины (например год — 4 цифры).
- **formatPhone(value)** — форматирование телефона в вид +7 (XXX) XXX-XX-XX, только цифры до 11.

Эти функции используются в формах (например расписание, клиенты) через обработчики keydown/input для ограничения ввода.

---

## 11. Визуальное оформление и UX

- Единый стиль: фиолетовая палитра (#7c3aed и оттенки), скруглённые карточки и кнопки, тени.
- Анимации: появление модальных окон, перелистывание календаря/дней в расписании, hover на кнопках и карточках. В MainLayout для панели уведомлений используется transition (например fade-scale).
- График на отчётах: линейный график по дням месяца (ось Y — количество работ, ось X — даты).
- Логотип: в сайдбаре (MainLayout), изображение logo-wrench.png, текст «AutoPro».

---

## 12. Дополнительные сведения

- **Язык интерфейса:** русский (все подписи, сообщения, форматы дат/времени — ru-RU).
- **Внешние интеграции:** нет. Нет email, SMS, Telegram, сторонних CRM или тикет-систем. Уведомления только внутри приложения (панель в шапке).
- **База данных:** только `backend/data.json`. Для сброса данных достаточно отредактировать или заменить этот файл (желательно при остановленном сервере).
- **Печать:** в PartsPage есть кнопка «Распечатать» для списка запчастей; печать документов по заказам в описании не фигурирует.
- **Курсовая работа:** полное описание целей, задач, технологий и тестирования приведено в файле `Курсовая_AutoPro.md` в корне проекта.

Используя этот документ, можно восстановить полную картину проекта AutoPro: структуру, стек, API, данные, роли, маршруты и основные сценарии работы для доработок или ответов на вопросы.
