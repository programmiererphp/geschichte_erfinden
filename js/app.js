/js/app.js
import { AiGateway }                         from "./aiGateway.js";
import { loadScenarios, getScenarioByName }  from "./scenarioManager.js";
import { speak, stop as stopTTS }            from "./ttsBrowser.js";
import { md }                                from "./md.js";

const $ = id => document.getElementById(id);

/* ───── Runtime State ───── */
let uiLang = "ru";
let settings = JSON.parse(localStorage.getItem("appSettings") || "{}");
let gateway  = new AiGateway(settings.apiKey || "", "openai/o3");
let scenarios = [];
let currentScenario = null;
let storyChunks = [];   // [{author,text}]
let lastPrompt  = "";   // хранит текущий benutzerPrompt

/* ───── I18N ───── */
let dict = {};
fetch("assets/i18n.json").then(r => r.json()).then(j => { dict = j; applyI18n(); });
function _(k){ return dict[k]?.[uiLang] || k; }
function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach(e => e.textContent = _(e.dataset.i18n));
  ["btnStart","btnRestart","btnStop","btnSettings","btnLog"].forEach(id => $(id).textContent = _(id));
}

/* ───── Load scenarios & fill <select> ───── */
(async () => {
  scenarios = await loadScenarios();
  const sel = $("scenarioSel");
  sel.innerHTML = scenarios.map(s => `<option>${s.name}</option>`).join("");
  sel.value = settings.scenario || scenarios[0].name;
  currentScenario = getScenarioByName(scenarios, sel.value);
})();

/* ───── Settings modal ───── */
$("btnSettings").onclick = () => {
  $("uiLang").value     = uiLang;
  $("apiKey").value     = settings.apiKey || "";
  $("storyMode").value  = settings.storyMode || "text";
  $("scenarioSel").value= currentScenario?.name || "";
  $("settingsModal").showModal();
};
$("closeSettings").onclick = () => $("settingsModal").close();
$("saveSettings").onclick  = () => {
  uiLang              = $("uiLang").value;
  settings.apiKey     = $("apiKey").value.trim();
  settings.storyMode  = $("storyMode").value;
  settings.scenario   = $("scenarioSel").value;
  settings.readSummary= $("readSummary")?.checked || false;        // optionales TTS-Flag
  currentScenario     = getScenarioByName(scenarios, settings.scenario);
  localStorage.setItem("appSettings", JSON.stringify(settings));
  gateway.setKey(settings.apiKey);
  $("settingsModal").close();
  applyI18n();
};

/* ───── Rendering helpers ───── */
function renderStory(){
  $("storyView").innerHTML = storyChunks
    .map(c => `<p><strong>${c.author}:</strong> ${md(c.text)}</p>`)
    .join("");
  $("storyView").scrollTop = $("storyView").scrollHeight;
}
function showOptions(arr){
  $("optionList").innerHTML = arr.map(txt =>
    `<button class="opt">${txt}</button>`).join("");
  document.querySelectorAll(".opt").forEach(btn =>
    btn.onclick = () => { $("lastInput").value = btn.textContent; });
}

/* ───── Game Flow ───── */
$("btnStart").onclick = async () => {
  if(!settings.apiKey)   return alert(_("toastNoKey"));
  if(!currentScenario)   return alert("Сценарии не загружены");

  $("btnStart").disabled = true;
  storyChunks.length = 0;

  /* P1 */
  const resP1 = await gateway.completion(currentScenario.prompts.p1, 60, .8);
  storyChunks.push({author:"ai", text: resP1.text.trim()});
  renderStory();

  /* P2 */
  const p2 = currentScenario.prompts.p2.replace("{storyTail}", resP1.text.trim());
  const resP2 = await gateway.completion(p2, 60, .7);
  lastPrompt = resP2.text.trim();
  $("promptText").textContent = lastPrompt;

  /* P3 */
  const p3 = currentScenario.prompts.p3
             .replace("{storyTail}", resP1.text.trim())
             .replace("{benutzerPrompt}", lastPrompt);
  let resP3 = await gateway.completion(p3, 120, .7);
  let opts;
  try { opts = JSON.parse(resP3.text); } catch { opts = ["Вариант 1","Вариант 2","Вариант 3"]; }
  showOptions(opts);

  $("btnRestart").disabled = false;
  $("btnStop").disabled    = false;
};

$("sendInput").onclick = async () => {
  const userText = $("lastInput").value.trim();
  if(!userText) return;
  $("lastInput").value = "";
  storyChunks.push({author:"you", text:userText});
  renderStory();

  /* P4 */
  const fullStory = storyChunks.map(c=>c.text).join(" ");
  const p4 = currentScenario.prompts.p4
            .replace("{fullStory}", fullStory)
            .replace("{selectedAnswer}", userText)
            .replace("{userName}", "You");
  const resP4 = await gateway.completion(p4, 150, .7);
  storyChunks.push({author:"ai", text: resP4.text.trim()});
  renderStory();

  /* P5 – Kommentar + optional vorlesen */
  const p5 = currentScenario.prompts.p5
            .replace("{selectedAnswer}", userText)
            .replace("{userName}", "You");
  const resP5 = await gateway.completion(p5, 40, .8);
  $("commentBox").innerHTML = md(resP5.text.trim());
  if(settings.readSummary) {
    stopTTS();
    speak(resP5.text.trim(), uiLang === "de" ? "de-DE" : "ru-RU")
      .catch(()=>console.warn("TTS failed"));
  }

  /* P2/P3 für nächste Runde */
  const tail = storyChunks.slice(-2).map(c=>c.text).join(" ");
  const newP2 = currentScenario.prompts.p2.replace("{storyTail}", tail);
  const resNewP2 = await gateway.completion(newP2, 60, .7);
  lastPrompt = resNewP2.text.trim();
  $("promptText").textContent = lastPrompt;

  const newP3 = currentScenario.prompts.p3
                .replace("{storyTail}", tail)
                .replace("{benutzerPrompt}", lastPrompt);
  let resNewP3 = await gateway.completion(newP3, 120, .7);
  let opts2;
  try { opts2 = JSON.parse(resNewP3.text); } catch { opts2 = ["A","B","C"]; }
  showOptions(opts2);
};

$("btnRestart").onclick = () => location.reload();
$("btnStop").onclick    = () => { $("btnStart").disabled=false; $("btnStop").disabled=true; stopTTS(); };

window.addEventListener("load", applyI18n);
/js/app.js end
