# Deployment Runbook

## 1) Architecture
- Frontend: Vercel (`client/`)
- Backend: Clever Cloud (`server/`)
- Database: Clever Cloud MySQL add-on

## 2) Required environment variables

### Vercel (Frontend)
- `REACT_APP_API_BASE=https://<your-backend-app>.cleverapps.io`

### Clever Cloud (Backend)
- `CC_APP_DIRECTORY=server`
- `MYSQL_HOST=<mysql-host>`
- `MYSQL_PORT=3306`
- `MYSQL_DB=<mysql-db-name>`
- `MYSQL_USER=<mysql-user>`
- `MYSQL_PASSWORD=<mysql-password>`
- `NODE_ENV=production`

## 3) Local run

### Backend
```bash
cd /Users/burlarajamouli/Desktop/restaurant-app/server
node index.js
```

### Frontend
```bash
cd /Users/burlarajamouli/Desktop/restaurant-app/client
npm start
```

## 4) Deploy process
1. Push code to `main`.
2. Vercel auto-builds frontend from `client/`.
3. Clever Cloud auto-deploys backend from repo with `CC_APP_DIRECTORY=server`.
4. Check health endpoints:
   - Backend: `https://<backend>.cleverapps.io/`
   - Frontend: Vercel production URL

## 5) Rollback process
1. Find last known good commit:
```bash
git log --oneline
```
2. Roll back by reverting the bad commit:
```bash
git revert <bad_commit_sha>
git push
```
3. Verify backend and frontend URLs again.

## 6) Pre-release checklist
- CI is green in GitHub Actions.
- Frontend can load menu from backend.
- Owner login works.
- Reservations accept/reject works.
- Order status update works.
- Daily sales and monthly revenue report endpoints respond.
- Daily and monthly waste report endpoints respond.
- No secrets committed to git (`.env` not tracked).

