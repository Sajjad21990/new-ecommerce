# Deploy to Railway (Manual via Dashboard)

## Step 1: Create Railway Account & Project

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select this repository

## Step 2: Add PostgreSQL Database

1. In your project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically add `DATABASE_URL` to your environment

## Step 3: Configure Environment Variables

1. Click on your **web service** (not the database)
2. Go to **"Variables"** tab
3. Add these variables:

```
NEXTAUTH_SECRET=<generate a random 32+ character string>
NEXTAUTH_URL=https://<your-app-name>.railway.app
```

**To generate NEXTAUTH_SECRET:**
- Use: https://generate-secret.vercel.app/32
- Or run locally: `openssl rand -base64 32`

## Step 4: Configure Build Settings

1. Click on your web service
2. Go to **"Settings"** tab
3. Set:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`

## Step 5: Deploy

Railway auto-deploys on every push to your main branch. To manually trigger:

1. Go to **"Deployments"** tab
2. Click **"Deploy"** or **"Redeploy"**

## Step 6: Run Database Migrations

1. Go to your web service
2. Click **"Settings"** → **"Railway Shell"** (or use the command palette)
3. Run:
```bash
npx drizzle-kit push
```

Or add this to your build command:
```
npm run build && npx drizzle-kit push
```

## Step 7: Get Your URL

1. Go to **"Settings"** tab
2. Under **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. Update `NEXTAUTH_URL` with this domain

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL | Yes |
| `NEXTAUTH_SECRET` | Random string for sessions | Yes |
| `NEXTAUTH_URL` | Your Railway app URL | Yes |

---

## Troubleshooting

### Build fails
- Check **"Deployments"** → click on failed deploy → view logs
- Ensure all required env variables are set

### Database connection issues
- Verify PostgreSQL service is running
- Check `DATABASE_URL` is set in Variables

### 500 errors after deploy
- Check logs in **"Deployments"** tab
- Ensure database migrations ran: `npx drizzle-kit push`
- Verify `NEXTAUTH_URL` matches your actual domain
