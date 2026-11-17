"use strict";

const form = document.querySelector("#report-form");
const draftKey = "mt-docs-draft-v1";
const fieldIds = ["report-date", "nickname", "position", "online-minutes", "report-count", "game-work", "community-work", "forum-work", "key-skills", "links"];
const fileInputs = [...form.querySelectorAll('input[type="file"]')];
const maxUploadSize = 10_000_000;
const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const previewDialog = document.querySelector("#preview-dialog");
const confirmSend = document.querySelector("#confirm-send");
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const previewUrls = new Map();
let saveTimer;
let toastTimer;
let submitting = false;
let templatePreview = false;

const field = (id) => document.getElementById(id);
const value = (id) => field(id).value.trim();
const selectedFiles = () => fileInputs.flatMap((input) => [...input.files]);

field("report-date").value = localDate;
field("report-date").max = localDate;
field("next-url").value = new URL("./thanks.html", window.location.href).href;
field("form-url").value = new URL("./", window.location.href).href;

function showToast(message) {
  const toast = field("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}

function setDraftStatus(message) {
  const status = field("draft-status");
  status.replaceChildren(document.createElement("span"), document.createTextNode(message));
}

function saveDraft() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(draftKey, JSON.stringify(Object.fromEntries(fieldIds.map((id) => [id, field(id).value]))));
    setDraftStatus("Черновик сохранён");
  } catch {
    setDraftStatus("Автосохранение недоступно");
  }
}

function restoreDraft() {
  try {
    const stored = localStorage.getItem(draftKey);
    if (!stored) return;
    const draft = JSON.parse(stored);
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return;
    for (const id of fieldIds) {
      if (typeof draft[id] !== "string") continue;
      const input = field(id);
      input.value = input.maxLength > 0 ? draft[id].slice(0, input.maxLength) : draft[id];
      if (input instanceof HTMLSelectElement && input.selectedIndex === -1) input.value = "";
    }
    setDraftStatus("Черновик восстановлен");
    showToast("Текст восстановлен. Выберите 3 скриншота заново.");
  } catch {
    setDraftStatus("Не удалось прочитать черновик");
  }
}

function numberedList(text, empty = "Не проводилась") {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/^\s*(?:\d+[.)]\s*|[-•]\s+)/, "").trim()).filter(Boolean);
  return lines.length ? lines.map((line, index) => `${index + 1}. ${line}`).join("\n") : empty;
}

function formatDate(date) {
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : "[Дата]";
}

function reportText(template = false) {
  const data = (id, placeholder) => template ? placeholder : value(id) || placeholder;
  const list = (id, placeholder, empty) => template ? placeholder : numberedList(value(id), empty);
  const files = template ? "[3 скриншота]" : selectedFiles().length ? selectedFiles().map((file, index) => `${index + 1}. ${file.name}`).join("\n") : "[Прикрепите 3 скриншота]";
  return [
    "ЕЖЕДНЕВНЫЙ ОТЧЁТ · MYTANKS",
    "",
    `1. Дата: ${template ? "[Дата]" : formatDate(value("report-date"))}`,
    `2. Ваш ник: ${data("nickname", "[Игровой никнейм]")}`,
    `3. Должность: ${data("position", "[Ваша должность]")}`,
    `4. Минуты онлайна: ${data("online-minutes", "[Минуты]")}`,
    `Скриншоты (вложения):\n${files}`,
    `5. Кол-во ответов на репорты: ${data("report-count", "[Кол-во]")}`,
    "",
    "6. Проделанная работа:",
    "",
    "ИГРОВОЙ ПРОЦЕСС:",
    list("game-work", "1. [Баны, муты, кики, предупреждения, информирование игроков]", "[Опишите работу в игре]"),
    "",
    "РАБОТА С СООБЩЕСТВОМ:",
    list("community-work", "1. [Работа во ВКонтакте, Telegram, Discord]", "Не проводилась"),
    "",
    "ФОРУМ:",
    list("forum-work", "1. [Ответы на обращения, размещение новых тем, объявления мероприятий]", "Не проводилась"),
    "",
    "7. МОИ КЛЮЧЕВЫЕ НАВЫКИ:",
    list("key-skills", "1. [Ваш ключевой навык]", "[Перечислите навыки]"),
    "",
    "8. Соответствующие ссылки:",
    data("links", template ? "[Ссылки на форум, скриншоты]" : "Не указаны"),
  ].join("\n");
}

function validateFields() {
  for (const id of ["nickname", "position", "game-work", "key-skills"]) {
    const input = field(id);
    const text = id === "game-work" || id === "key-skills" ? numberedList(input.value, "") : input.value.trim();
    input.setCustomValidity(input.value && !text ? "Введите текст, а не только пробелы или номера пунктов." : "");
  }
  const links = value("links").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const invalidLink = links.find((link) => {
    try {
      const url = new URL(link);
      return !/^https?:\/\//i.test(link) || !["http:", "https:"].includes(url.protocol) || !url.hostname || Boolean(url.username || url.password) || /\s/.test(link);
    } catch {
      return true;
    }
  });
  field("links").setCustomValidity(invalidLink ? "Укажите по одной полной ссылке http:// или https:// на строку, без пробелов и данных для входа." : "");
  validateFiles();
}

function validateFiles() {
  const files = selectedFiles();
  let error = "";
  for (const input of fileInputs) {
    const file = input.files[0];
    const invalidType = file && !allowedImageTypes.includes(file.type);
    const emptyFile = file && file.size === 0;
    const message = invalidType ? "Разрешены только изображения PNG, JPG и WebP." : emptyFile ? "Пустой файл нельзя отправить. Выберите изображение." : "";
    input.setCustomValidity(message);
    if (message) error = message;
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > maxUploadSize) {
    error = "Скриншоты занимают больше 10 МБ. Уменьшите изображения или выберите другие файлы.";
    for (const input of fileInputs) if (input.files.length) input.setCustomValidity(error);
  }
  field("file-error").textContent = error;
  field("file-error").hidden = !error;
  field("file-total").textContent = `${files.length} из 3 · ${files.length ? `${(total / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} / 10 МБ` : "до 10 МБ всего"}`;
}

function refreshFilePreview(input) {
  const slot = input.closest(".upload-slot");
  const image = slot.querySelector("img");
  const caption = slot.querySelector(".file-caption");
  const oldUrl = previewUrls.get(input.id);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  previewUrls.delete(input.id);
  image.hidden = true;
  image.removeAttribute("src");
  const file = input.files[0];
  caption.hidden = !file;
  caption.querySelector("span").textContent = file ? file.name : "";
  if (file && allowedImageTypes.includes(file.type) && file.size > 0 && file.size <= maxUploadSize) {
    const url = URL.createObjectURL(file);
    previewUrls.set(input.id, url);
    image.src = url;
    image.hidden = false;
  }
}

function updateProgress() {
  const sectionValid = (id) => [...field(id).querySelectorAll("input, select, textarea")].every((input) => input.validity.valid);
  const states = {
    basics: sectionValid("basics"),
    work: sectionValid("work"),
    skills: sectionValid("skills"),
    finish: field("consent").checked,
  };
  for (const [id, complete] of Object.entries(states)) {
    const item = document.querySelector(`[data-check="${id}"]`);
    item.classList.toggle("complete", complete);
    const circle = item.querySelector(".check-circle");
    if (complete) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", "#i-check");
      svg.append(use);
      circle.replaceChildren(svg);
    } else {
      circle.textContent = String(Object.keys(states).indexOf(id) + 1);
    }
  }
  const completed = Object.values(states).filter(Boolean).length;
  field("report-progress").value = completed;
  field("progress-value").textContent = `${completed * 25}%`;
}

function openPreview({ ready = false, template = false } = {}) {
  templatePreview = template;
  field("preview-title").textContent = template ? "Шаблон ежедневного отчёта" : "Ваш ежедневный отчёт";
  field("preview-description").textContent = template ? "Все 8 пунктов исходного шаблона. Каждый список нумеруется автоматически." : "Так будет выглядеть текст отчёта. Скриншоты отправятся вложениями.";
  field("preview-text").textContent = reportText(template);
  const chips = template ? [] : selectedFiles().map((file) => {
    const chip = document.createElement("span");
    chip.className = "attachment-chip";
    chip.textContent = file.name;
    return chip;
  });
  field("preview-attachments").replaceChildren(...chips);
  confirmSend.hidden = !ready;
  field("back-to-form").hidden = ready;
  field("send-notice").hidden = !ready;
  previewDialog.showModal();
}

form.addEventListener("input", (event) => {
  if (!fieldIds.includes(event.target.id) && event.target.id !== "consent") return;
  validateFields();
  updateProgress();
  if (fieldIds.includes(event.target.id)) {
    setDraftStatus("Сохраняем черновик…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }
});

for (const input of fileInputs) {
  input.addEventListener("change", () => {
    refreshFilePreview(input);
    validateFields();
    updateProgress();
  });
  input.closest(".upload-slot").querySelector(".file-caption button").addEventListener("click", () => {
    input.value = "";
    refreshFilePreview(input);
    validateFields();
    updateProgress();
    input.focus();
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  validateFields();
  updateProgress();
  if (!form.reportValidity()) return;
  saveDraft();
  openPreview({ ready: true });
});

confirmSend.addEventListener("click", () => {
  if (submitting) return;
  validateFields();
  if (!form.checkValidity()) {
    previewDialog.close();
    form.reportValidity();
    return;
  }
  saveDraft();
  field("email-subject").value = `MT DOCS | ${value("nickname").replace(/[\r\n]/g, " ")} | ${formatDate(value("report-date"))}`;
  field("report-body").value = reportText();
  submitting = true;
  confirmSend.disabled = true;
  confirmSend.textContent = "Переходим в FormSubmit…";
  HTMLFormElement.prototype.submit.call(form);
});

window.addEventListener("pageshow", () => {
  submitting = false;
  confirmSend.disabled = false;
  confirmSend.textContent = "Перейти к отправке";
  validateFields();
  updateProgress();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && saveTimer) saveDraft();
});

field("preview-button").addEventListener("click", () => openPreview());
for (const button of document.querySelectorAll("[data-open]")) {
  button.addEventListener("click", () => {
    if (button.dataset.open === "template") openPreview({ template: true });
    else field("help-dialog").showModal();
  });
}
for (const button of document.querySelectorAll("[data-close]")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}

field("download-report").addEventListener("click", () => {
  const blob = new Blob(["\uFEFF", field("preview-text").textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = templatePreview ? "MT-DOCS-template.txt" : `MT-DOCS-${value("report-date") || localDate}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

field("clear-draft").addEventListener("click", () => field("clear-dialog").showModal());
field("confirm-clear").addEventListener("click", () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  let removed = true;
  try { localStorage.removeItem(draftKey); } catch { removed = false; }
  form.reset();
  field("report-date").value = localDate;
  for (const input of fileInputs) refreshFilePreview(input);
  validateFields();
  updateProgress();
  setDraftStatus(removed ? "Новый черновик" : "Хранилище недоступно");
  field("clear-dialog").close();
  showToast(removed ? "Черновик очищен. Можно начать новый отчёт." : "Поля очищены, но удалить сохранённый текст не удалось. Очистите данные сайта в браузере.");
  field("report-date").focus();
});

restoreDraft();
validateFields();
updateProgress();
