# Timeline — Geolocation, Notification, Media

![Сборка и публикация](https://github.com/EvgeniyaAndreevna/timeline-media-homework/actions/workflows/deploy.yml/badge.svg)

**GitHub Pages:** https://evgeniyaandreevna.github.io/timeline-media-homework/

> Адрес GitHub Pages станет доступен только после создания репозитория `timeline-media-homework`, загрузки файлов и включения GitHub Pages через GitHub Actions. Если репозиторий называется иначе, замените его название в ссылках выше.

Мини-проект для домашнего задания «10. Geolocation, Notification, Media» (Нетология, AHJ). **Все три задачи реализованы в одном репозитории**. Приложение работает целиком в браузере, без сервера и без загрузки файлов.

## Функциональность

- **Текст:** напишите сообщение и нажмите **Enter**. `Shift + Enter` добавляет новую строку. При публикации браузер запрашивает координаты через Geolocation API.
- **Координаты вручную:** если геопозиция не определена или доступ запрещён, открывается модальное окно. Можно ввести `51.50851, −0.12572`, `51.50851,−0.12572` или `[51.50851, −0.12572]`. Поддерживаются обычный дефис-минус `-` и символ Unicode `−`. Неверные значения вызывают исключение в `parseCoordinates()`; модальная форма показывает ошибку через `setCustomValidity()` и `reportValidity()`.
- **Аудио:** кнопка микрофона запускает `MediaRecorder` и таймер. Кнопки ✓ и ✕ сохраняют или отменяют запись. Затем фиксируются координаты. Результат воспроизводится через `<audio controls>`.
- **Видео:** кнопка камеры запускает видеозапись с микрофоном, таймером, кнопками ✓ и ✕. Предпросмотр намеренно **muted**, поэтому звук из микрофона не дублируется. Результат воспроизводится через `<video controls>`.
- **Лента:** новые записи появляются **сверху**, каждой записи соответствуют координаты и дата. Есть фильтры по типу и счётчики.
- **Обработка ошибок:** модальные окна для отсутствующих разрешений, устройств или поддержки API.

**Хранение:** только в оперативной памяти текущей страницы: массив записей и `Blob`/`Object URL` для аудио и видео. При обновлении страницы записи сбрасываются, потому что по заданию сервер и загрузка не требуются. Демонстрационные материалы автоматически не добавляются.

## Запуск на Windows (PowerShell)

В корне проекта (где находится `package.json`):

```powershell
npm.cmd install
npm.cmd start
```

После успешной сборки откройте http://localhost:8080/.

Чтобы проверить тесты и производственную сборку:

```powershell
npm.cmd test
npm.cmd run build
```

`npm test` использует встроенный тестовый раннер Node.js `node:test` — не нужно устанавливать Jest. **Автотесты есть только для функции `parseCoordinates`**, как требуется заданием. Тестируются три обязательных формата, числовые диапазоны и ошибки формата.

## Особенности разрешений

`Geolocation API`, `getUserMedia()` и `MediaRecorder` работают в поддерживаемых браузерах в **безопасном контексте**: `localhost` для локальной разработки или HTTPS на GitHub Pages. Пользователь должен разрешить доступ к местоположению, микрофону и камере. Если геолокация недоступна — используется ручной ввод; если нет разрешения на медиа — появляется предупреждение. Наличие камеры и микрофона обязательно для фактической проверки аудио и видео. Поддерживаемый формат записей определяется браузером.

## GitHub Pages и GitHub Actions

1. Создайте публичный репозиторий `timeline-media-homework` (без генерации README или `.gitignore`).
2. Выполните в папке проекта:

   ```powershell
   git init
   git add .
   git status
   git commit -m "Initial commit: Timeline with geolocation and media"
   git branch -M main
   git remote add origin https://github.com/EvgeniyaAndreevna/timeline-media-homework.git
   git push -u origin main
   ```

3. В GitHub откройте **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. В разделе **Actions** дождитесь зелёного workflow **Build, test and deploy Timeline**.
5. Проверьте ссылку на опубликованный сайт, указанную вверху README. При другом имени аккаунта/репозитория исправьте ссылки на бейдж и Pages.

Конфигурация `.github/workflows/deploy.yml` выполняет `npm install`, `npm test`, `npm run build`, публикует содержимое `dist/` на GitHub Pages. HTML, CSS, JS, SVG и прочие ресурсы собираются через Webpack. Для GitHub Pages используется относительный `publicPath`.

## Структура

```text
.github/workflows/deploy.yml  # CI: тесты, сборка, Pages
src/index.html               # разметка UI и диалоги
src/app.js                   # лента, геопозиция, запись и проигрывание
src/styles.css               # адаптивный интерфейс
src/coordinates.js           # чистая функция парсинга координат
src/assets/                  # SVG-ресурсы, обрабатываются Webpack
tests/coordinates.test.js    # только тесты парсера
webpack.config.cjs           # сборка и dev server
package.json                 # зависимости и команды
```

## Что отправить проверяющему

Репозиторий: https://github.com/EvgeniyaAndreevna/timeline-media-homework

Демо: https://evgeniyaandreevna.github.io/timeline-media-homework/

Публичные ссылки будут рабочими после публикации в вашем аккаунте GitHub.
