# Landing Page Pet Shop

Landing page otimizada para captação de leads com foco em conversão, responsividade e carregamento rápido.

## Estrutura

- `index.html`: conteúdo e estrutura da página
- `styles.css`: layout, identidade visual e responsividade
- `script.js`: validação e envio assíncrono do formulário

## Ativar captação de leads

1. Abra o arquivo `index.html`
2. No formulário, altere:

```html
action="https://formsubmit.co/ajax/SEU_EMAIL_AQUI"
```

para seu e-mail real, por exemplo:

```html
action="https://formsubmit.co/ajax/contato@seupetshop.com.br"
```

3. Publique os arquivos em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages, Hostinger, etc.)
4. Faça um envio de teste e confirme o e-mail no provedor do FormSubmit

## Integrações de marketing (opcional)

Você pode integrar facilmente:

- Google Analytics 4
- Meta Pixel
- RD Station / HubSpot / Mailchimp (via webhook + Zapier/Make/n8n)

### 1) Configurar IDs e webhook

No `index.html`, edite o bloco:

```html
window.MARKETING_CONFIG = { gaMeasurementId: "G-XXXXXXXXXX", metaPixelId:
"000000000000000", leadWebhookUrl: "", rdStationWebhookUrl: "",
rdConversionIdentifier: "LP Pet Shop - Lead", hubspotWebhookUrl: "",
hubspotPortalId: "", hubspotFormGuid: "", };
```

- `gaMeasurementId`: seu ID do GA4
- `metaPixelId`: ID numérico do Pixel Meta
- `leadWebhookUrl`: URL HTTPS do seu webhook (opcional)
- `rdStationWebhookUrl`: endpoint para receber payload no padrão RD Station
- `rdConversionIdentifier`: identificador da conversão no RD
- `hubspotPortalId` + `hubspotFormGuid`: envio direto para formulário HubSpot
- `hubspotWebhookUrl`: alternativa para envio via automação/webhook

Se não preencher um item, ele não é ativado.

### 2) Eventos já enviados automaticamente

- `cta_click`: clique em botões/links para seção de formulário
- `generate_lead`: envio de lead com sucesso
- `lead_submit_error`: falha no envio do formulário

No webhook, o payload inclui `nome`, `telefone`, `email`, `interesse`, `source` e `submittedAt`.

### 3) Mapeamento pronto de campos

RD Station (payload de conversão):

- `payload.name` ← nome
- `payload.email` ← email
- `payload.personal_phone` ← telefone
- `payload.mobile_phone` ← telefone
- `payload.cf_interesse` ← interesse
- `payload.conversion_identifier` ← rdConversionIdentifier

HubSpot (payload de formulário):

- `fields.firstname` ← primeiro nome
- `fields.lastname` ← sobrenome
- `fields.email` ← email
- `fields.phone` ← telefone
- `fields.interesse` ← interesse
- `fields.lead_source` ← source

Fluxo sugerido:

1. Lead envia formulário
2. Evento de conversão é enviado para GA4/Meta (se ativos)
3. Lead é enviado para webhooks e/ou HubSpot Form API (se configurados)
4. Automação envia para CRM + ferramenta de e-mail
5. Dispara sequência de boas-vindas

## Performance e compatibilidade

- HTML/CSS/JS puro (sem frameworks pesados)
- Layout responsivo para desktop, tablet e mobile
- Compatível com navegadores modernos (Chrome, Edge, Firefox, Safari)
