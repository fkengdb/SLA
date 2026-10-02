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
/webhook/sla?project=Producao&id=1516804
```

## Instalação local

1. Faça o download e extrai a pasta onde desejar no seu computador. [Download](https://github.com/fkengdb/SLA/releases/download/v.1.0.2/Consulta-SLA.v1.0.2.7z)
2. Abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta no seu computador onde os arquivos da extensão (manifest.json, background.js, etc.) estão localizados e confirme.
6. A extensão e seu ícone devem aparecer na sua lista de extensões instaladas. Recomendado fixa-lá na barra superior (clicando no ícone de "quebra-cabeça" e no alfinete).
5. Abra uma URL de consulta do Azure DevOps e aguarde o indicador no ícone da extensão.

O badge do ícone será:

- `SLA` em vermelho se `status_do_sla` for `ESTOURO` ou `ESTOUROU`.
- `OK` em verde para qualquer outro status retornado.
- `...` em azul durante a consulta e `!` em laranja quando houver erro.
