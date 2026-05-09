# VPS First-Time Setup

Run these commands **once** via SSH on the VPS (62.72.26.125).
After this, all deploys happen from your local machine with `./scripts/deploy.sh`.

## 1. Create project folder

```bash
mkdir -p /opt/pos/caddy
cd /opt/pos
```

## 2. Copy files from your machine to VPS

From your local machine (run once, then the script handles updates):

```bash
# Copy the prod compose file and Caddyfile
scp docker-compose.prod.yml root@62.72.26.125:/opt/pos/
scp caddy/Caddyfile         root@62.72.26.125:/opt/pos/caddy/
```

## 3. Create .env on VPS

```bash
# On the VPS:
nano /opt/pos/.env
```

Paste your `.env` content. Minimum required:

```env
DB_PASSWORD=pos_password
JWT_SECRET=<your-secret>
ADMIN_INITIAL_PASSWORD=Aaron072307
CORS_ORIGINS=["https://tu-dominio.com"]
BUSINESS_NAME=Mi Negocio
```

## 4. Login to ghcr.io on VPS (one time)

So the VPS can pull private images:

```bash
# On the VPS — use your GitHub Personal Access Token
echo "ghp_TU_TOKEN" | docker login ghcr.io -u ardepa710 --password-stdin
```

Docker saves the credential to `~/.docker/config.json` — only needed once.

## 5. First deploy

```bash
cd /opt/pos
TAG=latest docker compose -f docker-compose.prod.yml pull
TAG=latest docker compose -f docker-compose.prod.yml up -d
```

## Daily deploys (from your local machine)

```bash
# Build + push + deploy in one command:
./scripts/deploy.sh

# Check what's running on VPS:
curl https://tu-dominio/health
# {"status":"ok","build":"9e46a1f","env":"production"}

# Mark current version as stable:
./scripts/tag-stable.sh

# Rollback to previous SHA:
ssh root@62.72.26.125 "cd /opt/pos && TAG=<previous-sha> docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend"
```

## Tag strategy

| Tag       | Meaning                 | When                                     |
| --------- | ----------------------- | ---------------------------------------- |
| `latest`  | Last build from main    | Automatic on every `./scripts/deploy.sh` |
| `stable`  | Last known-good version | Manual: `./scripts/tag-stable.sh`        |
| `9e46a1f` | Specific commit SHA     | Automatic on every build                 |

```
latest ──▶ points to the most recent push
stable ──▶ points to whatever you last tested and approved
9e46a1f ──▶ immutable — always that exact build
```
