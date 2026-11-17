"use strict";

try {
  if (sessionStorage.getItem("mt-docs-new-year-theme") === "TRUE") {
    document.body.dataset.newYearTheme = "TRUE";
  }
} catch {}

const pendingReportKey = "mt-docs-pending-report-v1";
const form = document.querySelector("#send-report-form");
const button = document.querySelector("#send-report-button");
const status = document.querySelector("#send-status");

if (new URLSearchParams(window.location.search).get("sent") === "1") {
  status.textContent = "Static Forms принял отчёт. Проверьте входящие и папку «Спам» на supportmytanks@gmail.com.";
  form.hidden = true;
} else {
  try {
    const report = JSON.parse(sessionStorage.getItem(pendingReportKey) || "null");
    if (!report || typeof report.name !== "string" || typeof report.subject !== "string" || typeof report.message !== "string" || !Array.isArray(report.screenshots) || report.screenshots.length !== 3) {
      throw new Error("Подготовленный отчёт не найден");
    }

    document.querySelector("#send-name").value = report.name;
    document.querySelector("#send-subject").value = report.subject;
    document.querySelector("#send-message").value = report.message;
    report.screenshots.forEach((url, index) => {
      document.querySelector(`#send-screenshot-${index + 1}`).value = url;
    });
    status.textContent = "Проверьте, что отчёт готов к отправке. Нажмите кнопку ниже — письмо откроется в новой вкладке.";
    button.disabled = false;
  } catch {
    status.textContent = "Подготовленный отчёт не найден. Вернитесь к форме и нажмите «Проверить и отправить» ещё раз.";
  }
}

form.addEventListener("submit", () => {
  button.disabled = true;
  status.textContent = "Открываем отправку отчёта в новой вкладке…";
  window.alert("Подождите 5–10 секунд — после этого новую вкладку можно закрыть и вернуться на страницу благодарности.");
});
