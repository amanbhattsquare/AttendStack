# AttendStack Server Configuration - Quick Reference
**Last Updated:** May 20, 2026

---

## 🚀 FOUND CONFIGURATION FILES

### ✅ ACTIVE CONFIGURATIONS

#### 1. **NGINX** (Primary Reverse Proxy)
- **Main Config:** `/etc/nginx/nginx.conf`
- **Active Site:** `/etc/nginx/sites-enabled/attendance.nextgenapplication.com`
- **Status:** ✅ Running on ports 80 (HTTP redirect) and 443 (HTTPS)
- **SSL Certificates:** `/etc/letsencrypt/live/attendance.nextgenapplication.com/`

#### 2. **SYSTEMD SERVICES** (Process Management)
- **Backend Service:** `/etc/systemd/system/attendstack-backend.service`
  - Runs Gunicorn on 127.0.0.1:8001
  - 3 workers
  - Django REST API
  - Auto-restart enabled
  
- **PM2 Service:** `/etc/systemd/system/pm2-squarefit.service`
  - Manages PM2 for squarefit user
  - Auto-resurrects processes on boot
  - Unlimited resource limits

#### 3. **PM2** (Frontend Process Manager)
- **Config Dir:** `~/.pm2/` (`/home/squarefit/.pm2/`)
- **Dump File:** `~/.pm2/dump.pm2`
- **Process:** `attendstack-frontend` running on port 3003
- **Log Files:**
  - `/home/squarefit/.pm2/logs/attendstack-frontend-out.log`
  - `/home/squarefit/.pm2/logs/attendstack-frontend-error.log`
- **Uptime:** 90+ minutes (as of scan)

#### 4. **GUNICORN** (Python WSGI Server)
- **Script:** `/home/squarefit/AttendStack/backend/gunicorn_start.sh`
- **Bound to:** 127.0.0.1:8001
- **Workers:** 3
- **Managed by:** systemd (attendstack-backend.service)

---

### ⚠️ INSTALLED BUT NOT ACTIVE

#### 1. **APACHE** (Web Server)
- **Config Dir:** `/etc/apache2/`
- **Sites Available:** `/etc/apache2/sites-available/`
  - Default site
  - gymproject (HTTP & HTTPS)
  - testing (HTTP & HTTPS)
  - **NOTE:** Not used for AttendStack
- **Status:** Installed but not in use for this deployment

---

### ❌ NOT FOUND/NOT INSTALLED

- **Docker:** No docker-compose.yml or Dockerfile (except in dependencies)
- **HAProxy:** Not installed
- **kubernetes:** Not configured
- **Systemd user services:** Not found in `~/.config/systemd/user/`
- **Ecosystem files:** No `ecosystem.config.js` found

---

## 📊 ARCHITECTURE AT A GLANCE

```
┌─────────────────────────┐
│  Client (Internet)      │
│  attendance.next...com  │
└────────────┬────────────┘
             │
             │ HTTPS:443
             │ HTTP:80 → HTTPS redirect
             ▼
        ┌─────────────┐
        │   NGINX     │
        │ (Reverse    │
        │  Proxy)     │
        └────┬────────┘
             │
      ┌──────┴──────┐
      │             │
  /api, /admin      /
  ▼                 ▼
Gunicorn        Next.js
:8001 (3        :3003
workers) (PM2)
 │              │
Django       Node.js
REST API    v24.13.0
 │
PostgreSQL
```

---

## 🔧 CRITICAL FILE PATHS

| Purpose | File Path | Type |
|---------|-----------|------|
| **Web Server Entry** | `/etc/nginx/nginx.conf` | Nginx Config |
| **Production Site** | `/etc/nginx/sites-enabled/attendance.nextgenapplication.com` | Nginx Config |
| **Backend Service** | `/etc/systemd/system/attendstack-backend.service` | Systemd |
| **Frontend Service** | `/etc/systemd/system/pm2-squarefit.service` | Systemd |
| **Frontend Config** | `/home/squarefit/.pm2/dump.pm2` | PM2 Dump |
| **Backend Startup** | `/home/squarefit/AttendStack/backend/gunicorn_start.sh` | Shell Script |
| **SSL Certificates** | `/etc/letsencrypt/live/attendance.nextgenapplication.com/` | Letsencrypt |
| **Static Files** | `/var/www/attendstack/static/` | Nginx Serving |
| **Media Files** | `/home/squarefit/AttendStack/backend/media/` | Django Media |

---

## 📋 SERVICE STATUS COMMANDS

```bash
# Check all services
sudo systemctl status attendstack-backend          # Backend
pm2 list                                           # Frontend
sudo systemctl status nginx                        # Web Server

# View logs in real-time
sudo journalctl -u attendstack-backend -f         # Backend logs
pm2 logs attendstack-frontend                      # Frontend logs
sudo tail -f /var/log/nginx/access.log            # Access logs
sudo tail -f /var/log/nginx/error.log             # Error logs

# Restart services
sudo systemctl restart nginx
sudo systemctl restart attendstack-backend
pm2 restart attendstack-frontend

# Test Nginx config
sudo nginx -t

# Check listening ports
sudo netstat -tlnp | grep -E '(80|443|8001|3003)'
```

---

## 🔐 SSL/TLS CONFIGURATION

**Certificate Authority:** Let's Encrypt
**Domain:** attendance.nextgenapplication.com
**Certificate Path:** `/etc/letsencrypt/live/attendance.nextgenapplication.com/`
**Key Files:**
- `fullchain.pem` (certificate chain)
- `privkey.pem` (private key)
- `/etc/letsencrypt/ssl-dhparams.pem` (DH parameters for PFS)

**HSTS:** Enabled with 1-year max-age
**Security Headers:**
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN

---

## 🚨 IMPORTANT NOTES

1. **No Docker/Containerization:** Application runs directly on host
2. **Port Binding:** 
   - Public: 80/443 (Nginx)
   - Internal: 8001 (Django/Gunicorn), 3003 (Next.js/PM2)
3. **Process Managers:** 
   - systemd for Django backend
   - PM2 for Next.js frontend
4. **Auto-restart:** Both backends configured to restart on failure
5. **Static Serving:** Nginx serves static files with 30-day cache
6. **API Routing:** `/api` and `/admin` routes to Django, `/` routes to Next.js
7. **Database:** PostgreSQL (configured in Django settings)

---

## 📁 File Count Summary

| Category | Count | Status |
|----------|-------|--------|
| Nginx Sites Available | 8 | 6 enabled |
| Nginx Sites Enabled | 6 | 1 active (attendstack) |
| Apache Sites Available | 6 | 4 enabled (not for attendstack) |
| PM2 Processes | 1 | Active |
| Systemd Services (attendstack) | 2 | 1 active |
| SSL Certificates | 1 domain | Valid |
| Docker Configs | 0 | None in workspace |

---

## 🔍 VERIFICATION CHECKLIST

- [x] Nginx configuration found and documented
- [x] Django backend systemd service found
- [x] PM2 frontend configuration found
- [x] SSL certificates configured (Let's Encrypt)
- [x] Gunicorn startup script found
- [x] PM2 process dump found
- [x] Security headers configured
- [x] Static file serving configured
- [x] Process management setup verified
- [ ] Docker configuration (not used)
- [ ] HAProxy configuration (not installed)
- [ ] Apache for attendstack (not used)

---

**Full detailed report available in:** `SERVER_CONFIGURATION_REPORT.md`
