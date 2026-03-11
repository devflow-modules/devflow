# Meta Ads — Configuração

A landing está pronta para Meta Ads. Configure o Pixel e os eventos.

## 1. Meta Pixel

Adicione no `.env.local`:

```
NEXT_PUBLIC_META_PIXEL_ID=seu_pixel_id
```

O Pixel ID fica em: [Meta Business Suite](https://business.facebook.com) → Configurações do Eventos → Pixel do Facebook.

## 2. Eventos configurados

| Evento | Quando dispara |
|--------|----------------|
| **PageView** | Ao carregar qualquer página |
| **ViewContent** | Ao entrar em `/automacao-whatsapp-tabacaria`, `/automacao-whatsapp-restaurante` ou `/demo` |
| **Contact** | Ao clicar em "Falar no WhatsApp" ou "Automatizar meu WhatsApp" |

## 3. Campanhas sugeridas

- **Tabacarias** → `/automacao-whatsapp-tabacaria`
- **Restaurantes** → `/automacao-whatsapp-restaurante`
- **Negócios locais** → `/demo`
