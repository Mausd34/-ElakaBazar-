# ElakaBazar

**A hyperlocal grocery marketplace concept for Bangladesh.**

ElakaBazar is a web-first marketplace designed to connect customers with nearby grocery shops. The project aims to make everyday shopping more convenient while helping neighborhood retailers reach customers beyond their physical storefronts.

<p align="center">
  <img src="assets/banners/hero.svg" alt="ElakaBazar project banner" width="100%" />
</p>

<p align="center">
  <strong>Local shops. Everyday essentials. One neighbourhood marketplace.</strong>
</p>

<p align="center">
  <a href="https://github.com/Mausd34/-ElakaBazar-/issues">Report an issue</a> ·
  <a href="docs/API.md">API reference</a> ·
  <a href="docs/DEPLOYMENT.md">Deployment checklist</a>
</p>

## Project at a glance

- Customer-facing storefront for local grocery discovery and checkout
- Area-based product browsing with neighborhood shop filtering
- Shopkeeper dashboard for inventory, stock and order actions
- Delivery and admin workspaces for fulfillment and operations
- Built as a practical MVP for Bangladesh's local commerce workflows

### How it works

```mermaid
flowchart LR
    A[Customer] --> B[Web App]
    B --> C[API Layer]
    C --> D[Shop & Product Catalog]
    C --> E[Cart & Checkout]
    C --> F[Order Workflow]
    F --> G[Shopkeeper Dashboard]
    F --> H[Delivery Agent Workspace]
    F --> I[Admin Dashboard]
    D --> J[(Database)]
    E --> J
    G --> J
    H --> J
    I --> J
```

### Quick start in Bangla

1. লোকাল ডেভ কনফিগারেশন সেট আপ করুন
2. Django backend চালু করুন
3. React frontend রান করে ডেলিভারি ও অর্ডার ফ্লো টেস্ট করুন

This project is designed for rapid validation of a local grocery marketplace before scaling to a production-ready commerce platform.

---

## Application tour

The screenshots below are desktop views of the running web app. Dashboard content depends on the signed-in role and available database records; use test accounts and sample records in a local environment.

### 1. Discover the marketplace

Browse local products, choose a service area, search the catalogue, and open nearby stores.

<p align="center">
  <img src="./docs/screenshots/homepage.png" alt="ElakaBazar storefront with area selector, product categories, products, and nearby shops" width="100%" />
</p>

### 2. Find a neighborhood store

Compare shops serving the selected area and review delivery and minimum-order details.

<p align="center">
  <img src="./docs/screenshots/stores.png" alt="ElakaBazar neighborhood store listing" width="100%" />
</p>

### 3. Shop and check out

Add products to the cart, select a delivery address in the shop's service area, and choose cash on delivery or an available hosted mobile-banking option.

<p align="center">
  <img src="./assets/screenshots/web-cart.svg" alt="ElakaBazar cart and checkout workflow illustration" width="100%" />
</p>

### 4. Track customer orders

Customers can review their orders and follow status updates; public tracking omits private delivery details.

<p align="center">
  <img src="./assets/screenshots/web-orders.svg" alt="ElakaBazar customer order and tracking workflow illustration" width="100%" />
</p>

### 5. Manage a shop

Shopkeepers can apply for approval, manage inventory and availability, and process orders for their own shops.

<p align="center">
  <img src="./docs/screenshots/shopkeeper.png" alt="ElakaBazar shopkeeper dashboard" width="100%" />
</p>

### 6. Coordinate deliveries and administration

Delivery agents see assigned jobs. Administrators review shops, oversee orders, assign delivery agents, and manage the catalogue.

<p align="center">
  <img src="./assets/screenshots/admin-panel.svg" alt="ElakaBazar administration workflow illustration" width="100%" />
</p>

The SVG workflow images are product illustrations, not live dashboard screenshots. Screens that require an authenticated role should be captured with a dedicated local test account; never publish real customer addresses, credentials, or order data.

---

## Table of contents

- [Why ElakaBazar?](#why-elakabazar)
- [Project goals](#project-goals)
- [Current capabilities](#current-capabilities)
- [Technology stack](#technology-stack)
- [System architecture](#system-architecture)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
  - [Option 1: Docker Compose](#option-1-docker-compose-recommended)
  - [Option 2: Run manually](#option-2-run-manually)
  - [Database setup and migrations](#database-setup-and-migrations)
- [Environment configuration](#environment-configuration)
- [API overview](#api-overview)
- [Development workflow](#development-workflow)
- [Security and production readiness](#security-and-production-readiness)
- [Project status and roadmap](#project-status-and-roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why ElakaBazar?

In many Bangladeshi neighbourhoods, customers depend on nearby grocery stores for daily essentials, while small shopkeepers often have limited digital tools for product discovery and order management. ElakaBazar explores a local-first solution to this problem.

The project is worth running and developing because it provides a practical way to:

- **Make local shopping easier:** let customers discover participating shops and available products by area.
- **Support neighbourhood businesses:** give small retailers a digital channel to present products and receive orders.
- **Improve convenience:** bring product selection, cart management and order placement into one workflow.
- **Explore a scalable model:** build and validate the service area by area instead of attempting a nationwide launch immediately.
- **Learn through a real-world system:** work with authentication, role-based permissions, inventory, order state transitions, APIs and a multi-client architecture.

ElakaBazar is currently a development project/prototype. Its business model and operational assumptions should be validated with customers and shopkeepers before a commercial launch.

## Project goals

1. Build a location-aware marketplace for local grocery shops.
2. Provide separate workflows for customers, shopkeepers, delivery agents and administrators.
3. Keep the system modular so web and mobile clients can use the same backend API.
4. Start with cash-on-delivery (COD), then evaluate locally suitable payment and delivery integrations.
5. Pilot in a limited service area, measure real demand and improve from user feedback.

## Current capabilities

The repository contains the following implemented backend and web application foundations:

| Area | Current implementation |
|---|---|
| Accounts | Custom user model with Customer, Shopkeeper, Delivery Agent and Admin roles |
| Authentication | JWT access and refresh token endpoints |
| Local discovery | Active areas, approved shops and area-based shop/product filtering |
| Catalogue | Categories, products and shop-specific prices/stock |
| Cart | Authenticated cart, quantity updates and single-shop cart restriction |
| Checkout | COD order creation with stock checks and minimum-order validation |
| Order workflow | Customer order history and shopkeeper accept/reject/prepare/ready actions |
| Delivery workflow | Admin assignment and delivery-agent pickup/completion endpoints |
| Customer orders | Order history, order details, delivery address and status timeline in the web client |
| Seller inventory | Shopkeeper-owned shop list, catalogue selection, price, stock and availability management; shop application with admin approval |
| Reviews | Review creation endpoint and rating model |
| Admin workspace | Platform summary, pending-shop approval/rejection/suspension, order oversight, delivery-agent assignment and master catalogue product creation |
| Delivery workspace | Assigned-job list, customer/address details, pickup and COD delivery completion |
| Web client | React + TypeScript storefront with product browsing, search, login, registration, account profile, cart and checkout screens |
| Mobile client | Expo / React Native project scaffold |

**Important:** A repository feature or API endpoint does not automatically mean a complete, production-tested user experience. The mobile app, end-to-end flows, payment integrations, delivery operations and production deployment still require further implementation and verification.

## Technology stack

| Layer | Technologies |
|---|---|
| Backend | Python, Django, Django REST Framework |
| Authentication | djangorestframework-simplejwt |
| Database | SQLite by default for local manual setup; PostgreSQL supported through `DATABASE_URL` and Docker Compose |
| Web frontend | React 18, TypeScript, Vite, React Router, Axios |
| Mobile foundation | Expo, React Native |
| Local services | Docker, Docker Compose |
| Time zone | Asia/Dhaka |

## System architecture

```text
                   ElakaBazar
                       |
          +------------+------------+
          |                         |
      Web client               Mobile client
   React + TypeScript         Expo / React Native
          |                         |
          +------------+------------+
                       |
                 REST API (JSON)
                       |
             Django + DRF backend
                       |
        +--------------+--------------+
        |              |              |
      Users         Marketplace      Orders
     & roles        shops/products   cart/delivery
                       |
                Database layer
             SQLite / PostgreSQL
```

The web and mobile clients are intended to communicate with the same versioned API under `/api/v1/`.

## Repository structure

```text
ElakaBazar/
├── assets/
│   ├── banners/              # Project banner artwork
│   └── screenshots/          # UI mockups / screenshots
├── backend/
│   ├── config/               # Django project configuration
│   ├── marketplace/          # Models, serializers, views, permissions and tests
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.ts
├── mobile/
│   ├── App.js
│   ├── app.json
│   └── package.json
├── docs/
│   ├── API.md
│   └── DEPLOYMENT.md
├── docker-compose.yml
├── .env.example
└── README.md
```

## Getting started

### Prerequisites

For Docker setup:

- Docker Desktop (Windows/macOS) or Docker Engine
- Docker Compose v2

For manual setup:

- Python 3.12 or a compatible Python version supported by the installed Django release
- Node.js and npm
- Git

### Option 1: Docker Compose (recommended)

This starts PostgreSQL, the Django API, and the Vite web app together. Install Docker Desktop (with Compose v2), then run these commands from the repository root.

```powershell
git clone https://github.com/Mausd34/-ElakaBazar-.git
cd -ElakaBazar-
Copy-Item .env.example .env
docker compose up --build
```

On macOS/Linux, replace the copy command with `cp .env.example .env`. Wait for the database health check and services to finish starting, then open:

| Service | Local address |
|---|---|
| Web frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| Django admin | http://localhost:8000/admin/ |

The backend applies checked-in Django migrations on startup. To inspect logs or run migrations manually:

```powershell
docker compose logs -f backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

The last command is optional and creates a private local admin account interactively.

To stop the services:

```powershell
docker compose down
```

To stop the services and delete the local PostgreSQL volume (this deletes local database data):

```powershell
docker compose down -v
```

### Option 2: Run manually

#### 1. Backend (Django)

```powershell
cd backend

python -m venv .venv

.venv\Scripts\Activate.ps1

pip install -r requirements.txt

Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

On macOS/Linux, activate with `source .venv/bin/activate` and copy the template with `cp .env.example .env`. The backend uses SQLite locally by default. The API is available at http://127.0.0.1:8000/api/v1/.

#### 2. Web frontend (React + Vite)

Open a second terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

On macOS/Linux, use `cp .env.example .env`. Open http://localhost:5173/. Start the backend in a separate terminal first.

To create a production frontend build:

```powershell
npm run build
```

#### 3. Mobile app (Expo)

Open another terminal:

```powershell
cd mobile
npm install
npx expo start
```

Use Expo Go to scan the QR code, or launch an available simulator. When testing on a physical phone, configure the API base URL to use your computer's LAN IP address rather than `localhost`.

### Database setup and migrations

The repository tracks Django migration files in `backend/marketplace/migrations/`; these define the schema and are the portable, safe way to recreate the database. Local SQLite records in `backend/db.sqlite3` are machine-specific and are not published to GitHub. Production database contents are provisioned in the hosting provider, not pushed as a file.

For manual development, from `backend/`:

```powershell
python manage.py showmigrations
python manage.py migrate
python manage.py makemigrations --check --dry-run
```

When you intentionally change a model, create and review a migration before committing:

```powershell
python manage.py makemigrations marketplace
python manage.py migrate
python manage.py test
```

For a fresh local SQLite database, stop the backend and remove only `backend/db.sqlite3`, then run `python manage.py migrate` to recreate the schema. This deletes that local database's records; it does not affect a hosted database.

## Environment configuration

Use the example files as templates and create local environment files for your machine. Never put real credentials in Git.

### Root `.env` (Docker Compose)

| Variable | Purpose |
|---|---|
| `DEBUG` | Django debug mode; use `0` in production |
| `SECRET_KEY` | Django secret key; generate a private production value |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `DATABASE_URL` | Database connection URL |
| `CORS_ALLOWED_ORIGINS` | Allowed browser origins |
| `VITE_API_URL` | API base URL used by the web client |

### Frontend `frontend/.env`

| Variable | Purpose | Local example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

### Backend `backend/.env`

The backend can use the variables in `backend/.env.example`. For manual SQLite development, the default database configuration works without setting `DATABASE_URL`.

### Order tracking and courier configuration

No courier provider credentials are required for manual tracking updates. Pathao, Steadfast, RedX, and eCourier integrations are intentionally not enabled until provider-specific credentials and API verification are available. For a future provider integration, keep credentials in backend environment variables (never in the repository), add provider-specific webhook secrets, and verify signatures before importing courier events.

## API overview

**Base URL:** `http://localhost:8000/api/v1/`

| Endpoint | Method | Purpose |
|---|---|---|
| `/token/` | POST | Obtain JWT tokens |
| `/token/refresh/` | POST | Refresh an access token |
| `/auth/register/` | POST | Register a customer |
| `/auth/me/` | GET | Get the current authenticated user |
| `/areas/` | GET | List active areas |
| `/categories/` | GET | List active categories |
| `/shops/` | GET | List approved shops; supports area/search filters |
| `/shops/<id>/` | GET | Retrieve a shop |
| `/products/` | GET | List available shop products; supports filters |
| `/catalog/products/` | GET | List active catalogue products for seller inventory selection |
| `/shopkeeper/shops/` | GET | List shops owned by the authenticated shopkeeper |
| `/shopkeeper/shops/apply/` | POST | Submit a shop for admin approval |
| `/shop-products/manage/` | GET, POST | List and add products for the shopkeeper's own shops |
| `/shop-products/manage/<id>/` | GET, PUT, PATCH, DELETE | Manage an owned shop product; shop ownership is validated |
| `/cart/` | GET, POST, DELETE | Read, add to and clear the current cart |
| `/cart/items/<id>/` | PATCH, DELETE | Update or remove a cart item |
| `/addresses/` | GET, POST, PUT, PATCH, DELETE | Manage the current user's addresses |
| `/checkout/` | POST | Place a COD order |
| `/orders/` | GET | List the current customer's orders, including status history |
| `/orders/<uuid>/` | GET | Retrieve an order |
| `/orders/<uuid>/tracking/` | GET | Retrieve full tracking details for the authenticated customer |
| `/orders/<uuid>/history/` | GET | Retrieve order tracking history for the authenticated customer |
| `/track/<tracking_number>/` | GET | Public, limited tracking lookup; personal delivery details are omitted |
| `/admin/orders/` | GET | Search/filter all orders (staff only) |
| `/admin/orders/<uuid>/` | GET | Retrieve complete order tracking details (staff only) |
| `/admin/orders/<uuid>/status/` | PATCH | Validate and apply an order status transition (staff only) |
| `/admin/orders/<uuid>/shipment/` | POST | Configure courier and shipment tracking details (staff only) |
| `/seller/orders/` | GET | List orders owned by the authenticated shopkeeper |
| `/seller/orders/<uuid>/status/` | PATCH | Apply a permitted seller fulfillment transition |
| `/seller/orders/<uuid>/shipment/` | POST | Add shipment details for an owned seller order |
| `/shopkeeper/orders/` | GET | List orders for the current shopkeeper |
| `/shopkeeper/orders/<uuid>/<action>/` | POST | Shopkeeper order actions |
| `/delivery/jobs/` | GET | List jobs assigned to the delivery agent |
| `/delivery/jobs/<uuid>/<action>/` | POST | Pickup or complete a delivery |
| `/admin/overview/` | GET | Admin dashboard summary (staff only) |
| `/admin/shops/` | GET | List shops for review (staff only) |
| `/admin/shops/<id>/<action>/` | POST | Approve, reject or suspend a shop (staff only) |
| `/admin/orders/` | GET | List all orders (staff only) |
| `/admin/delivery-agents/` | GET | List active delivery agents (staff only) |
| `/admin/products/` | POST | Add master catalogue product (staff only) |
| `/admin/orders/<uuid>/assign/` | POST | Assign a delivery agent (admin) |
| `/reviews/` | POST | Create a review |

Authenticated requests use:

```http
Authorization: Bearer <access-token>
```

See [docs/API.md](docs/API.md) for the concise API reference. The Django URL configuration is the source of truth if this table and implementation differ.

## Development workflow

For a team using GitHub:

1. Keep `main` stable; create a feature branch for each task.
2. Pull the latest changes before starting work.
3. Keep backend and frontend changes in clearly scoped commits.
4. Run backend tests with `python manage.py test` from the `backend/` directory.
5. Build the web client with `npm run build` from `frontend/`.
6. Open a pull request and describe the change, test evidence and any migration/API impact.
7. Review before merging.

Suggested branch names:

- `feature/customer-checkout`
- `feature/shopkeeper-inventory`
- `fix/cart-validation`
- `docs/readme-setup`

## Security and production readiness

This repository is a development-stage project, not a production-ready commerce service. Before handling real customers, addresses, orders or payments:

- Remove real `.env` files from version control and rotate any credential that may have been exposed.
- Add and maintain a root `.gitignore`; do not commit `node_modules/`, Python cache files, virtual environments, local databases or build output.
- Replace development secrets and database passwords; set `DEBUG=0`.
- Configure production `ALLOWED_HOSTS`, CORS, HTTPS and secure cookie/security settings.
- Use managed PostgreSQL, automated backups and a tested restore process.
- Review authorization, validation, rate limiting, logging and error handling.
- Add comprehensive automated tests for authentication, permissions, stock changes, checkout and order transitions.
- Integrate and test payment, SMS/OTP, notifications, delivery operations and persistent product-image storage before offering those services.
- Perform a security review and pilot with a small group of shops before public launch.

The repository currently includes local development artefacts (including dependency/cache/database files). Clean these from Git history or future commits as part of repository maintenance. Do not assume that adding a README alone makes the application secure or deployable.

## Project status and roadmap

ElakaBazar is under active development. Potential next milestones:

- [x] Implement customer registration, account view, cart, COD checkout and order tracking foundations.
- [x] Implement shopkeeper shop applications, admin shop approval and inventory management screens.
- [x] Implement delivery-agent and admin web workspaces, including delivery assignment and completion.
- [x] Add backend tests and CI checks for Django and frontend builds.
- [ ] Add profile editing, full address-book management and customer-facing notification delivery.
- [ ] Add reliable product image upload and storage.
- [ ] Validate the service with real customers and local shopkeepers in a pilot area.
- [ ] Evaluate SMS verification, notifications and locally appropriate payment providers.
- [ ] Prepare production deployment, monitoring, backups and operational support.

Roadmap items are plans, not claims that the features are already available.

## Contributing

Contributions, bug reports and suggestions are welcome.

1. Fork the repository.
2. Create a focused branch from `main`.
3. Make a small, clearly scoped change.
4. Run relevant tests and builds.
5. Open a pull request with a clear summary and test notes.

For bugs or feature requests, use [GitHub Issues](https://github.com/Mausd34/-ElakaBazar-/issues).

## License

This repository includes an MIT License. See the [LICENSE](LICENSE) file for the complete terms.

---

<p align="center">
  <strong>ElakaBazar — Bringing neighbourhood grocery shopping closer to home.</strong>
</p>
