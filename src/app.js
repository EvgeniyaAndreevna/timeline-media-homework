import './styles.css';
import brandIcon from './assets/mark.svg';
import { parseCoordinates } from './coordinates.js';

/**
 * Timeline — entirely client-side (no API, localStorage, IndexedDB or uploads).
 * Text and Blob data remain in memory until the page is reloaded.
 */
const $ = (selector) => document.querySelector(selector);
const els = {
  brand: $('#brand-logo'),
  feed: $('#feed'),
  feedCount: $('#feed-count'),
  subtitle: $('#feed-subtitle'),
  form: $('#post-form'),
  textarea: $('#post-input'),
  send: $('#send-btn'),
  audio: $('#audio-start'),
  video: $('#video-start'),
  controls: $('#record-controls'),
  bottom: $('#compose-bottom'),
  recordLabel: $('#recording-label'),
  timer: $('#recording-timer'),
  save: $('#record-save'),
  cancel: $('#record-cancel'),
  coordinatesDialog: $('#coordinates-dialog'),
  coordinatesForm: $('#coordinates-form'),
  coordinatesInput: $('#coordinates-input'),
  coordinatesError: $('#coordinates-error'),
  coordinatesCancel: $('#coordinates-cancel'),
  coordinatesX: $('#coordinates-x'),
  messageDialog: $('#message-dialog'),
  messageText: $('#message-text'),
  messageClose: $('#message-close'),
  messageX: $('#message-x'),
  preview: $('#video-preview'),
  previewVideo: $('#preview-video'),
  draftStatus: $('#draft-status'),
  toast: $('#toast')
};
els.brand.src = brandIcon;

const posts = [];
let filter = 'all';
let pendingPost = null;
let busy = false;
let recorderSession = null;
let preparingRecording = false;
let toastTimer = null;

function setBusy(value) {
  busy = value;
  els.textarea.disabled = value || Boolean(recorderSession) || preparingRecording;
  els.send.disabled = value || Boolean(recorderSession) || preparingRecording;
  els.audio.disabled = value || Boolean(recorderSession) || preparingRecording;
  els.video.disabled = value || Boolean(recorderSession) || preparingRecording;
  els.draftStatus.textContent = value ? 'Определяем местоположение…' : 'Без сохранения на сервере';
}

function toast(message) {
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => els.toast.classList.remove('visible'), 3000);
}

function element(tag, className, textContent) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (textContent !== undefined) item.textContent = textContent;
  return item;
}

function localizedDate(timestamp) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(timestamp);
}

function renderPost(post) {
  const article = element('article', 'post');
  const head = element('div', 'post-head');
  head.append(element('div', 'post-avatar', 'Я'));
  const meta = element('div');
  meta.append(element('div', 'post-author', 'Моя запись'));
  meta.append(element('div', 'post-date', localizedDate(post.created)));
  head.append(meta);
  head.append(element('div', 'post-type', {
    text: '✦ Текст', audio: '◉ Аудио', video: '▣ Видео'
  }[post.type]));
  article.append(head);

  if (post.type === 'text') {
    article.append(element('p', 'post-content', post.text));
  } else {
    const player = document.createElement(post.type === 'audio' ? 'audio' : 'video');
    player.controls = true;
    player.preload = 'metadata';
    if (post.type === 'video') player.playsInline = true;
    player.src = post.url;
    player.setAttribute('aria-label', post.type === 'audio' ? 'Аудиозапись' : 'Видеозапись');
    article.append(player);
  }

  const foot = element('div', 'post-foot');
  const coord = element('span', 'coord');
  coord.append(element('span', 'coord-pin', '⌖'));
  coord.append(document.createTextNode(`${post.latitude.toFixed(5)}, ${post.longitude.toFixed(5)}`));
  foot.append(coord);
  const copy = element('button', 'coord-copy', 'Копировать ⧉');
  copy.type = 'button';
  copy.title = 'Скопировать координаты';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`${post.latitude}, ${post.longitude}`);
      toast('Координаты скопированы');
    } catch {
      toast('Не удалось скопировать координаты');
    }
  });
  foot.append(copy);
  article.append(foot);
  return article;
}

function render() {
  const counts = {
    all: posts.length,
    text: posts.filter((p) => p.type === 'text').length,
    audio: posts.filter((p) => p.type === 'audio').length,
    video: posts.filter((p) => p.type === 'video').length
  };
  $('#nav-count').textContent = String(counts.all);
  $('#stats-total').textContent = String(counts.all);
  $('#stats-text').textContent = String(counts.text);
  $('#stats-audio').textContent = String(counts.audio);
  $('#stats-video').textContent = String(counts.video);
  for (const key of Object.keys(counts)) $('#filter-' + key).textContent = String(counts[key]);

  const visible = posts.filter((p) => filter === 'all' || p.type === filter);
  els.feedCount.textContent = String(visible.length);
  els.subtitle.textContent = filter === 'all' ? 'Всё, что хочется запомнить' : {
    text: 'Твои текстовые моменты', audio: 'Твои аудиозаписи', video: 'Твои видеозаписи'
  }[filter];
  els.feed.replaceChildren();
  if (visible.length === 0) {
    const empty = element('div', 'empty-state');
    empty.append(element('div', 'empty-illustration', filter === 'all' ? '✎' : { text: '✎', audio: '♫', video: '▣' }[filter]));
    empty.append(element('h3', '', filter === 'all' ? 'Каждая история с чего-то начинается' : 'В этой категории пока пусто'));
    empty.append(element('p', '', filter === 'all'
      ? 'Напиши первую заметку или запиши голос и видео. Важные моменты появятся здесь.'
      : 'Создай новую запись — и она появится в этой ленте.'));
    els.feed.append(empty);
  } else {
    const fragment = document.createDocumentFragment();
    visible.forEach((p) => fragment.append(renderPost(p)));
    els.feed.append(fragment);
  }
}

function savePost(draft, { latitude, longitude }) {
  const entry = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    type: draft.type,
    text: draft.type === 'text' ? draft.text : undefined,
    url: draft.blob ? URL.createObjectURL(draft.blob) : undefined,
    latitude, longitude,
    created: new Date()
  };
  posts.unshift(entry); // most recent at the top
  if (draft.type === 'text') els.textarea.value = '';
  pendingPost = null;
  setBusy(false);
  filter = 'all';
  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.filter === 'all');
  });
  render();
  toast('Момент добавлен в ленту');
}

function showCoordinatesDialog(draft) {
  pendingPost = draft;
  els.coordinatesInput.value = '';
  els.coordinatesInput.setCustomValidity('');
  els.coordinatesInput.classList.remove('invalid');
  els.coordinatesError.textContent = '';
  els.coordinatesDialog.showModal();
  els.coordinatesInput.focus();
}

function discardPending() {
  pendingPost = null;
  if (els.coordinatesDialog.open) els.coordinatesDialog.close();
  setBusy(false);
}

async function attachCoordinates(draft) {
  if (busy) return;
  setBusy(true);
  if (!('geolocation' in navigator)) {
    showCoordinatesDialog(draft);
    return;
  }
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60_000
      });
    });
    savePost(draft, {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
  } catch {
    showCoordinatesDialog(draft);
  }
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy || recorderSession || preparingRecording) return;
  const text = els.textarea.value.trim();
  if (!text) {
    els.textarea.focus();
    toast('Сначала напишите текст заметки');
    return;
  }
  void attachCoordinates({ type: 'text', text });
});

els.textarea.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    els.form.requestSubmit();
  }
});

els.coordinatesForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!pendingPost) return;
  try {
    const coordinates = parseCoordinates(els.coordinatesInput.value);
    const draft = pendingPost;
    els.coordinatesDialog.close();
    savePost(draft, coordinates);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неверные координаты';
    els.coordinatesInput.setCustomValidity(message);
    els.coordinatesInput.classList.add('invalid');
    els.coordinatesError.textContent = message;
    els.coordinatesInput.reportValidity();
  }
});
els.coordinatesInput.addEventListener('input', () => {
  els.coordinatesInput.setCustomValidity('');
  els.coordinatesInput.classList.remove('invalid');
  els.coordinatesError.textContent = '';
});
els.coordinatesCancel.addEventListener('click', discardPending);
els.coordinatesX.addEventListener('click', discardPending);
els.coordinatesDialog.addEventListener('cancel', () => {
  pendingPost = null;
  setBusy(false);
});

function showDeviceError(type, error) {
  const isDenied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
  els.messageText.textContent = isDenied
    ? `Браузер не разрешил доступ к ${type === 'audio' ? 'микрофону' : 'камере и микрофону'}. Разрешите доступ в настройках сайта и попробуйте ещё раз. Для записи нужен HTTPS или localhost.`
    : `Не удалось начать ${type === 'audio' ? 'аудио' : 'видео'}запись. Проверьте, что браузер поддерживает MediaRecorder, устройство подключено и доступно. Для записи нужен HTTPS или localhost.`;
  if (!els.messageDialog.open) els.messageDialog.showModal();
}

els.messageClose.addEventListener('click', () => els.messageDialog.close());
els.messageX.addEventListener('click', () => els.messageDialog.close());

function selectMimeType(type) {
  const list = type === 'video'
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return list.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? '';
}

function updateTimer(session) {
  const seconds = Math.floor((Date.now() - session.startedAt) / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  els.timer.textContent = `${mm}:${ss}`;
}

function resetRecordingUI() {
  els.bottom.classList.remove('hidden');
  els.controls.classList.add('hidden');
  els.preview.hidden = true;
  els.previewVideo.pause();
  els.previewVideo.srcObject = null;
  setBusy(false);
}

async function startRecording(type) {
  if (busy || recorderSession || preparingRecording) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    showDeviceError(type, new Error('MediaRecorder unsupported'));
    return;
  }

  preparingRecording = true;
  setBusy(false);
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(type === 'audio'
      ? { audio: true }
      : { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
    const mimeType = selectMimeType(type);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const session = {
      type, stream, recorder, chunks: [], discard: false,
      startedAt: Date.now(), timerId: null
    };
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data?.size) session.chunks.push(event.data);
    });
    recorder.addEventListener('stop', () => {
      window.clearInterval(session.timerId);
      session.stream.getTracks().forEach((track) => track.stop());
      if (recorderSession === session) recorderSession = null;
      resetRecordingUI();
      if (session.discard) return;
      const blob = new Blob(session.chunks, {
        type: recorder.mimeType || (type === 'audio' ? 'audio/webm' : 'video/webm')
      });
      if (!blob.size) {
        showDeviceError(type, new Error('empty recording'));
        return;
      }
      void attachCoordinates({ type, blob });
    });
    recorder.addEventListener('error', () => {
      session.discard = true;
      if (recorder.state !== 'inactive') recorder.stop();
      showDeviceError(type, new Error('recording error'));
    });
    recorder.start(250);
    recorderSession = session;
    els.recordLabel.textContent = type === 'audio' ? 'Записывается аудио' : 'Записывается видео';
    els.timer.textContent = '00:00';
    els.bottom.classList.add('hidden');
    els.controls.classList.remove('hidden');
    if (type === 'video') {
      els.preview.hidden = false;
      els.previewVideo.srcObject = stream;
      els.previewVideo.muted = true; // preview MUST never play duplicated microphone sound
      els.previewVideo.play().catch(() => {});
    }
    session.timerId = window.setInterval(() => updateTimer(session), 300);
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    showDeviceError(type, error);
  } finally {
    preparingRecording = false;
    setBusy(false);
  }
}

function finishRecording(discard) {
  if (!recorderSession) return;
  const session = recorderSession;
  session.discard = discard;
  els.save.disabled = true;
  els.cancel.disabled = true;
  try {
    if (session.recorder.state !== 'inactive') session.recorder.stop();
  } finally {
    window.setTimeout(() => {
      els.save.disabled = false;
      els.cancel.disabled = false;
    }, 250);
  }
}

els.audio.addEventListener('click', () => void startRecording('audio'));
els.video.addEventListener('click', () => void startRecording('video'));
els.save.addEventListener('click', () => finishRecording(false));
els.cancel.addEventListener('click', () => finishRecording(true));

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.classList.toggle('selected', btn === button);
    });
    render();
  });
});

window.addEventListener('pagehide', () => {
  if (recorderSession) recorderSession.stream.getTracks().forEach((track) => track.stop());
  posts.forEach((post) => { if (post.url) URL.revokeObjectURL(post.url); });
});

render();
