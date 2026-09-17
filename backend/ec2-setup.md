# QuickPrint Backend — Production Setup

Complete production deployment guide for the QuickPrint backend.

## Production Architecture

```text
                              Internet
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
             qp.mmkerp.shop             qpapi.mmkerp.shop
                    │                           │
                  Vercel                  Elastic IP
                                                │
                                               EC2
                                                │
                                              Nginx
                                           :80 / :443
                                                │
                                                │
                                      127.0.0.1:8000
                                                │
                                          Bun + Express
                                                │
                           ┌────────────────────┼───────────────────┐
                           │                    │                   │
                     RDS PostgreSQL      Supabase Storage       Razorpay
````

### Production domains

| Service               | Domain                      |
| --------------------- | --------------------------- |
| Frontend              | `https://qp.mmkerp.shop`    |
| Backend API           | `https://qpapi.mmkerp.shop` |
| Backend internal port | `127.0.0.1:8000`            |

The backend port `8000` must NOT be publicly exposed.

---

# 1. Production Requirements

## AWS

Use:

* EC2
* Ubuntu 24.04 LTS
* `t3.small` initially
* 20–30 GB `gp3` root storage
* Elastic IP
* Security Group

## External services

QuickPrint uses:

* AWS RDS PostgreSQL (see `docs/rds-migration.md`)
* Supabase Storage
* Razorpay
* Better Auth
* Bun
* Nginx
* Certbot
* WebSocket

If Redis/BullMQ is enabled in the backend, use the configured production Redis service.

---

# 2. EC2 Security Group

Create or use a dedicated security group for the QuickPrint backend.

## Inbound rules

| Type  | Port | Source      | Purpose               |
| ----- | ---: | ----------- | --------------------- |
| SSH   |   22 | My IP `/32` | Server administration |
| HTTP  |   80 | `0.0.0.0/0` | HTTP / Certbot        |
| HTTPS |  443 | `0.0.0.0/0` | Production API        |

Do NOT expose:

```text
3000
8000
8080
5432
6379
```

The backend runs internally on:

```text
127.0.0.1:8000
```

and Nginx exposes it through HTTPS.

---

# 3. Allocate an Elastic IP

An EC2 public IP can change after certain stop/start operations.

Use an Elastic IP for the production backend.

AWS Console:

```text
EC2
→ Network & Security
→ Elastic IPs
→ Allocate Elastic IP address
```

Then:

```text
Elastic IP
→ Actions
→ Associate Elastic IP address
→ Resource type: Instance
→ Select QuickPrint backend EC2
```

Example:

```text
Elastic IP
13.xxx.xxx.xxx
```

Do not hardcode this IP throughout the application.

The Elastic IP should primarily be used by DNS.

---

# 4. DNS

In the DNS provider managing:

```text
mmkerp.shop
```

create:

```text
Type: A
Name: qpapi
Value: YOUR_EC2_ELASTIC_IP
TTL: Auto
```

Result:

```text
qpapi.mmkerp.shop
        ↓
Elastic IP
        ↓
EC2
```

For the frontend:

```text
qp.mmkerp.shop
        ↓
Vercel
```

Use the exact DNS records provided by Vercel for the frontend.

## Verify DNS

From your local computer:

```bash
dig +short qpapi.mmkerp.shop
```

Expected:

```text
YOUR_EC2_ELASTIC_IP
```

Also:

```bash
nslookup qpapi.mmkerp.shop
```

Do not continue with SSL until DNS points to the correct EC2 Elastic IP.

---

# 5. Connect to EC2

From your Mac:

```bash
ssh -i /path/to/YOUR_KEY.pem ubuntu@YOUR_EC2_ELASTIC_IP
```

Example:

```bash
ssh -i ~/Downloads/quickprint-prod.pem ubuntu@13.xxx.xxx.xxx
```

After connecting:

```bash
whoami
```

Expected:

```text
ubuntu
```

Check OS:

```bash
cat /etc/os-release
```

Expected:

```text
Ubuntu 24.04
```

Check architecture:

```bash
uname -m
```

---

# 6. Update Ubuntu

Run on EC2:

```bash
sudo apt update
sudo apt upgrade -y
```

Install required packages:

```bash
sudo apt install -y \
  git \
  curl \
  unzip \
  ca-certificates \
  build-essential \
  nginx \
  certbot \
  python3-certbot-nginx \
  libreoffice
```

Check:

```bash
git --version
curl --version
nginx -v
certbot --version
libreoffice --version
```

LibreOffice is required on the **backend EC2 server** for DOC/DOCX → PDF conversion. It is **not** required on Raspberry Pi kiosks or in the browser client.

---

# 7. Install Bun

Install Bun for the `ubuntu` user.

```bash
curl -fsSL https://bun.com/install | bash
```

Reload shell:

```bash
source ~/.bashrc
```

Verify:

```bash
which bun
bun --version
```

Expected:

```text
/home/ubuntu/.bun/bin/bun
```

If `bun` is not found:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

Then:

```bash
bun --version
```

IMPORTANT:

Do NOT use:

```bash
sudo bun install
```

Bun should be installed and executed as the application user.

---

# 8. Backend Directory

Production backend location:

```text
/opt/quickprint-backend
```

Create `/opt` application directory:

```bash
sudo mkdir -p /opt/quickprint-backend
```

Give ownership to the application user:

```bash
sudo chown -R ubuntu:ubuntu /opt/quickprint-backend
```

Verify:

```bash
ls -ld /opt/quickprint-backend
```

Expected owner:

```text
ubuntu ubuntu
```

---

# 9. Clone Backend Repository

Go to:

```bash
cd /opt
```

Clone the repository:

```bash
sudo -u ubuntu git clone YOUR_BACKEND_GIT_REPOSITORY_URL quickprint-backend
```

If the directory already contains the repository, do not clone again.

Check:

```bash
cd /opt/quickprint-backend
git status
```

Verify:

```bash
ls -la
```

Expected important files:

```text
package.json
bun.lock
src/
drizzle/
...
```

---

# 10. Repository Permissions

The application repository should be owned by `ubuntu`.

Run:

```bash
sudo chown -R ubuntu:ubuntu /opt/quickprint-backend
```

Verify:

```bash
ls -ld /opt/quickprint-backend
ls -l /opt/quickprint-backend/package.json
```

If:

```bash
cd /opt/quickprint-backend
```

returns:

```text
Permission denied
```

check:

```bash
sudo namei -l /opt/quickprint-backend
```

Then fix:

```bash
sudo chown -R ubuntu:ubuntu /opt/quickprint-backend
sudo chmod 755 /opt
sudo chmod 755 /opt/quickprint-backend
```

---

# 11. Production Environment Variables

Create the production environment file:

```bash
cd /opt/quickprint-backend
nano .env
```

DO NOT commit this file to Git.

The production environment must contain the variables required by the actual backend.

Example structure:

```env
NODE_ENV=production

PORT=8000
HOST=127.0.0.1

# Frontend
FRONTEND_URL=https://qp.mmkerp.shop

# Backend
API_URL=https://qpapi.mmkerp.shop

# Database
DATABASE_URL=YOUR_PRODUCTION_DATABASE_URL

# Better Auth
BETTER_AUTH_URL=https://qpapi.mmkerp.shop
BETTER_AUTH_SECRET=YOUR_PRODUCTION_BETTER_AUTH_SECRET

# CORS
CORS_ORIGINS=https://qp.mmkerp.shop

# Storage
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Razorpay
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_WEBHOOK_SECRET

# Redis - only if required by this backend
REDIS_URL=YOUR_PRODUCTION_REDIS_URL

# Email
RESEND_API_KEY=YOUR_RESEND_API_KEY

# Other application secrets
...
```

Use the project's existing `.env.example` as the authoritative list of variables.

Check it:

```bash
cat .env.example
```

Do not invent or remove required variables.

---

# 12. Secure `.env` Permissions

The production `.env` contains secrets.

Run:

```bash
sudo chown ubuntu:ubuntu /opt/quickprint-backend/.env
sudo chmod 600 /opt/quickprint-backend/.env
```

Verify:

```bash
ls -l /opt/quickprint-backend/.env
```

Expected:

```text
-rw------- ubuntu ubuntu .env
```

Never commit `.env`:

```bash
git status
```

Make sure `.env` is ignored by Git.

---

# 13. Install Dependencies

As `ubuntu`:

```bash
cd /opt/quickprint-backend
```

Verify Bun:

```bash
bun --version
```

Install dependencies:

```bash
bun install --frozen-lockfile
```

If the repository does not have a Bun lockfile compatible with the production setup, use the project's documented installation command.

Do NOT use:

```bash
sudo bun install
```

---

# 14. Check Package Scripts

Before starting the production service, inspect:

```bash
cat package.json
```

Find the scripts:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "db:migrate": "..."
  }
}
```

Use the repository's actual production scripts.

Do not assume `db:push` is safe for production.

Production schema changes should use migrations.

---

# 15. Database Migration

Install the RDS CA bundle on EC2 (required for verified TLS):

```bash
sudo mkdir -p /etc/ssl/rds
sudo curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  -o /etc/ssl/rds/global-bundle.pem
```

Make sure `.env` points to production RDS (no `sslmode` in the URL):

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/quickprint
```

Full Neon → RDS cutover guide: [`docs/rds-migration.md`](../docs/rds-migration.md)

From `backend/` on EC2 (with `.env` loaded):

```bash
cd /opt/quickprint-backend
bun run auth:migrate
bun run db:apply
bun run db:ping
```

- `auth:migrate` — Better Auth tables
- `db:apply` — idempotent additive SQL in `drizzle/*.sql`
- `db:ping` — verify connectivity (does not print password or full URL)

`db:migrate` (Drizzle Kit) has no generated migrations in the journal yet; use `db:apply` for additive schema changes.

After migration, verify the application database connection.

---

# 16. Test Backend Before Nginx

Start the backend manually using the project's production start command.

Example:

```bash
bun run start
```

The backend should listen on:

```text
127.0.0.1:8000
```

From another EC2 terminal:

```bash
curl http://127.0.0.1:8000/health
```

Expected successful response should be the project's health response.

If your health endpoint is different, use the actual endpoint defined by the backend.

Stop the manually running process after verification.

---

# 17. Backend Bind Address

Production backend should listen on:

```text
127.0.0.1
```

not:

```text
0.0.0.0
```

when Nginx is the public entry point.

Recommended:

```env
HOST=127.0.0.1
PORT=8000
```

Architecture:

```text
Internet
   ↓
443
   ↓
Nginx
   ↓
127.0.0.1:8000
   ↓
Bun + Express
```

Port `8000` is therefore not directly accessible from the internet.

---

# 18. Create systemd Service

Create:

```bash
sudo nano /etc/systemd/system/quickprint-backend.service
```

Use:

```ini
[Unit]
Description=QuickPrint Backend API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple

User=ubuntu
Group=ubuntu

WorkingDirectory=/opt/quickprint-backend

EnvironmentFile=/opt/quickprint-backend/.env

ExecStart=/home/ubuntu/.bun/bin/bun run start

Restart=always
RestartSec=5

KillSignal=SIGTERM
TimeoutStopSec=30

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

IMPORTANT:

If `which bun` returns a different path, update:

```ini
ExecStart=...
```

Use:

```bash
which bun
```

to find the actual path.

---

# 19. Enable Backend Service

Reload systemd:

```bash
sudo systemctl daemon-reload
```

Enable on boot:

```bash
sudo systemctl enable quickprint-backend
```

Start:

```bash
sudo systemctl start quickprint-backend
```

## Refund worker + Redis (production)

Install Redis locally on EC2 (do **not** expose port 6379 publicly):

```bash
sudo apt update
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

Add to `/opt/quickprint/backend/.env`:

```bash
REDIS_URL=redis://127.0.0.1:6379
```

Copy the refund worker unit from the repo and enable it:

```bash
sudo cp /opt/quickprint/backend/deploy/quickprint-refund-worker.service \
  /etc/systemd/system/quickprint-refund-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now quickprint-refund-worker
sudo journalctl -u quickprint-refund-worker -f
```

After deploys that change refund logic:

```bash
cd /opt/quickprint/backend
git pull --ff-only
bun install --frozen-lockfile
bun run db:apply
sudo systemctl restart quickprint-refund-worker
```

Check:

```bash
sudo systemctl status quickprint-backend
sudo systemctl status quickprint-refund-worker
```

Expected:

```text
Active: active (running)
```

---

# 20. Backend Logs

View live logs:

```bash
sudo journalctl -u quickprint-backend -f
```

View recent logs:

```bash
sudo journalctl -u quickprint-backend -n 100 --no-pager
```

Check service state:

```bash
sudo systemctl is-active quickprint-backend
```

Expected:

```text
active
```

---

# 21. Test Internal Backend

On EC2:

```bash
curl http://127.0.0.1:8000/health
```

If successful:

```text
Bun/Express
    ↓
127.0.0.1:8000
    ↓
Healthy
```

If this fails, fix the backend before configuring Nginx.

---

# 22. Nginx Configuration

Create:

```bash
sudo nano /etc/nginx/sites-available/qpapi.mmkerp.shop
```

Use:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name qpapi.mmkerp.shop;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

This configuration supports both normal HTTP API requests and WebSocket connections.

---

# 23. Enable Nginx Site

Run:

```bash
sudo ln -s /etc/nginx/sites-available/qpapi.mmkerp.shop \
  /etc/nginx/sites-enabled/qpapi.mmkerp.shop
```

Disable the default site if necessary:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test configuration:

```bash
sudo nginx -t
```

Expected:

```text
syntax is ok
test is successful
```

Reload:

```bash
sudo systemctl reload nginx
```

Enable Nginx on boot:

```bash
sudo systemctl enable nginx
```

Check:

```bash
sudo systemctl status nginx
```

---

# 24. Test HTTP Domain

From your local computer:

```bash
curl -I http://qpapi.mmkerp.shop
```

Nginx should respond.

If the backend health endpoint is:

```text
/health
```

test:

```bash
curl http://qpapi.mmkerp.shop/health
```

At this point:

```text
qpapi.mmkerp.shop
        ↓
Elastic IP
        ↓
EC2 :80
        ↓
Nginx
        ↓
127.0.0.1:8000
```

---

# 25. Install SSL Certificate

Once DNS and HTTP are working, request the certificate.

Run on EC2:

```bash
sudo certbot --nginx -d qpapi.mmkerp.shop
```

Certbot will configure HTTPS.

Choose the option to redirect HTTP to HTTPS when prompted.

After completion:

```bash
sudo nginx -t
```

Then:

```bash
sudo systemctl reload nginx
```

---

# 26. Test HTTPS

From your local computer:

```bash
curl https://qpapi.mmkerp.shop/health
```

Expected:

```text
Successful health response
```

Also:

```bash
curl -I https://qpapi.mmkerp.shop
```

The certificate should be valid for:

```text
qpapi.mmkerp.shop
```

---

# 27. HTTP → HTTPS

Verify:

```bash
curl -I http://qpapi.mmkerp.shop
```

Expected:

```text
301
```

or another redirect response pointing to:

```text
https://qpapi.mmkerp.shop
```

Production traffic should use:

```text
https://qpapi.mmkerp.shop
```

not:

```text
http://qpapi.mmkerp.shop
```

---

# 28. Certificate Renewal

Check:

```bash
sudo systemctl status certbot.timer
```

Test renewal without changing the certificate:

```bash
sudo certbot renew --dry-run
```

Expected:

```text
Congratulations, all simulated renewals succeeded
```

Do not manually renew certificates every time.

Certbot's system timer handles renewal.

---

# 29. Production CORS

The backend should allow the production frontend:

```text
https://qp.mmkerp.shop
```

Example:

```env
CORS_ORIGINS=https://qp.mmkerp.shop
```

Do not use:

```text
*
```

for production authenticated APIs.

Do not leave development origins enabled unnecessarily.

Development may use:

```text
http://localhost:3000
```

Production should use:

```text
https://qp.mmkerp.shop
```

---

# 30. Better Auth Production Configuration

Production frontend:

```env
NEXT_PUBLIC_API_URL=https://qpapi.mmkerp.shop
NEXT_PUBLIC_BETTER_AUTH_URL=https://qpapi.mmkerp.shop
```

Backend:

```env
BETTER_AUTH_URL=https://qpapi.mmkerp.shop
```

Use a strong production:

```env
BETTER_AUTH_SECRET=YOUR_PRODUCTION_SECRET
```

The production secret must be different from development.

Do not use:

```text
localhost
```

or:

```text
10.x.x.x
```

for production authentication URLs.

---

# 31. Cookie / HTTPS Requirements

Production authentication cookies should work over:

```text
https://qp.mmkerp.shop
```

and:

```text
https://qpapi.mmkerp.shop
```

The backend must correctly trust the HTTPS proxy configuration used by Nginx.

Make sure the backend receives:

```http
X-Forwarded-Proto: https
```

Nginx already sends:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

Do not disable secure cookies in production just to make authentication work.

---

# 32. WebSocket Configuration

QuickPrint uses WebSocket communication.

The client should connect through the production backend:

```text
wss://qpapi.mmkerp.shop/...
```

not:

```text
ws://...
```

and not:

```text
ws://10.x.x.x:8000/...
```

Nginx must include:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Already included in the Nginx configuration above.

---

# 33. WebSocket Test

After deployment, verify:

```text
Browser
   ↓
wss://qpapi.mmkerp.shop
   ↓
Nginx :443
   ↓
127.0.0.1:8000
   ↓
Bun WebSocket server
```

Check backend logs:

```bash
sudo journalctl -u quickprint-backend -f
```

Then open the QuickPrint frontend and test the WebSocket-dependent features.

---

# 34. Production Frontend Environment

Vercel project:

```text
qp.mmkerp.shop
```

Set:

```env
NEXT_PUBLIC_API_URL=https://qpapi.mmkerp.shop
NEXT_PUBLIC_BETTER_AUTH_URL=https://qpapi.mmkerp.shop
```

Do not use:

```env
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP:8000
```

Do not use:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Redeploy Vercel after changing environment variables.

---

# 35. Raspberry Pi Production Configuration

The Raspberry Pi must use the production backend.

Print agent:

```env
API_URL=https://qpapi.mmkerp.shop
AGENT_SECRET=YOUR_AGENT_SECRET
KIOSK_CODE=KIOSK-001
```

Display:

```env
KIOSK_CODE=KIOSK-001
KIOSK_DISPLAY_NAME=QuickPrint
API_URL=https://qpapi.mmkerp.shop
DISPLAY_URL=https://qp.mmkerp.shop/kiosk/KIOSK-001
DISPLAY_TOKEN=YOUR_DISPLAY_TOKEN
```

Important:

The Pi must NOT use:

```text
10.x.x.x
192.168.x.x
localhost
```

for the production backend.

It should use:

```text
https://qpapi.mmkerp.shop
```

This allows the kiosk to work from college Wi-Fi without requiring direct LAN access to the EC2 server.

---

# 36. Pi Security Separation

The following secrets must remain separate:

```text
AGENT_SECRET
    ↓
Print Agent only

DISPLAY_TOKEN
    ↓
Display bootstrap only

BETTER_AUTH_SECRET
    ↓
Backend only
```

Never put:

```text
AGENT_SECRET
```

into frontend code.

Never put:

```text
DISPLAY_TOKEN
```

into the permanent display URL.

Never expose backend secrets through Next.js public environment variables.

---

# 37. Application Health Check

The production health endpoint should be accessible:

```text
https://qpapi.mmkerp.shop/health
```

Test:

```bash
curl https://qpapi.mmkerp.shop/health
```

The health endpoint should verify the application is running.

If the project has separate database/Redis health checks, keep those according to the backend's existing implementation.

---

# 38. Verify Services

Check backend:

```bash
sudo systemctl status quickprint-backend
```

Check Nginx:

```bash
sudo systemctl status nginx
```

Check certificate timer:

```bash
sudo systemctl status certbot.timer
```

All required services should be running.

---

# 39. Check Listening Ports

Run:

```bash
sudo ss -lntp
```

Expected architecture:

```text
127.0.0.1:8000     Bun backend
0.0.0.0:80         Nginx
0.0.0.0:443        Nginx
```

Port `8000` should NOT be listening publicly as:

```text
0.0.0.0:8000
```

If it is, fix the backend host configuration.

---

# 40. Verify Firewall / Security Group

AWS Security Group should contain only the required public ports:

```text
22   → My IP
80   → 0.0.0.0/0
443  → 0.0.0.0/0
```

Application ports remain private:

```text
8000
5432
6379
```

Do not add them to the AWS Security Group.

---

# 41. First Production Deployment Test

Perform tests in this order.

## Test 1 — DNS

```bash
dig +short qpapi.mmkerp.shop
```

Must return the EC2 Elastic IP.

## Test 2 — Backend locally

On EC2:

```bash
curl http://127.0.0.1:8000/health
```

## Test 3 — Nginx

```bash
curl http://qpapi.mmkerp.shop/health
```

## Test 4 — HTTPS

```bash
curl https://qpapi.mmkerp.shop/health
```

## Test 5 — Authentication

Open:

```text
https://qp.mmkerp.shop
```

Test login/session.

## Test 6 — WebSocket

Verify the frontend receives real-time events.

## Test 7 — QR

Scan a kiosk QR from a phone.

## Test 8 — Payment

Complete the Razorpay test/production flow according to the configured environment.

## Test 9 — Pi

Verify:

```text
Phone
  ↓
Backend
  ↓
Pi WebSocket
  ↓
Print Agent
  ↓
CUPS
  ↓
Printer
```

## Test 10 — Kiosk display

Verify:

```text
IDLE
 ↓
PREPARED
 ↓
PRINTING
 ↓
COMPLETED
 ↓
IDLE
```

The display must not expose:

* student name
* email
* phone
* filename
* payment information
* CUPS job ID
* storage URL
* internal errors
* backend secrets

---

# 42. Production Deployment / Update

When new backend code is pushed to Git:

SSH into EC2:

```bash
ssh -i /path/to/YOUR_KEY.pem ubuntu@YOUR_EC2_ELASTIC_IP
```

Go to the application:

```bash
cd /opt/quickprint-backend
```

Check current state:

```bash
git status
```

Fetch latest code:

```bash
git pull --ff-only
```

Install dependencies:

```bash
bun install --frozen-lockfile
```

If the project has a build step:

```bash
bun run build
```

Run database migrations if this release contains migrations:

```bash
bun run auth:migrate
bun run db:apply
```

Restart:

```bash
sudo systemctl restart quickprint-backend
```

Check:

```bash
sudo systemctl status quickprint-backend
```

Test:

```bash
curl https://qpapi.mmkerp.shop/health
```

Then check logs:

```bash
sudo journalctl -u quickprint-backend -n 100 --no-pager
```

---

# 43. Safe Deployment Order

Use this order for production updates:

```text
1. git pull
2. bun install --frozen-lockfile
3. bun run build        # if required
4. database migration   # if required
5. restart service
6. health check
7. inspect logs
8. test frontend
9. test WebSocket
```

Never restart the backend before installing the required dependencies for a release.

---

# 44. Rollback

If a deployment fails:

Check:

```bash
git log --oneline -10
```

Find the previous working commit.

Example:

```bash
git checkout PREVIOUS_WORKING_COMMIT
```

Then:

```bash
bun install --frozen-lockfile
```

Build if required:

```bash
bun run build
```

Restart:

```bash
sudo systemctl restart quickprint-backend
```

Verify:

```bash
sudo systemctl status quickprint-backend
curl https://qpapi.mmkerp.shop/health
```

IMPORTANT:

Database migrations require special rollback planning.

Do not blindly downgrade the database schema.

---

# 45. Backend Logs

Live:

```bash
sudo journalctl -u quickprint-backend -f
```

Last 100 lines:

```bash
sudo journalctl -u quickprint-backend -n 100 --no-pager
```

Today's logs:

```bash
sudo journalctl -u quickprint-backend --since today
```

Nginx access log:

```bash
sudo tail -f /var/log/nginx/access.log
```

Nginx error log:

```bash
sudo tail -f /var/log/nginx/error.log
```

Never log:

```text
Authorization headers
Bearer tokens
cookies
session tokens
DISPLAY_TOKEN
AGENT_SECRET
Better Auth secrets
Razorpay secret
Supabase service-role key
database password
```

---

# 46. Common Problems

## Problem: `bun: command not found`

Check:

```bash
which bun
```

If Bun was installed using the Ubuntu user's home:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

Then:

```bash
bun --version
```

For systemd, use the absolute Bun path:

```bash
which bun
```

Example:

```text
/home/ubuntu/.bun/bin/bun
```

Then:

```ini
ExecStart=/home/ubuntu/.bun/bin/bun run start
```

---

## Problem: `Permission denied` in `/opt/quickprint-backend`

Run:

```bash
sudo chown -R ubuntu:ubuntu /opt/quickprint-backend
```

Then:

```bash
sudo chmod 755 /opt/quickprint-backend
```

Test:

```bash
cd /opt/quickprint-backend
ls -la
```

---

## Problem: Backend service fails

Run:

```bash
sudo systemctl status quickprint-backend
```

Then:

```bash
sudo journalctl -u quickprint-backend -n 200 --no-pager
```

Common causes:

* incorrect `.env`
* incorrect Bun path
* missing dependency
* database connection failure
* Redis connection failure
* migration failure
* incorrect start script
* incorrect port
* incorrect working directory

---

## Problem: Nginx returns `502 Bad Gateway`

Check backend:

```bash
sudo systemctl status quickprint-backend
```

Check:

```bash
curl http://127.0.0.1:8000/health
```

If this fails, the problem is the backend.

If this works, check Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

Then:

```bash
sudo tail -f /var/log/nginx/error.log
```

---

## Problem: HTTPS does not work

Check DNS:

```bash
dig +short qpapi.mmkerp.shop
```

Check port:

```bash
sudo ss -lntp | grep ':443'
```

Check Nginx:

```bash
sudo nginx -t
```

Check certificate:

```bash
sudo certbot certificates
```

Test:

```bash
curl -v https://qpapi.mmkerp.shop/health
```

---

## Problem: WebSocket does not connect

Verify Nginx contains:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Check backend logs:

```bash
sudo journalctl -u quickprint-backend -f
```

Check frontend is using:

```text
wss://qpapi.mmkerp.shop
```

not:

```text
ws://qpapi.mmkerp.shop
```

---

## Problem: Authentication cookie is not sent

Verify:

```text
Frontend:
https://qp.mmkerp.shop

Backend:
https://qpapi.mmkerp.shop
```

Frontend environment:

```env
NEXT_PUBLIC_API_URL=https://qpapi.mmkerp.shop
NEXT_PUBLIC_BETTER_AUTH_URL=https://qpapi.mmkerp.shop
```

Backend:

```env
BETTER_AUTH_URL=https://qpapi.mmkerp.shop
```

Check the browser's cookie configuration.

Do not solve production cookie issues by disabling secure cookies.

---

# 47. EC2 Reboot Test

After everything is working, test automatic recovery.

Before reboot:

```bash
sudo systemctl status quickprint-backend
sudo systemctl status nginx
```

Reboot:

```bash
sudo reboot
```

Reconnect after the instance comes back:

```bash
ssh -i /path/to/YOUR_KEY.pem ubuntu@YOUR_EC2_ELASTIC_IP
```

Check:

```bash
sudo systemctl status quickprint-backend
sudo systemctl status nginx
```

Then:

```bash
curl https://qpapi.mmkerp.shop/health
```

Both services should automatically start.

---

# 48. Important: Elastic IP After Reboot

The production DNS record:

```text
qpapi.mmkerp.shop
```

points to:

```text
EC2 Elastic IP
```

The Elastic IP remains associated with the instance across normal stop/start operations.

Do not change the DNS record after every reboot.

If the EC2 instance is replaced, associate the existing Elastic IP with the replacement instance.

---

# 49. Production Environment Separation

Never mix development and production configuration.

## Development

Example:

```text
localhost
LAN IP
development database
development Razorpay
development secrets
```

## Production

```text
https://qp.mmkerp.shop
https://qpapi.mmkerp.shop
production RDS PostgreSQL
production Supabase
production Razorpay
production secrets
```

The EC2 production server must never depend on:

```text
10.x.x.x
192.168.x.x
localhost
Mac
developer machine
mobile hotspot
college Wi-Fi
```

for production operation.

---

# 50. Git Rules

Never commit:

```text
.env
.env.production
*.pem
private keys
API secrets
database credentials
Razorpay secrets
Supabase service keys
Better Auth secrets
AGENT_SECRET
DISPLAY_TOKEN
```

Verify:

```bash
git status
```

Before pushing:

```bash
git diff
```

Check:

```bash
git ls-files | grep -E '(^|/)\.env'
```

Production secrets must remain outside Git.

---

# 51. Final Production Architecture

```text
                         USER PHONE
                              │
                              │ HTTPS
                              ▼
                    https://qp.mmkerp.shop
                              │
                           Vercel
                              │
                              │ HTTPS API
                              ▼
                  https://qpapi.mmkerp.shop
                              │
                         Elastic IP
                              │
                              ▼
                         AWS EC2
                              │
                         ┌────┴────┐
                         │  Nginx │
                         │ :80/443│
                         └────┬────┘
                              │
                    127.0.0.1:8000
                              │
                              ▼
                     Bun + Express
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
     RDS PostgreSQL   Supabase Storage   Razorpay
             │
             │
             ▼
       QuickPrint Data
                              │
                              │ WebSocket
                              ▼
                    Raspberry Pi Agent
                              │
                              ▼
                            CUPS
                              │
                              ▼
                          PRINTER
```

---

# 52. Production URLs

Final production configuration:

```text
Frontend
https://qp.mmkerp.shop

Backend
https://qpapi.mmkerp.shop

Health
https://qpapi.mmkerp.shop/health

Kiosk
https://qp.mmkerp.shop/kiosk/KIOSK-001

Kiosk scan
https://qp.mmkerp.shop/scan/{publicToken}
```

---

# 53. Production Checklist

## AWS

* [ ] Ubuntu 24.04 EC2 created
* [ ] `t3.small` or appropriate instance selected
* [ ] 20–30 GB gp3 storage
* [ ] Security Group created
* [ ] SSH restricted to My IP
* [ ] HTTP 80 enabled
* [ ] HTTPS 443 enabled
* [ ] 8000 NOT publicly exposed
* [ ] Elastic IP allocated
* [ ] Elastic IP associated with EC2

## DNS

* [ ] `qpapi.mmkerp.shop` A record created
* [ ] A record points to Elastic IP
* [ ] `qp.mmkerp.shop` configured for Vercel
* [ ] DNS verified with `dig`

## EC2

* [ ] Ubuntu updated
* [ ] Git installed
* [ ] Bun installed
* [ ] Nginx installed
* [ ] Certbot installed
* [ ] `/opt/quickprint-backend` created
* [ ] Repository cloned
* [ ] Repository owned by `ubuntu`
* [ ] Production `.env` created
* [ ] `.env` permissions set to `600`

## Backend

* [ ] Dependencies installed
* [ ] Production database configured
* [ ] Database migration completed
* [ ] Production start command verified
* [ ] Backend listens on `127.0.0.1:8000`
* [ ] Health endpoint works
* [ ] systemd service created
* [ ] systemd service enabled
* [ ] systemd service running

## Nginx

* [ ] `qpapi.mmkerp.shop` server block created
* [ ] Nginx configuration tested
* [ ] HTTP works
* [ ] WebSocket proxy configured
* [ ] HTTPS certificate installed
* [ ] HTTP redirects to HTTPS
* [ ] Certificate renewal tested

## Frontend

* [ ] `NEXT_PUBLIC_API_URL=https://qpapi.mmkerp.shop`
* [ ] `NEXT_PUBLIC_BETTER_AUTH_URL=https://qpapi.mmkerp.shop`
* [ ] Vercel deployment successful
* [ ] `qp.mmkerp.shop` working
* [ ] Authentication working
* [ ] WebSocket working

## QuickPrint

* [ ] Phone QR flow working
* [ ] Guest/auth session working
* [ ] File upload working
* [ ] Razorpay working
* [ ] Job creation working
* [ ] Pi receives job
* [ ] Pi status updates reach backend
* [ ] CUPS receives job
* [ ] Printer prints
* [ ] Kiosk display updates
* [ ] Kiosk returns to IDLE
* [ ] No sensitive information appears on kiosk display

## Recovery

* [ ] EC2 reboot tested
* [ ] Backend automatically starts
* [ ] Nginx automatically starts
* [ ] HTTPS still works
* [ ] Health endpoint works
* [ ] WebSocket reconnects
* [ ] Pi reconnects
* [ ] Print job recovery behavior verified

---

# 54. Useful Commands

## Backend service

```bash
sudo systemctl start quickprint-backend
sudo systemctl stop quickprint-backend
sudo systemctl restart quickprint-backend
sudo systemctl status quickprint-backend
sudo systemctl enable quickprint-backend
```

## Backend logs

```bash
sudo journalctl -u quickprint-backend -f
sudo journalctl -u quickprint-backend -n 100 --no-pager
```

## Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo systemctl status nginx
```

## SSL

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## Ports

```bash
sudo ss -lntp
```

## DNS

```bash
dig +short qpapi.mmkerp.shop
```

## Health

```bash
curl http://127.0.0.1:8000/health
curl https://qpapi.mmkerp.shop/health
```

## Git

```bash
cd /opt/quickprint-backend
git status
git log --oneline -10
git pull --ff-only
```

---

# 55. Deployment Principle

The production server should follow this rule:

```text
Internet
   │
   │ HTTPS :443
   ▼
Nginx
   │
   │ HTTP localhost
   ▼
Bun + Express
   │
   ├── RDS PostgreSQL
   ├── Supabase
   ├── Razorpay
   ├── Redis (if configured)
   └── WebSocket
```

Only Nginx is internet-facing.

The Bun/Express application remains private on:

```text
127.0.0.1:8000
```

This is the required production topology for QuickPrint.

```
```
