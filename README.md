# Tracker

Personal goals and habits dashboard. Tracks yearly goals, weekly targets, daily habits, and body metrics.

## Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (via `better-sqlite3`)
- **Charts**: Recharts
- **Icons**: Lucide React
- **CI/CD**: GitHub Actions → Docker Hub → VPS

---

## Local development

### Prerequisites

- Node.js 22+
- npm 11+

### Setup

```bash
npm install
cp server/.env.example server/.env
# defaults in .env work for local dev
```

### Run

```bash
npm run dev
```

Starts the Express server on `:3001` and the React client on `:3000` with hot reload. Open http://localhost:3000.

### Tests

```bash
npm test --workspace=server
```

---

## What's tracked

### Daily habits
| Habit | Type |
|---|---|
| Drink-free day | Toggle |
| Alcohol units | Value entry |
| Weights session | Toggle |
| Protein (g) | Value entry — 140–150g target |
| Calories (kcal) | Value entry — ~2400 target |
| Run miles | Value entry |
| Walk miles | Value entry |

### Weekly goals (resets each Monday)
| Goal | Target |
|---|---|
| Weights sessions | 4 |
| Run miles | 6 |
| Walk miles | 10 |

### Yearly goals (2026)
| Goal | Target | Direction |
|---|---|---|
| Alcohol units | <400 | Below |
| Running | >280 miles | Above |
| Tourist parkruns | 10 | Above |
| Trelai parkruns | 16 | Above |
| Audiobooks | 12 | Above |
| Books | 16 | Above |

---

## Integrations

| Service | What it does | Status |
|---|---|---|
| Google Calendar | Shows today's/tomorrow's events | OAuth2 read-only |

Connect from the Settings page once credentials are configured in `.env`.

---

## CI/CD pipeline

The pipeline lives in `.github/workflows/deploy.yml` and triggers on a version tag push.

### How to release

```bash
git tag v1.0.0
git push origin v1.0.0
```

### What the pipeline does

1. **check** job — type-checks client + server, runs server tests, verifies the client builds
2. **deploy** job (only runs if check passes):
   - Builds a `linux/amd64` image and scans it with Trivy (blocks on CRITICAL CVEs)
   - Builds and pushes a multi-arch (`amd64` + `arm64`) image to Docker Hub as `lmwcode/tracker:v1.0.0` and `:latest`
   - SSHs into the VPS, pulls the new image, restarts the container
   - Runs a health check against `/api/health`

### GitHub secrets required

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username (`lmwcode`) |
| `DOCKER_TOKEN` | Docker Hub access token (not your password) |
| `VPS_HOST` | IP address of your VPS |
| `VPS_USER` | SSH user on the VPS (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key for the VPS user |
| `BASIC_AUTH_USER` | Username for the app's login prompt |
| `BASIC_AUTH_PASS` | Password for the app's login prompt |

Dependabot is configured to open PRs weekly for npm and GitHub Actions updates.

---

## VPS first-time setup

SSH into your VPS and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Create the app directory
sudo mkdir -p /opt/tracker
sudo chown $USER:$USER /opt/tracker
cd /opt/tracker

# Create the .env file (the pipeline uses these at runtime)
cat > .env << 'EOF'
BASIC_AUTH_USER=your_username
BASIC_AUTH_PASS=your_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://YOUR_VPS_IP:3001/api/calendar/callback
EOF

# Copy docker-compose.yml from the repo (or paste it in)
# Then pull and start:
docker compose pull
docker compose up -d
```

After the first deploy, all subsequent deploys happen automatically when you push a version tag. To redeploy manually (e.g. after editing `.env`), run `./deploy.sh` from `/opt/tracker`.

---

## Callback URL for Google Calendar

When you get a domain, update this in `.env` on the VPS and in the Google Cloud Console OAuth settings:

| Integration | Callback URL |
|---|---|
| Google Calendar | `https://yourdomain.com/api/calendar/callback` |
