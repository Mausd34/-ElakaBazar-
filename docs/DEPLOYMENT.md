# Deployment checklist

1. Use managed PostgreSQL and set `DATABASE_URL`.
2. Set a cryptographically random `SECRET_KEY`.
3. Set `DEBUG=0` and production `ALLOWED_HOSTS`.
4. Configure `CORS_ALLOWED_ORIGINS` for the actual web domain.
5. Serve behind HTTPS with a production WSGI server (Gunicorn).
6. Configure persistent media/object storage.
7. Configure scheduled database backups and restore tests.
8. Configure error monitoring and structured logs.
9. Add SMS OTP provider and verified merchant payment integrations.
10. Run migrations and automated tests before release.

Do not deploy with demo passwords or development database credentials.
