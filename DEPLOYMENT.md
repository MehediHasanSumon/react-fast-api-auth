# 🚀 Automated CI/CD & Production Deployment Guide

This repository is equipped with a complete, automated Continuous Integration (CI) and Continuous Deployment (CD) pipeline using **GitHub Actions**, **Docker containerization**, and **VPS Auto-Deploy via SSH**.

---

## 1. Architecture Overview

```mermaid
flowchart TD
    subgraph GitHub ["GitHub Repository"]
        Push[Push / Merge to main] --> CI_Pipeline[GitHub Actions CI]
        subgraph CI ["Continuous Integration"]
            direction TB
            BE_Test["Backend: Python 3.12 + Pytest + Alembic Migrations"]
            FE_Test["Frontend: Node 24 + Oxlint + TypeCheck + Vite Build"]
            Docker_Check["Docker: Validate Backend & Frontend Images"]
            BE_Test --> CI_Check{All Pass?}
            FE_Test --> CI_Check
            Docker_Check --> CI_Check
        end
        CI_Check -->|Success| CD_Pipeline[GitHub Actions CD]
    end

    subgraph Server ["Live Production Server (VPS)"]
        CD_Pipeline -->|Secure SSH| DeployRunner[deploy.sh Execution]
        DeployRunner --> GitUpdate[git pull origin main]
        DeployRunner --> DockerBuild[docker compose build]
        DeployRunner --> Migrations[Alembic Database Migrations]
        DeployRunner --> RollingRestart[Zero-Downtime Rolling Update]
        DeployRunner --> HealthCheck[Verify /nginx-health & /api/v1/health]
    end
```

---

## 2. GitHub Secrets Setup (Required for Auto-Deploy)

To enable automatic deployment, go to your GitHub repository:
**Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ Click **New repository secret**.

Add the following 4 secrets:

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `SERVER_HOST` | The public IP address or domain name of your VPS | `192.0.2.1` or `api.hospital.com` |
| `SERVER_USER` | The SSH username on the server | `root` or `ubuntu` |
| `SERVER_SSH_KEY` | The private SSH key used to log in (PEM or OpenSSH format) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SERVER_SSH_PORT` | *(Optional)* SSH port if different from default | `22` |
| `SERVER_APP_DIR` | *(Optional)* Application path on server | `/var/www/hospital` (default) |

> [!TIP]
> **Generating an SSH Key for GitHub Actions**:
> On your server, you can generate a dedicated deployment key pair:
> ```bash
> ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions
> cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
> chmod 600 ~/.ssh/authorized_keys
> ```
> Then copy the content of `~/.ssh/github_actions` (the private key) into the `SERVER_SSH_KEY` GitHub secret.

---

## 3. One-Time Production Server Setup (VPS)

Follow these steps once on your live Ubuntu/Debian server:

### Step 1: Install Docker & Docker Compose
```bash
sudo apt update
sudo apt install -y git curl docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### Step 2: Clone the Repository to the Server
```bash
sudo mkdir -p /var/www/hospital
sudo chown -R $USER:$USER /var/www/hospital
git clone https://github.com/MehediHasanSumon/hospital.git /var/www/hospital
cd /var/www/hospital
```

### Step 3: Configure Production Environment Variables
```bash
cp .env.example .env
nano .env
```
Ensure you set:
- `SECRET_KEY`: A strong 64-character random string (`python3 -c "import secrets; print(secrets.token_urlsafe(48))"`).
- `POSTGRES_PASSWORD`: A secure password for PostgreSQL.
- `COOKIE_SECURE=true`: When served over HTTPS.
- `RUN_SEEDS=true`: *(Only on the very first deploy to populate admin user & sample data)*.

### Step 4: Run Initial Deployment
```bash
./deploy.sh
```

### Step 5: Host Nginx & SSL Configuration (HTTPS Reverse Proxy)
On your host server (e.g. `/etc/nginx/sites-available/mehedih.tech`), configure Nginx to proxy traffic to the Docker container (`127.0.0.1:8080`) and forward HTTPS headers:
```nginx
server {
    server_name mehedih.tech;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```
Then enable SSL using Certbot:
```bash
sudo certbot --nginx -d mehedih.tech
```

---

## 4. How the Auto-Deploy Flow Works

1. **Every commit to `main`**:
   - GitHub Actions automatically runs the **CI Pipeline**:
     - Tests backend with Python 3.12, spins up a PostgreSQL service container, runs migrations and pytest.
     - Tests frontend with Node.js 24, runs Oxlint, TypeScript type checks, and compiles Vite production assets.
     - Validates that Docker images build cleanly.
2. **If CI passes**:
   - The **CD Pipeline** triggers automatically.
   - Connects to your server via SSH using your GitHub secrets.
   - Runs `./deploy.sh` to update code, build updated Docker images, run migrations, and execute a zero-downtime rolling restart.
3. **Manual Deployment**:
   - You can also trigger deployment manually anytime by visiting **Actions** ➔ **Continuous Deployment (CD)** ➔ **Run workflow**.

---

## 5. Local Docker Testing

To test the entire containerized stack locally before deploying:
```bash
docker compose up --build
```
- Frontend: [http://localhost](http://localhost)
- Backend API: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
