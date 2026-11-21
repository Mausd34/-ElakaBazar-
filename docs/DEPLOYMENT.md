# Deployment checklist

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
