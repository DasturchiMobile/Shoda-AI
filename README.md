# Shoda AI

Telegram-based AI sales agent SaaS. Multi-tenant admin panel + REST API.
Heavy AI/Telegram logic is delegated to an external **n8n** service that
reads/writes this backend over HTTP.

## Architecture

```
                +--------------------+
   Telegram --> |  n8n workflows     | <-- Gemini / Telegram MTProto
                +----------+---------+
                           | HTTP (JWT)
                           v
   Admins/UI --> [nginx] --> [FastAPI backend] --> [PostgreSQL]
                                                   (schema-per-org)
```

## Multi-tenancy

- One PostgreSQL database.
- `platform` schema holds: `organizations`, `users`,
  `registration_requests`, `platform_settings`.
- Every organization gets its own schema `org_<id>` with tenant tables
  (`categories`, `products`, `product_images`).
- On every authenticated request the connection's `search_path` is set
  to `org_<id>, platform, public` so the same ORM models resolve to the
  caller's tenant tables.

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

- Admin panel:      http://localhost:8080
- Superadmin panel: http://localhost:8080/superadmin
- API:              http://localhost:8080/api  (proxied to backend:8000)

## Bootstrap superadmin

On first boot the backend creates a superadmin user from
`BOOTSTRAP_SUPERADMIN_USERNAME` / `BOOTSTRAP_SUPERADMIN_PASSWORD`
(default `azizbek_piima` / `059501032004piima`) inside a synthetic
`Platform` organization.

## Phases

- **Phase A (this scaffold):** platform + tenant CRUD, self-signup +
  superadmin approval, products/categories with local file storage.
- **Phase B:** replace local file storage with Telegram private
  channel — `product_images.telegram_file_id` + proxy endpoint.
- **Phase C:** Telegram channel import via Gemini-assisted parsing
  (button already stubbed in Products page).
