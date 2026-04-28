Backend setup

1. Create a virtual environment and install dependencies:
   - `python -m venv .venv`
   - `.venv\Scripts\activate`
   - `pip install -r requirements.txt`

2. Copy `backend/.env.example` to `backend/.env` and set:
   - `APP_ENV`
   - `MONGO_URL`
   - `MONGO_DB_NAME`
   - `JWT_SECRET_KEY`
   - `CORS_ALLOWED_ORIGINS`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`

Production notes

- Email OTP is mandatory for registration and login.
- In `staging` or `production`, the API will refuse to use auth until SendGrid is configured.
- In `staging` or `production`, `MONGO_URL` and `JWT_SECRET_KEY` must be present.
- Use a hosted MongoDB connection string for online deployment.

Run locally

- From repo root: `python -m backend.main`
- Frontend should point to `http://localhost:8000`
