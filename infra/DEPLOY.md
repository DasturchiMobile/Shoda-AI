# Shoda AI — serverga joylashtirish (deploy) qo'llanmasi

Server: `217.76.62.232` · foydalanuvchi: `azizbek_piima`
Bu serverda **boshqa loyihalar ham ishlaydi**, shuning uchun har bir qadam
mavjud xizmatlarga tegmasligi tekshirilgan holda yozilgan.

> ⚠️ **Xavfsizlik:** SSH parolingiz chatda ochiq yozildi. Deploy tugagach uni
> albatta almashtiring (`passwd`) va imkon bo'lsa SSH kalitiga o'ting
> (`ssh-copy-id azizbek_piima@217.76.62.232`), parol bilan kirishni yoping.

---

## 0-qadam — Serverda nima ishlayotganini bilib olish (MAJBURIY)

Hech narsani o'zgartirishdan oldin, band portlar va mavjud konteynerlarni ko'ring:

```bash
ssh azizbek_piima@217.76.62.232

# Qaysi portlar band?
sudo ss -tulpn | grep LISTEN

# Qaysi konteynerlar ishlayapti va qaysi portlarni egallagan?
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'

# Docker loyihalari (compose project) ro'yxati
docker compose ls

# Disk joyi yetarlimi?
df -h /
```

Natijada quyidagilarni yozib oling:

| Nima | Odatda | Sizda |
|---|---|---|
| Nginx Proxy Manager | 80, 443, 81 | ? |
| Portainer | 8000, 9443 | ? |
| **8080 bo'shmi?** | ilova uchun kerak | ? |
| **8081 bo'shmi?** | landing uchun kerak | ? |

**Agar 8080 yoki 8081 band bo'lsa** — muammo yo'q, keyinroq `.env` faylida
`APP_PORT` va `LANDING_PORT` ni bo'sh portga (masalan 8090 / 8091) o'zgartirasiz.
Boshqa hech narsani tahrirlash shart emas.

Shuningdek konteyner nomlari to'qnashmasligini tekshiring — bizda `shoda-postgres`,
`shoda-backend`, `shoda-frontend`, `shoda-landing`. Agar shunday nomlar allaqachon
bo'lsa (`docker ps -a | grep shoda`), eskilarini o'chiring yoki nomlarni o'zgartiring.

---

## 1-qadam — Kodni serverga yuklash

Loyiha uchun alohida papka ochiladi, boshqa loyihalarga tegilmaydi:

```bash
ssh azizbek_piima@217.76.62.232 'mkdir -p ~/apps/shoda-ai'
```

Endi **o'z kompyuteringizdan** (Mac terminalidan) kodni yuboring:

```bash
cd ~/Documents/shoda_ai

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '.venv' \
  --exclude 'frontend/dist' \
  --exclude '.env' \
  ./ azizbek_piima@217.76.62.232:~/apps/shoda-ai/
```

> `.env` ataylab yuborilmaydi — serverdagi maxfiy sozlamalar lokal fayl bilan
> ustidan yozilib ketmasligi uchun.

---

## 2-qadam — `.env` faylini yaratish

```bash
ssh azizbek_piima@217.76.62.232
cd ~/apps/shoda-ai

cp .env.example .env
# Kuchli parol/kalitlar generatsiya qilib olish:
openssl rand -hex 32   # JWT_SECRET uchun
openssl rand -hex 16   # POSTGRES_PASSWORD uchun

nano .env
```

`.env` ichida to'ldirish kerak bo'lganlar:

```env
POSTGRES_PASSWORD=<yuqorida generatsiya qilingan>
DATABASE_URL=postgresql+psycopg2://shoda:<xuddi o'sha parol>@postgres:5432/shoda
JWT_SECRET=<64 belgili kalit>
BOOTSTRAP_SUPERADMIN_USERNAME=<superadmin login>
BOOTSTRAP_SUPERADMIN_PASSWORD=<kuchli parol>
CORS_ORIGINS=https://shoda.app,https://www.shoda.app,https://ai.shoda.app,https://admin.shoda.app,https://superadmin.shoda.app

# 0-qadamda band bo'lsa — boshqa raqam yozing:
APP_PORT=8080
LANDING_PORT=8081
```

`DATABASE_URL` dagi parol `POSTGRES_PASSWORD` bilan **bir xil** bo'lishi shart.

---

## 3-qadam — Ishga tushirish

```bash
cd ~/apps/shoda-ai

# Faqat shu loyihaning konteynerlari ko'tariladi, boshqalariga tegmaydi
docker compose -f docker-compose.prod.yml up -d --build
```

Birinchi build 3–6 daqiqa oladi (backend Python paketlari + frontend Vite build).

Tekshirish:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 backend

# Ilova javob beryaptimi?
curl -I http://127.0.0.1:8080

# Landing va hisoblagich ishlayaptimi?
curl http://127.0.0.1:8081/api/public/promo
# kutilgan javob: {"total":50,"taken":0,"left":50,"monthly_price_usd":10}
```

Agar `curl` ishlamasa — `docker compose -f docker-compose.prod.yml logs` ni ko'ring.

---

## 4-qadam — Nginx Proxy Manager sozlash (domenlar + SSL)

NPM panelига kiring (odatda `http://217.76.62.232:81`) va **Proxy Hosts** bo'limida
yangi hostlar qo'shing. `Forward Hostname` sifatida server IP ni yozing
(`172.17.0.1` — docker gateway — ham ishlaydi).

| Domain | Forward Host | Port | Izoh |
|---|---|---|---|
| `shoda.app`, `www.shoda.app` | 217.76.62.232 | **8081** | Landing sahifa |
| `ai.shoda.app` | 217.76.62.232 | **8080** | Ilova (login/dashboard) |
| `admin.shoda.app` | 217.76.62.232 | **8080** | Ixtiyoriy |
| `superadmin.shoda.app` | 217.76.62.232 | **8080** | Ixtiyoriy |

Har bir host uchun:
- **Block Common Exploits** ✅
- **Websockets Support** ✅
- **SSL** tabida → *Request a new SSL Certificate* → *Force SSL* ✅ → *HTTP/2* ✅

DNS tomonda `shoda.app` va `ai.shoda.app` A-yozuvlari `217.76.62.232` ga
yo'naltirilgan bo'lishi kerak (SSL olishdan oldin!).

---

## 5-qadam — Yakuniy tekshiruv

```bash
# 1. Landing ochiladimi va hisoblagich to'g'ri sonni ko'rsatyaptimi
curl -s https://shoda.app/api/public/promo

# 2. Ilova ochiladimi
curl -I https://ai.shoda.app/login

# 3. Superadmin bilan kirib ko'ring
#    https://ai.shoda.app/login → .env dagi BOOTSTRAP_SUPERADMIN_* bilan
```

Brauzerda tekshirish ro'yxati:
- [ ] `shoda.app` — landing ochildi, "Bepul qolgan joylar" soni ko'rinyapti
- [ ] "Boshlash" tugmasi → `ai.shoda.app/login` ga o'tdi
- [ ] Ro'yxatdan o'tish ishlayapti, va undan keyin landing hisoblagichi 1 taga kamaydi
- [ ] Admin panel pastida "Created by SuniCode LLC" ko'rinyapti
- [ ] Telegram/Instagram integratsiyasi ulanadi
- [ ] Sozlamalarda Groq modellar ro'yxati yuklanyapti

---

## Keyingi yangilanishlar (kod o'zgarganda)

Mac terminalidan:

```bash
cd ~/Documents/shoda_ai
rsync -avz --delete --exclude '.git' --exclude 'node_modules' \
  --exclude '__pycache__' --exclude '.venv' --exclude 'frontend/dist' --exclude '.env' \
  ./ azizbek_piima@217.76.62.232:~/apps/shoda-ai/

ssh azizbek_piima@217.76.62.232 \
  'cd ~/apps/shoda-ai && docker compose -f docker-compose.prod.yml up -d --build'
```

Faqat landing HTML o'zgargan bo'lsa — build ham kerak emas, rsync yetarli
(landing papka konteynerga mount qilingan, `docker compose restart landing` bilan yangilanadi).

---

## Foydali buyruqlar

```bash
cd ~/apps/shoda-ai

# Loglar
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs --tail=100

# Qayta ishga tushirish (faqat shu loyiha)
docker compose -f docker-compose.prod.yml restart backend

# To'xtatish (boshqa loyihalarga ta'sir qilmaydi)
docker compose -f docker-compose.prod.yml down

# Bazani zaxiralash (backup)
docker exec shoda-postgres pg_dump -U shoda shoda | gzip > ~/shoda-backup-$(date +%F).sql.gz

# Bazani tiklash
gunzip -c ~/shoda-backup-2026-09-02.sql.gz | docker exec -i shoda-postgres psql -U shoda -d shoda
```

---

## Muammo bo'lsa

| Alomat | Sabab | Yechim |
|---|---|---|
| `port is already allocated` | Port band | `.env` da `APP_PORT`/`LANDING_PORT` ni o'zgartiring va qayta `up -d` |
| `Conflict. The container name "/shoda-postgres" is already in use` | Eski konteyner qolgan | `docker rm -f shoda-postgres` |
| Landing ochiladi, lekin hisoblagich "50" da qotib qolgan | `/api/` proxy ishlamayapti | `curl http://127.0.0.1:8081/api/public/promo` ni tekshiring, `docker compose logs landing` |
| 502 Bad Gateway (NPM) | Forward host/port noto'g'ri | NPM'da port `.env` dagi bilan bir xil ekanini tekshiring |
| Backend `alembic upgrade head` da yiqilyapti | DATABASE_URL parol mos emas | `.env` dagi ikkala parolni tenglashtiring |
| Disk to'lgan | Eski docker image'lar | `docker image prune -a` (ehtiyot bo'ling — boshqa loyihalarning ishlatilmayotgan image'lari ham o'chadi) |

---

## Nima o'zgartirildi (deploy uchun)

- `docker-compose.prod.yml` — `name: shoda-ai` (volume/network izolyatsiyasi),
  portlar `.env` orqali sozlanadigan bo'ldi, `landing` xizmati qo'shildi
- `infra/landing-nginx.conf` — landing uchun nginx; `/api/` ni backendga uzatadi,
  shu sababli hisoblagich CORS'siz ishlaydi
- `.env.example` — baza paroli, portlar va domenlar uchun yangi o'zgaruvchilar
- `landing/index.html` — API manzili endi shu domenning o'zidan olinadi
