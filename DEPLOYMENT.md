# Deployment guide

## Frontend: GitHub Pages

1. Create a GitHub repository and push this project to GitHub.
2. In GitHub, open Settings → Pages.
3. Set Source to GitHub Actions.
4. Add the following repository secrets:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
5. Push to the main branch. GitHub Actions will build and deploy the frontend.

Expected public URL:
- https://<github-username>.github.io/running-route/

## Backend: Render

1. Create a new Web Service in Render.
2. Connect this repository.
3. Render should detect render.yaml automatically.
4. Add the following environment variables in Render:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - CORS_ORIGIN = https://<github-username>.github.io
5. Deploy.

Backend health check:
- https://<render-service-name>.onrender.com/health

## Supabase setup

1. Create a Supabase project.
2. Copy the Project URL and anon key from Project Settings → API.
3. Use those values in both GitHub Secrets and Render environment variables.
4. If you want server-side access, also add the service-role key in Render.
