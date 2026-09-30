const content = document.querySelector("#content");
const itemLabel = document.querySelector("#item-label");
const refreshButton = document.querySelector("#refresh");
let activeTabId;

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

// Conversor pequeno e seguro para o Markdown retornado pelo webhook.
function renderMarkdown(markdown) {
  const lines = markdown.replace(/\\n/g, "\n").split("\n");
  let html = "";
  let listOpen = false;
  const closeList = () => { if (listOpen) { html += "</ul>"; listOpen = false; } };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { closeList(); continue; }
    if (/^---+$/.test(line)) { closeList(); html += "<hr>"; continue; }
    const heading = line.match(/^##\s+(.+)/);
    if (heading) { closeList(); html += `<h2>${inlineMarkdown(heading[1])}</h2>`; continue; }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (!listOpen) { html += "<ul>"; listOpen = true; }
      html += `<li>${inlineMarkdown(bullet[1])}</li>`;
      continue;
    }
    closeList();
    html += `<p>${inlineMarkdown(line)}</p>`;
  }
  closeList();
  return html;
}

function render(state) {
  if (!state) {
    itemLabel.textContent = "Abra uma consulta de Work Item no Azure DevOps.";
    content.innerHTML = '<p class="message">Esta página não corresponde à rota de consulta esperada.</p>';
    refreshButton.disabled = true;
    return;
  }

  const { item } = state;
  itemLabel.textContent = `Projeto: ${item.project} · Work Item: ${item.id}`;
  refreshButton.disabled = state.phase === "loading";

  if (state.phase === "loading") {
    content.innerHTML = '<p class="message">Consultando o webhook de SLA…</p>';
    return;
  }
  if (state.phase === "error") {
    content.innerHTML = `<p class="message error">${escapeHtml(state.error)}</p>`;
    return;
  }

  const overdue = state.isOverdue;
  const status = escapeHtml(state.payload.status);
  content.innerHTML = `
    <div class="status ${overdue ? "overdue" : "ok"}">
      <span class="dot"></span>
      <span>${overdue ? "SLA estourado" : "SLA dentro do prazo"}: ${status}</span>
    </div>
    <article class="report">${renderMarkdown(state.payload.body || "Nenhum relatório foi retornado.")}</article>`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;
  return tab;
}

async function loadState(refresh = false) {
  const tab = await getActiveTab();
  if (!tab?.id) return render(null);
  if (refresh) {
    render({ phase: "loading", item: { project: "…", id: "…" } });
    const state = await chrome.runtime.sendMessage({ type: "refresh-tab", tabId: tab.id });
    render(state);
  } else {
    // A extensão pode ter sido instalada depois que a página foi aberta.
    // Nesse caso, ainda não haverá estado salvo e fazemos a primeira consulta.
    let state = await chrome.runtime.sendMessage({ type: "get-state", tabId: tab.id });
    if (!state) state = await chrome.runtime.sendMessage({ type: "refresh-tab", tabId: tab.id });
    render(state);
  }
}

refreshButton.addEventListener("click", () => loadState(true));

// Recebe a conclusão de uma consulta iniciada antes ou durante a abertura
// deste popup, sem exigir que o usuário feche e abra a extensão novamente.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "state-updated" && message.tabId === activeTabId) {
    render(message.state);
  }
});

loadState();
