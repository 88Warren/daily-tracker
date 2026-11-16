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
   - SSHs into the VPS and runs `helm upgrade` to roll the new image tag into the Kubernetes cluster
   - Health checks `https://tracker.lmwrecovery.co.uk/api/health`

### GitHub secrets required

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username (`lmwcode`) |
| `DOCKER_TOKEN` | Docker Hub access token (not your password) |
| `VPS_HOST` | IP address of your VPS |
| `VPS_USER` | SSH user on the VPS |
| `VPS_SSH_KEY` | Private SSH key for the VPS user |

Dependabot is configured to open PRs weekly for npm and GitHub Actions updates.

---

## Deployment (Kubernetes / Helm)

The app runs on the same k3s cluster as lmw-recovery, served at `tracker.lmwrecovery.co.uk`. The Helm chart lives in the `lmwrecovery-helmcharts` repo under `tracker/`.

### DNS

Add an A record in your DNS provider:

```
tracker.lmwrecovery.co.uk → <VPS IP>
```

cert-manager on the cluster will automatically issue a Let's Encrypt TLS certificate for the subdomain.

### First deploy (run once on the VPS)

```bash
# Create the secrets file (never commit this)
cat > /opt/lmwrecovery/lmwrecovery-helmcharts/tracker/secrets.prod.yaml << 'EOF'
secrets:
  basicAuthUser: "your_username"
  basicAuthPass: "your_password"
  googleClientId: "your_google_client_id"
  googleClientSecret: "your_google_client_secret"
EOF

# Deploy the chart
helm upgrade --install tracker-release \
  /opt/lmwrecovery/lmwrecovery-helmcharts/tracker \
  --namespace lmw-recovery \
  -f /opt/lmwrecovery/lmwrecovery-helmcharts/tracker/secrets.prod.yaml
```

After that, all deploys happen automatically on `git tag` push.

---

## Google Calendar callback URL

Update this in `secrets.prod.yaml` on the VPS and in the Google Cloud Console OAuth settings:

| Setting | Value |
|---|---|
| Authorised redirect URI | `https://tracker.lmwrecovery.co.uk/api/calendar/callback` |
