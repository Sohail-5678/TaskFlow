# Deployment Guide ($0, free tier only)

This guide deploys TaskFlow for **free**: the frontend to Vercel, the backend to
Azure App Service (free F1), and a free Postgres database. No step requires a
paid plan or a credit card charge.

---

## 1. Database (free Postgres)

Pick **one** free option and copy its connection string.

### Option A — Azure Database for PostgreSQL (free tier)
1. Azure Portal → **Create a resource → Azure Database for PostgreSQL → Flexible server**.
2. Choose the **free tier** eligible configuration.
3. Allow Azure services to connect (networking) and create a database named `taskflow`.
4. Connection string:
   `postgresql+asyncpg://USER:PASSWORD@HOST:5432/taskflow`

### Option B — Neon (free forever, no sleep surprises)
1. Create a project at neon.tech (free).
2. Copy the connection string and convert it to:
   `postgresql+asyncpg://USER:PASSWORD@HOST/dbname?ssl=require`

---

## 2. Backend → Azure App Service (Linux, free F1)

1. Azure Portal → **Create a resource → Web App**.
   - Publish: **Code**, Runtime: **Python 3.11**, OS: **Linux**.
   - App Service Plan: **F1 (Free)**.
2. App Service → **Configuration → Application settings**, add:
   - `DATABASE_URL` = your Postgres URL from step 1
   - `SECRET_KEY` = a long random string
   - `BACKEND_CORS_ORIGINS` = `https://taskflow.vercel.app`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
3. App Service → **Configuration → General settings → Startup Command**:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
4. **Automated deploys:** download the App Service *publish profile* and add it as the
   GitHub repo secret `AZURE_WEBAPP_PUBLISH_PROFILE`. Set `AZURE_WEBAPP_NAME` in
   `.github/workflows/azure-backend.yml` to your app name. Every push to `main`
   now deploys the backend.

Your API will be at `https://<app-name>.azurewebsites.net` (docs at `/docs`).

---

## 3. Frontend → Vercel (`taskflow.vercel.app`)

The easiest path (no secrets, free Hobby tier):

1. Go to vercel.com → **Add New → Project** and import your GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite** (auto-detected). Build: `npm run build`, Output: `dist`.
4. Add an environment variable:
   - `VITE_API_URL` = `https://<your-app-name>.azurewebsites.net`
5. Deploy. In **Settings → Domains**, the project is served at
   `https://<project-name>.vercel.app`. Name the project `taskflow` to get
   `https://taskflow.vercel.app` (if that name is taken, pick another and update
   `BACKEND_CORS_ORIGINS` on the backend to match).

> After the first deploy, make sure the backend's `BACKEND_CORS_ORIGINS` includes
> your exact Vercel URL, otherwise the browser will block API calls.

---

## 4. Verify

1. Open the Vercel URL, register an account (or use the seeded demo if you ran
   `python -m app.seed` against the production DB).
2. Create a board, add tasks, drag them between columns.
3. Open the same board in a second browser/incognito window and confirm changes
   appear in real time (WebSocket sync).

---

## Cost summary

| Component | Service | Monthly cost |
|---|---|---|
| Frontend | Vercel Hobby | **$0** |
| Backend | Azure App Service F1 | **$0** |
| Database | Azure PostgreSQL free / Neon free | **$0** |
| CI/CD | GitHub Actions (public repo) | **$0** |
| **Total** | | **$0** |
