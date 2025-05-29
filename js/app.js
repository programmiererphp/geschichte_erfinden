
import { AiGateway } from "./aiGateway.js";

const el = id => document.getElementById(id);

/* ───── State ───── */
let uiLang = "ru";
let settings = JSON.parse(localStorage.getItem("appSettings") || "{}");
let gateway = new AiGateway(settings.apiKey || "", settings.model || "openai/o3");
let storyChunks = [];  // массив объектов {author,text}

/* ───── I18N ───── */
let i18nDict = {};
fetch("assets/i18n.json")
  .then(r => r.json())
  .then(json => { i18nDict = json; applyI18n(); });

function _(key) { return i18nDict[key]?.[uiLang] || key; }
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(elm => {
    elm.textContent = _(elm.dataset.i18n);
  });
  el("btnStart").textContent   = _("btnStart");
  el("btnRestart").textContent = _("btnRestart");
  el("btnStop").textContent    = _("btnStop");
  el("btnSettings").textContent= _("btnSettings");
  el("btnLog").textContent     = _("btnLog");
}

/* ───── Toolbar Events ───── */
el("btnSettings").onclick = () => {
  el("uiLang").value = uiLang;
  el("apiKey").value = settings.apiKey || "";
  el("storyMode").value = settings.storyMode || "text";
  el("settingsModal").showModal();
};
el("closeSettings").onclick = () => el("settingsModal").close();
el("saveSettings").onclick  = () => {
  settings.apiKey = el("apiKey").value.trim();
  settings.storyMode = el("storyMode").value;
  uiLang = el("uiLang").value;
  localStorage.setItem("appSettings", JSON.stringify(settings));
  gateway.setKey(settings.apiKey);
  el("settingsModal").close();
  applyI18n();
};

/* ───── Story rendering ───── */
function renderStory() {
  el("storyView").innerHTML = storyChunks
    .map(ch => `<p><strong>${ch.author}:</strong> ${ch.text}</p>`)
    .join("");
  el("storyView").scrollTop = el("storyView").scrollHeight;
}

/* ───── Start logic ───── */
el("btnStart").onclick = async () => {
  if (!settings.apiKey) return alert(_("toastNoKey"));
  el("btnStart").disabled = true;
  // P1 Initial Prompt (stub)
  const p1 = "Начни короткую историю одним предложением.";
  const res = await gateway.completion(p1, 60, 0.8);
  storyChunks.push({ author: "ai", text: res.text.trim() });
  renderStory();
  // показать Prompt & Options (заглушки)
  el("promptText").textContent = "Что будет дальше?";
  el("optionList").innerHTML = ["Вариант A", "Вариант B", "Вариант C"]
    .map(txt => `<button class="opt">${txt}</button>`).join("");
  // enable input
  document.querySelectorAll(".opt").forEach(btn => {
    btn.onclick = () => { el("lastInput").value = btn.textContent; };
  });
  el("freeAnswer").style.display = "block";
  el("btnRestart").disabled = false;
  el("btnStop").disabled = false;
};

el("sendInput").onclick = async () => {
  const userText = el("lastInput").value.trim();
  if (!userText) return;
  storyChunks.push({ author: "you", text: userText });
  renderStory();
  el("lastInput").value = "";
  // P4 Integration Prompt (sehr vereinfacht)
  const p4 = `Продолжи историю: ${storyChunks.slice(-2).map(c=>c.text).join(" ")}.`;
  const res = await gateway.completion(p4, 120, 0.7);
  storyChunks.push({ author: "ai", text: res.text.trim() });
  renderStory();
};

el("btnRestart").onclick = () => location.reload();
el("btnStop").onclick = () => {
  el("btnStart").disabled = false;
  el("btnRestart").disabled = true;
  el("btnStop").disabled = true;
};
window.addEventListener("load", applyI18n);
