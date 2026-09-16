# Shoda AI — Landing page

Statik landing sahifa (`index.html` va `assets/`). Hech qanday build kerak emas —
faylni istalgan static hosting (Nginx, Netlify, Vercel, GitHub Pages) orqali joylashtirish mumkin.

## Bepul joylar hisoblagichi

Sahifa backenddagi ochiq endpointdan real vaqtda ma'lumot oladi:

```
GET /api/public/promo
→ {"total": 50, "taken": 12, "left": 38, "monthly_price_usd": 10}
```

`taken` — ro'yxatdan o'tgan tashkilotlar soni (`platform.organizations` jadvali).
Hisoblagich har 30 soniyada avtomatik yangilanadi. Backend javob bermasa,
sahifa 50 ta joy bilan xatosiz ko'rinadi.

Bepul joylar sonini o'zgartirish: `backend/app/platform/public_router.py` →
`PROMO_TOTAL_SLOTS = 50`.

## Manzillarni sozlash

Standart holatda ilova manzili `https://ai.shoda.app` deb olinadi.
Boshqa manzil kerak bo'lsa, `index.html` ichidagi `<script>` blokidan **oldin** qo'shing:

```html
<script>
  window.SHODA_APP_URL = "https://ai.shoda.app";  // Kirish / Ro'yxatdan o'tish havolalari
  window.SHODA_API_URL = "https://ai.shoda.app";  // backend (bo'sh bo'lsa joriy domen ishlatiladi)
</script>
```

Lokal sinov uchun:

```bash
cd landing
python3 -m http.server 5500
# http://localhost:5500
```

Lokalda hisoblagich ishlashi uchun `window.SHODA_API_URL = "http://localhost:8000"` qilib qo'ying
va backend CORS ro'yxatiga shu manzilni qo'shing.

## Nginx bilan joylashtirish (namuna)

```nginx
server {
    listen 80;
    server_name shoda.app www.shoda.app;
    root /var/www/shoda-landing;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

## Dizayn va logolar

- `assets/redesign.css` — oq va yashil mavzu, mobil va desktop maketlari.
- `assets/shoda-mark.svg` — original Shoda belgisi va favicon.
- `assets/shoda-logo.svg` — yozuvli logo.

Hostingga `index.html` bilan birga `assets/` papkasini ham yuklang. Hero suhbat oynasi mahsulot ishlashini ko‘rsatuvchi statik namuna.
