# Deployment checklist

## Render demo deployment

The repository includes a Render Blueprint in `render.yaml` for the frontend, API, and PostgreSQL database. It uses Render's free plans for an initial demo; free web services can sleep when idle, and free PostgreSQL is temporary and must not hold production data.

1. Push the repository to GitHub and sign in to the [Render Dashboard](https://dashboard.render.com).
2. Choose **New > Blueprint**, connect `Mausd34/-ElakaBazar-`, and review the resources and free-plan limitations before choosing **Deploy Blueprint**.
3. Wait for the API, database, and static site deploys to finish. The Blueprint uses the `elakabazar-api.onrender.com` and `elakabazar-web.onrender.com` service URLs.
4. Configure `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` as backend service environment variables in Render. Keep `SSLCOMMERZ_SANDBOX=1` until sandbox checkout and callbacks have been verified. Do not put credentials in the Blueprint or frontend.
5. Verify the API health check and frontend checkout using the sandbox gateway. Do not use the free database for real customer or order data.

For production, choose durable paid compute and PostgreSQL plans, configure persistent/object storage if uploads are added, and enable backups before accepting real customer data.

## Production checklist

1. Use managed PostgreSQL and set `DATABASE_URL`.
2. Set a cryptographically random `SECRET_KEY`.
3. Set `DEBUG=0` and production `ALLOWED_HOSTS`.
4. Configure `CORS_ALLOWED_ORIGINS` for the actual web domain.
5. Serve behind HTTPS with a production WSGI server (Gunicorn).
6. Configure persistent media/object storage.
7. Configure scheduled database backups and restore tests.
8. Configure error monitoring and structured logs.
9. Configure `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` in the backend environment with `SSLCOMMERZ_SANDBOX=1`. Set `PAYMENT_CALLBACK_BASE_URL` to a publicly reachable HTTPS backend URL (and `FRONTEND_URL` to the web app). Use a secure tunnel for local callback testing. See the [official SSLCommerz API documentation](https://developer.sslcommerz.com/doc/v4/).
10. Switch to live credentials and `SSLCOMMERZ_SANDBOX=0` only after merchant approval and successful sandbox verification. Never expose gateway credentials in frontend variables.
11. Run migrations and automated tests before release.

Do not deploy with demo passwords or development database credentials.
