# Azure configuration (free tier)

This folder documents the Azure resources TaskFlow uses. **Everything here fits
in the Azure free tier, so running it costs $0.** No always-on, no scaling, no
paid add-ons.

## Resources

| Resource | SKU / Tier | Cost |
|---|---|---|
| Azure App Service plan | **F1 (Free)** — Linux | $0 |
| Azure Database for PostgreSQL | **Flexible Server free tier** (or Neon free) | $0 |
| GitHub Actions | Free minutes for public repos | $0 |

## App Service settings

In the App Service → **Configuration → Application settings**, add:

| Name | Value |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://USER:PASS@HOST:5432/DBNAME` |
| `SECRET_KEY` | a long random string |
| `BACKEND_CORS_ORIGINS` | `https://taskflow.vercel.app` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

**Startup command** (App Service → Configuration → General settings):

```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Keeping it free

- Use the **F1** plan — it is free but sleeps after idle and has a 60 min/day
  compute quota, which is plenty for a demo.
- The database tables are created automatically on first startup
  (`Base.metadata.create_all` in `app/main.py`), so there is no paid migration step.
- If you prefer a database that never sleeps, **Neon** and **Supabase** both have
  free-forever Postgres tiers — just set `DATABASE_URL` to their connection string.
