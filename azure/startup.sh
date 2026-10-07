#!/usr/bin/env bash
# Azure App Service (Linux) startup command for the FastAPI backend.
# Set this as the "Startup Command" in App Service → Configuration.
uvicorn app.main:app --host 0.0.0.0 --port 8000
