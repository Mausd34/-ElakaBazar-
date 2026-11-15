# ElakaBazar – Local Grocery Marketplace

## Overview

ElakaBazar is a location‑based grocery marketplace for Bangladesh.  The MVP consists of a **React + TypeScript** frontend (Tailwind CSS, TanStack Query) and a **Django + DRF** backend with PostgreSQL.  Docker‑Compose is used for local development.

## Project Structure

```
ElakaBazar/
├─ backend/                # Django project
│   ├─ elakabazar/         # Core settings & urls
│   └─ manage.py
├─ frontend/               # React + Vite app
│   ├─ src/
│   ├─ index.html
│   └─ package.json
├─ docker-compose.yml      # Multi‑service dev setup
└─ README.md
```

## Getting Started

```bash
# Clone the repo (if you haven't already)
git clone <repo‑url>
cd ElakaBazar

# Start services via Docker
docker compose up --build
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:8000/api/`.

## Development

- **Frontend** – `cd frontend && npm run dev`
- **Backend** – `cd backend && python manage.py runserver 0.0.0.0:8000`
- **Database** – PostgreSQL runs in Docker; migrations are applied automatically on container start.

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React, TypeScript, Tailwind CSS |
| State | TanStack Query |
| Backend | Python, Django, Django REST Framework |
| DB | PostgreSQL |
| Auth | JWT (simple role‑based) |
| Containerisation | Docker Compose |

## License

MIT – Feel free to adapt and extend.
