# Consulta SLA Azure DevOps

Extensão Chromium (Chrome/Edge) que identifica páginas nas rotas abaixo, consulta o webhook de SLA e exibe o resultado no popup.

```text
https://dev.azure.com/{organizacao}/{project}/_queries/edit/{id}/
https://dev.azure.com/{organizacao}/{project}/_workitems/edit/{id}
```

Exemplo reconhecido:

```text
https://dev.azure.com/org/Producao/_queries/edit/1516804/?queryId=447cfb06-b57c-4c39-83f9-8b13fc14a8ef
https://dev.azure.com/org/Producao/_workitems/edit/1322962
```

Nesse caso, a extensão chama:

```text
https://integracao-n8n.br.engineering/webhook/sla?project=Producao&id=1516804
```

## Instalação local

1. Abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta: `C:\Users\couto\Documents\Extension`.
5. Abra uma URL de consulta do Azure DevOps e aguarde o indicador no ícone da extensão.
