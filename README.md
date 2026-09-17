# Agilize Certificadora

Site institucional da Agilize Certificadora, com catálogo de certificados digitais para pessoa física e jurídica, atendimento online e presencial e apresentação do Agilize Plus.

Site publicado: https://agilizecertificadora.pages.dev

## Desenvolvimento local

```bash
node server.mjs
```

Acesse `http://127.0.0.1:4173`.

## Estrutura

- `dist/`: site público estático.
- `functions/api/`: API de horários e pedidos no Cloudflare Pages.
- `migrations/`: estrutura do banco D1.
- `server.mjs`: servidor local de prévia.

O formulário gera protocolo, grava o pedido no D1 e impede conflito de horário enquanto o pedido estiver ativo. O aviso por e-mail será enviado quando a credencial do serviço de e-mail for configurada no Cloudflare.

## Painel administrativo

O painel operacional protegido fica em `/admin/`. O acesso usa um código temporário enviado exclusivamente ao e-mail administrativo configurado no Cloudflare. Pedidos, dados pessoais, protocolo Syngulari, link de videoconferência e observações internas são armazenados no D1.

Os documentos comerciais internos, custos e regras administrativas não fazem parte deste repositório público.
