"use strict";

const form = document.querySelector("#report-form");
const draftKey = "mt-docs-draft-v1";
const fieldIds = ["report-date", "nickname", "position", "online-minutes", "report-count", "screenshot-1", "screenshot-2", "screenshot-3", "game-work", "community-work", "forum-work", "key-skills", "links"];
const previewDialog = document.querySelector("#preview-dialog");
const confirmSend = document.querySelector("#confirm-send");
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
let saveTimer;
let toastTimer;
let templatePreview = false;

const field = (id) => document.getElementById(id);
const value = (id) => field(id).value.trim();
function isHttpUrl(link) {
  try {
    const url = new URL(link);
    return /^https?:\/\//i.test(link) && ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !/\s/.test(link);
  } catch {
    return false;
  }
}
field("report-date").value = localDate;
field("report-date").max = localDate;

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
    showToast("Черновик восстановлен.");
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
  const screenshots = template ? "1. [Ссылка на скриншот 1]\n2. [Ссылка на скриншот 2]\n3. [Ссылка на скриншот 3]" : [1, 2, 3].map((number) => `${number}. ${value(`screenshot-${number}`)}`).join("\n");
  return [
    "ЕЖЕДНЕВНЫЙ ОТЧЁТ · MYTANKS",
    "",
    `1. Дата: ${template ? "[Дата]" : formatDate(value("report-date"))}`,
    `2. Ваш ник: ${data("nickname", "[Игровой никнейм]")}`,
    `3. Должность: ${data("position", "[Ваша должность]")}`,
    `4. Минуты онлайна: ${data("online-minutes", "[Минуты]")}`,
    `Скриншоты (ссылки):\n${screenshots}`,
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
  const screenshotIds = ["screenshot-1", "screenshot-2", "screenshot-3"];
  const invalidScreenshot = screenshotIds.find((id) => !isHttpUrl(value(id)));
  for (const id of screenshotIds) field(id).setCustomValidity(isHttpUrl(value(id)) ? "" : "Укажите полную ссылку, начинающуюся с https:// или http://.");
  const extraLinks = value("links").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const invalidExtraLink = extraLinks.find((link) => !isHttpUrl(link));
  field("links").setCustomValidity(invalidExtraLink ? "Укажите по одной полной ссылке http:// или https:// на строку, без пробелов." : "");
  const linkError = invalidScreenshot ? "Проверьте ссылки на скриншоты: нужны полные адреса http:// или https://." : invalidExtraLink ? "Проверьте дополнительные ссылки: укажите полные адреса http:// или https://." : "";
  field("file-error").textContent = linkError;
  field("file-error").hidden = !linkError;
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
  field("preview-description").textContent = template ? "Все 8 пунктов исходного шаблона. Каждый список нумеруется автоматически." : "Так будет выглядеть отчёт и ссылки на скриншоты.";
  field("preview-text").textContent = reportText(template);
  const chips = template ? [] : [1, 2, 3].map((number) => {
    const chip = document.createElement("span");
    chip.className = "attachment-chip";
    const url = value(`screenshot-${number}`);
    if (isHttpUrl(url)) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `Скриншот ${number}`;
      chip.append(link);
    } else {
      chip.textContent = `Ссылка ${number} не указана`;
    }
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
  if (field("staticforms-api-key").value === "YOUR_STATIC_FORMS_API_KEY") {
    const error = field("send-error");
    error.textContent = "Static Forms ещё не подключён. Добавьте API key формы и укажите получателя в разделе Delivery.";
    error.hidden = false;
    error.scrollIntoView({ block: "nearest" });
    return;
  }
  field("email-subject").value = `MT DOCS | ${value("nickname").replace(/[\r\n]/g, " ")} | ${formatDate(value("report-date"))}`;
  field("report-body").value = reportText();
  const redirectUrl = field("staticforms-redirect").value;
  const submissionWindow = window.open("about:blank", "_blank");
  if (!submissionWindow) {
    const error = field("send-error");
    error.textContent = "Браузер заблокировал вкладку отправки. Разрешите всплывающие окна для сайта и попробуйте ещё раз.";
    error.hidden = false;
    error.scrollIntoView({ block: "nearest" });
    return;
  }
  const submissionTarget = `staticforms-submit-${Date.now()}`;
  submissionWindow.name = submissionTarget;
  form.target = submissionTarget;
  HTMLFormElement.prototype.submit.call(form);
  window.location.replace(redirectUrl);
});

window.addEventListener("pageshow", () => {
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
