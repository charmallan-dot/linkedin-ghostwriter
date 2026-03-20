# Technical Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│              (Cloudflare Pages - Frontend)                  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │   Input     │→ │   Generate  │→ │  View & Copy    │    │
│  │  Bullets    │  │   Posts     │  │   Results       │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Call (HTTPS)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 HUGGING FACE API                            │
│              (AI Text Generation)                           │
│                                                             │
│  Model: mistralai/Mistral-7B-Instruct-v0.3                 │
│  Free Tier: 10,000 requests/month                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Payment Link (if Pro)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    STRIPE                                   │
│              (Payment Processing)                           │
│                                                             │
│  - Payment Links (no code)                                 │
│  - Subscription management                                 │
│  - Webhook for status updates                              │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Tech Stack

### Frontend
| Component | Technology | Why |
|-----------|------------|-----|
| Hosting | Cloudflare Pages | Free, fast CDN, instant deploys |
| Framework | Vanilla HTML/CSS/JS | No build step, simple, fast |
| Styling | Tailwind CSS (CDN) | Rapid UI development |
| Icons | Heroicons (SVG) | Free, clean icons |

### Backend (Serverless)
| Component | Technology | Why |
|-----------|------------|-----|
| API Layer | Cloudflare Workers | Free tier (100K req/day) |
| AI API | Hugging Face Inference | Free tier available |
| Auth | Simple token-based | No complex OAuth needed |
| Database | Cloudflare KV | Free tier (100K reads/day) |

### Payments
| Component | Technology | Why |
|-----------|------------|-----|
| Checkout | Stripe Payment Links | No code, instant setup |
| Subscriptions | Stripe Billing | Handles recurring payments |
| Webhooks | Stripe → Cloudflare | Auto-update user status |

### Analytics
| Component | Technology | Why |
|-----------|------------|-----|
| Web Analytics | Plausible | Privacy-friendly, free self-hosted |
| Alternative | Google Analytics | Free, familiar |

## 🔧 Architecture Details

### Frontend Structure
```
02-frontend-code/
├── index.html          # Main landing page + app
├── app.js             # Core application logic
├── style.css          # Custom styles (Tailwind + custom)
└── assets/
    └── logo.svg       # Brand logo
```

### Backend Structure
```
03-backend-code/
├── worker.js          # Cloudflare Worker (API layer)
├── wrangler.toml      # Worker configuration
├── hf-integration.js  # Hugging Face API calls
└── stripe-webhook.js  # Payment webhook handler
```

### Data Flow

1. **User enters bullet points** → Frontend validates input
2. **Frontend calls Cloudflare Worker** → POST /api/generate
3. **Worker calls Hugging Face API** → Sends prompt with bullets
4. **HF returns generated posts** → Worker formats response
5. **Frontend displays 3 options** → User selects/copies
6. **Usage tracked in KV** → Free tier: 3/month limit
7. **Upgrade flow** → Stripe Payment Link → Webhook updates status

## 🛡️ Security Considerations

### API Key Protection
- Hugging Face API key stored in Cloudflare Worker secrets
- Never exposed to frontend
- Rate limiting per user/IP

### User Data
- No personal data stored (GDPR compliant)
- Generated posts not saved unless user saves locally
- Analytics anonymized (Plausible)

### Payment Security
- Stripe handles all payment data (PCI compliant)
- Frontend never touches card numbers
- Webhook signatures verified

## 📊 Cost Breakdown (Monthly)

| Service | Free Tier | Paid Tier (at scale) |
|---------|-----------|---------------------|
| Cloudflare Pages | Free (unlimited) | Free |
| Cloudflare Workers | 100K req/day free | $5/mo (10M req) |
| Hugging Face | 10K req/month free | $9/mo (Pro tier) |
| Cloudflare KV | 100K reads/day free | $2.50/mo |
| Stripe | 2.9% + 30¢ per transaction | Same |
| Plausible | Free (self-hosted) | $9/mo (hosted) |
| **Total** | **$0** | **~$25/mo at 150 users** |

### Unit Economics (150 Pro Users @ $15/mo)
- Revenue: $2,250/mo
- Costs: ~$25/mo
- **Profit: $2,225/mo (99% margin)**

## 🚀 Scalability Plan

### Phase 1: 0-150 Users (Current Architecture)
- Free tiers handle everything
- No infrastructure changes needed

### Phase 2: 150-1000 Users
- Upgrade Hugging Face to Pro ($9/mo)
- Add caching layer (Cloudflare KV)
- Implement request queuing

### Phase 3: 1000+ Users
- Dedicated AI model (fine-tuned)
- PostgreSQL for user management
- Redis for session/cache
- Still < $200/mo infrastructure

## 🔗 API Endpoints

### POST /api/generate
```json
// Request
{
  "bullets": ["point 1", "point 2", "point 3"],
  "style": "professional"
}

// Response
{
  "posts": [
    {"text": "...", "tokens": 245},
    {"text": "...", "tokens": 238},
    {"text": "...", "tokens": 251}
  ],
  "remaining": 2
}
```

### GET /api/usage
```json
// Response
{
  "used": 1,
  "limit": 3,
  "remaining": 2,
  "resetsAt": "2024-04-01T00:00:00Z"
}
```

### POST /api/webhook/stripe
```json
// Stripe webhook payload
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "customer_email": "user@example.com",
      "subscription": "sub_xxx"
    }
  }
}
```

---

**Next Step:** Review frontend code → `02-frontend-code/`
