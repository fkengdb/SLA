const WEBHOOK_URL = "https://integracao-n8n.br.engineering/webhook/sla";

/**
 * Extrai o projeto e o Work Item ID de URLs como:
 * https://dev.azure.com/timbrasil/Producao/_workitems/edit/1322962
 * e também a rota de consulta `_queries/edit/{id}` inicialmente solicitada.
 */
function parseAzureQueryUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.hostname !== "dev.azure.com") return null;

    const match = url.pathname.match(
      /^\/[^/]+\/([^/]+)\/_(?:queries|workitems)\/edit\/(\d+)(?:\/|$)/i
    );
    if (!match) return null;

    return {
      project: decodeURIComponent(match[1]),
      id: match[2]
    };
  } catch {
    return null;
  }
}

function asSlaPayload(response) {
  const entry = Array.isArray(response) ? response[0] : response;
  const output = entry?.output ?? entry;
  return {
    body: typeof output?.body === "string" ? output.body : "",
    status: typeof output?.status_do_sla === "string" ? output.status_do_sla : "",
    raw: response
  };
}

function isOverdue(status) {
  // Aceita tanto o valor especificado ("ESTOURO") quanto "ESTOUROU",
  // que é o valor presente no exemplo de resposta.
  return /^ESTOURO(U)?$/i.test(status.trim());
}

function publishState(tabId, state) {
  // O popup pode estar aberto enquanto a requisição termina. A mensagem o
  // atualiza em tempo real; se estiver fechado, não há nada a fazer.
  chrome.runtime.sendMessage({ type: "state-updated", tabId, state }).catch(() => {
    // Não há popup aberto.
  });
}

async function setBadge(tabId, kind) {
  const options = { tabId };
  if (kind === "pending") {
    await chrome.action.setBadgeText({ ...options, text: "..." });
    await chrome.action.setBadgeBackgroundColor({ ...options, color: "#2563EB" });
  } else if (kind === "overdue") {
    await chrome.action.setBadgeText({ ...options, text: "SLA" });
    await chrome.action.setBadgeBackgroundColor({ ...options, color: "#C62828" });
  } else if (kind === "ok") {
    await chrome.action.setBadgeText({ ...options, text: "OK" });
    await chrome.action.setBadgeBackgroundColor({ ...options, color: "#15803D" });
  } else if (kind === "error") {
    await chrome.action.setBadgeText({ ...options, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ ...options, color: "#B45309" });
  } else {
    await chrome.action.setBadgeText({ ...options, text: "" });
  }
}

async function fetchSla(tabId, url) {
  const item = parseAzureQueryUrl(url);
  if (!item) {
    await setBadge(tabId, "clear");
    return null;
  }

  publishState(tabId, { phase: "loading", item, updatedAt: Date.now() });
  await setBadge(tabId, "pending");

  try {
    const params = new URLSearchParams(item);
    const response = await fetch(`${WEBHOOK_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`Webhook respondeu HTTP ${response.status}.`);

    const payload = asSlaPayload(await response.json());
    if (!payload.status) throw new Error("A resposta não contém 'status_do_sla'.");

    const state = {
      phase: "ready",
      item,
      payload,
      isOverdue: isOverdue(payload.status),
      updatedAt: Date.now()
    };
    publishState(tabId, state);
    await setBadge(tabId, state.isOverdue ? "overdue" : "ok");
    return state;
  } catch (error) {
    const state = {
      phase: "error",
      item,
      error: error instanceof Error ? error.message : "Não foi possível consultar o SLA.",
      updatedAt: Date.now()
    };
    publishState(tabId, state);
    await setBadge(tabId, "error");
    return state;
  }
}

async function refreshTab(tab) {
  if (!tab?.id || !tab.url) return null;
  return fetchSla(tab.id, tab.url);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Não consulta o webhook durante a navegação. Apenas evita que o resultado
  // do Work Item anterior permaneça visível no novo endereço.
  if (changeInfo.url) setBadge(tabId, "clear");
});

chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, frameId }) => {
  // Azure DevOps pode trocar de Work Item sem recarregar a página.
  // Esta rotina também só limpa o indicador: nunca chama o webhook.
  if (frameId === 0) setBadge(tabId, "clear");
}, { url: [{ hostEquals: "dev.azure.com" }] });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "refresh-tab") {
    chrome.tabs.get(message.tabId).then(refreshTab).then(sendResponse);
    return true;
  }
});
