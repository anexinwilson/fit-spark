# Fit Spark 

Fit Spark is a Next.js app built with TypeScript that generates personalized workout plans based on fitness goals, available equipment, and experience level, offering weekly or monthly program options. It has social login and email sign-in through Clerk, flexible subscriptions via Stripe (weekly, monthly, yearly), and features to change or cancel plans anytime. The app also has profile management for viewing subscription details and uses Stripe webhooks to keep subscription status updated in real time.

## Features

| Area | What's inside |
| ---- | ------------- |
| **Authentication** | Clerk (email-link + social) |
| **Payments** | Stripe Checkout & webhooks (create / upgrade / cancel) |
| **Workout AI** | GPT-4o prompt → JSON schedule rendered day-by-day |
| **Database** | PostgreSQL on Neon, accessed through Prisma |
| **UI** | Material UI, Emotion |
| **State / Data-fetch** | React Query |
| **Tests** | Jest + custom mocks (OpenAI, Stripe, Prisma, Clerk) |

## Tech Stack (Core)

- Next.js 15 – App Router
- TypeScript
- React 19
- Prisma ORM → Neon Postgres
- Stripe SDK
- OpenAI SDK

## Getting Started (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/anexinwilson/fit-spark.git
cd fit-spark
npm install       
```

### 2. Environment Variables

Create a `.env` file in the root directory and add your database URL:

```ini
DATABASE_URL=postgres://<user>:<password>@<your-neon>.neon.tech/neondb
```

Create a `.env.local` file in the root directory for all other environment variables:

```ini
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_WEEKLY=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Note:** The `.env` and `.env.local` files are only for local development. For GCP deployment, all environment variables are configured as GitHub Secrets (see deployment section below).

### 3. Database Migration (Neon + Prisma)

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Stripe CLI for Local Webhooks

To test Stripe webhooks locally, set up the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```

The CLI will output your webhook signing secret. Copy it and update `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 5. Run Dev Server

```bash
npm run dev
```

App opens on `http://localhost:3000`.

### Unit Tests

```bash
npm run test
```

### Build

```bash
npm run build
npm start
```

---

## Testing Stripe Payments (Test Mode)

This app uses Stripe in **test mode**. Use these test card details for payment testing:

### Test Card Numbers

| Card Number | Brand | Use Case |
|------------|-------|----------|
| `4242 4242 4242 4242` | Visa | Successful payment |
| `4000 0025 0000 3155` | Visa | Requires authentication (3D Secure) |
| `4000 0000 0000 9995` | Visa | Declined payment |

### Test Payment Details

When prompted for billing details during Stripe Checkout:

- **Card Number**: `4242 4242 4242 4242`
- **Expiry Date**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **Cardholder Name**: Any name (e.g., `John Doe`)
- **Country**: Select **United States** or **Cayman Islands** (no ZIP/postal code required for Cayman Islands)
- **ZIP/Postal Code**: 
  - For US: Any 5 digits (e.g., `12345` or `90210`)
  - For Cayman Islands: Leave blank or use `KY1-1234`

**Quick Test Example (US):**
- Card: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- Country: United States
- ZIP: `12345`

**Quick Test Example (No ZIP required):**
- Card: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- Country: Cayman Islands
- Address: Any text

For more test cards and scenarios, visit [Stripe Testing Documentation](https://stripe.com/docs/testing).

---

## Deployment to Google Cloud Platform

This section explains how to deploy Fit Spark to **Google Cloud Run** using **GitHub Actions** for automated CI/CD.

### Prerequisites

- A Google Cloud Platform account ([Create one here](https://cloud.google.com/))
- A GitHub repository for your Fit Spark project
- Basic familiarity with GCP Console

### Architecture Overview

The deployment uses:
- **Artifact Registry**: Stores Docker images
- **Cloud Run**: Hosts the containerized Next.js app
- **GitHub Actions**: Automates build and deployment on every push to `main`
- **GitHub Secrets**: Stores all environment variables and GCP credentials

---

## Google Cloud Platform Setup

### Step 1: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you have a project selected (or create a new one)
3. In the top search bar, search for and enable these APIs one by one:

#### a) Enable Artifact Registry API
   - Search: "Artifact Registry API"
   - Click on "Artifact Registry API"
   - Click the blue **Enable** button
   - Wait until "API Enabled" appears

#### b) Enable Cloud Run API
   - Search: "Cloud Run API"
   - Click on "Cloud Run API"
   - Click the blue **Enable** button
   - Wait until "API Enabled" appears

---

### Step 2: Create an Artifact Registry Repository

1. In the GCP Console search bar, type **"Artifact Registry"** and open it
2. Click **"Create Repository"** (blue button at the top)
3. Fill in the form:
   - **Name**: `fitspark-repo` (you can choose any name, but remember it)
   - **Format**: Docker
   - **Mode**: Standard
   - **Location type**: Region
   - **Region**: Choose one close to your users (e.g., `us-central1`, `asia-south1`, `europe-west1`)
   - **Encryption**: Google-managed encryption key
   - **Immutable image tags**: Leave unchecked/disabled
4. Click **Create**
5. Wait for the repository to be created

**Note down:**
- Repository name (e.g., `fitspark-repo`)
- Region (e.g., `us-central1`)

---

### Step 3: Find Your GCP Project ID

1. At the very top of the Google Cloud Console, you'll see your project name
2. Click on the **project dropdown** (next to "Google Cloud")
3. In the popup, you'll see a table with columns: "Name", "ID", "Number"
4. Copy the value from the **"ID"** column (e.g., `fit-spark-401204`)

**Note down:** Your Project ID

---

### Step 4: Construct Your Docker Image Base URL

Your Docker image URL follows this exact format:

```
[REGION]-docker.pkg.dev/[PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]
```

**How to find each component:**

| Component | Where to Find It | Your Value |
|-----------|------------------|------------|
| **REGION** | From Step 2 - the region you selected when creating the Artifact Registry repository | e.g., `us-central1` |
| **PROJECT_ID** | From Step 3 - the ID column in the project dropdown | e.g., `fit-spark-401204` |
| **REPOSITORY_NAME** | From Step 2 - the name you gave your repository | e.g., `fitspark-repo` |
| **IMAGE_NAME** | Your app name (lowercase letters and hyphens only) | e.g., `fit-spark` |

**Example Construction:**
- Region: `us-central1`
- Project ID: `fit-spark-401204`
- Repository Name: `fitspark-repo`
- Image Name: `fit-spark`

**Final URL:**
```
us-central1-docker.pkg.dev/fit-spark-401204/fitspark-repo/fit-spark
```

**Note down:** Your complete Docker image base URL (you'll use this as `GCP_IMAGE_BASE_URL`)

---

### Step 5: Create a Service Account for GitHub Actions

1. In the GCP Console search bar, type **"Service Accounts"** and open **"IAM & Admin → Service Accounts"**
2. Click **"Create Service Account"** (blue button at the top)
3. Fill in:
   - **Service account name**: `github-actions-deployer`
   - **Service account ID**: (auto-filled)
   - **Description**: `Service account for GitHub Actions to deploy Fit Spark`
4. Click **"Create and Continue"**
5. On the "Grant this service account access to project" page, click **"Select a role"** and add these roles one by one (click **"Add Another Role"** after each):
   - `Cloud Run Admin`
   - `Service Account User`
   - `Artifact Registry Writer`
6. Click **"Continue"** → **"Done"**

---

### Step 6: Generate JSON Key for Service Account

1. In the **Service Accounts** list, find and click on **`github-actions-deployer`**
2. Click on the **"Keys"** tab at the top
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"**
6. A `.json` file will automatically download to your computer
7. Open this file with any text editor (Notepad, VS Code, etc.)
8. **Copy the entire contents** of the file (from the opening `{` to the closing `}`)

**Note down:** Keep this JSON content safe - you'll paste it into GitHub Secrets

---

## GitHub Repository Setup

### Step 7: Add GitHub Secrets

Now you'll configure GitHub Secrets that the deployment workflow will use.

1. Go to your GitHub repository on GitHub.com
2. Click **"Settings"** (top right)
3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"** (green button)
5. Add each secret below **one by one**:

---

#### Secret 1: `GCLOUD_SERVICE_KEY`

- **Name**: `GCLOUD_SERVICE_KEY`
- **Value**: Paste the entire JSON content from Step 6 (the downloaded service account key file)
- Click **"Add secret"**

---

#### Secret 2: `GCP_PROJECT_ID`

- **Name**: `GCP_PROJECT_ID`
- **Value**: Your Project ID from Step 3
- **Where to find**: Google Cloud Console → Top bar → Project dropdown → Copy the "ID" column value
- Click **"Add secret"**

---

#### Secret 3: `GCP_REGION`

- **Name**: `GCP_REGION`
- **Value**: The region you selected in Step 2 when creating the Artifact Registry
- **Where to find**: Google Cloud Console → Artifact Registry → Repositories → Look at the "Location" column
- **Examples**: `us-central1`, `asia-south1`, `europe-west1`
- Click **"Add secret"**

---

#### Secret 4: `GCP_IMAGE_BASE_URL`

- **Name**: `GCP_IMAGE_BASE_URL`
- **Value**: The complete Docker image URL you constructed in Step 4
- **Format**: `[REGION]-docker.pkg.dev/[PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]`
- **Example**: `us-central1-docker.pkg.dev/fit-spark-401204/fitspark-repo/fit-spark`
- Click **"Add secret"**

---

#### Secret 5: `CLOUD_RUN_SERVICE_NAME`

- **Name**: `CLOUD_RUN_SERVICE_NAME`
- **Value**: Choose a name for your Cloud Run service (lowercase letters and hyphens only)
- **Example**: `fit-spark` or `fitspark-app`
- Click **"Add secret"**

---

#### Secret 6-15: Application Environment Variables

Add all your application secrets (same values you use in `.env.local` for local development):

| Secret Name | Where to Find Value |
|------------|---------------------|
| `CLERK_SECRET_KEY` | Clerk Dashboard → Your app → API Keys → Secret keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → Your app → API Keys → Publishable keys |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Add endpoint → Copy signing secret |
| `STRIPE_PRICE_WEEKLY` | Stripe Dashboard → Products → Your weekly plan → Copy Price ID |
| `STRIPE_PRICE_MONTHLY` | Stripe Dashboard → Products → Your monthly plan → Copy Price ID |
| `STRIPE_PRICE_YEARLY` | Stripe Dashboard → Products → Your yearly plan → Copy Price ID |
| `OPENAI_API_KEY` | OpenAI Platform → API keys → Create new secret key |
| `DATABASE_URL` | Neon Dashboard → Your project → Connection string |
| `NEXT_PUBLIC_BASE_URL` | Use `http://localhost:3000` for local dev, or your production domain |

---

### Step 8: Verify Your GitHub Workflow File

Make sure your repository has a `.github/workflows/deploy.yml` file. This file should already exist in the repository and will:
1. Trigger on every push to the `main` branch
2. Build a Docker image of your app
3. Push the image to Google Artifact Registry
4. Deploy the image to Cloud Run
5. Configure all environment variables from GitHub Secrets

**You don't need to modify this file** - it's already configured to use the secrets you just added.

---

## Deploying Your App

### First Deployment

1. Make sure all GitHub Secrets from Step 7 are added
2. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Deploy to GCP Cloud Run"
   git push origin main
   ```
3. GitHub Actions will automatically start the deployment
4. Monitor the deployment:
   - Go to your GitHub repository
   - Click the **"Actions"** tab
   - Click on the latest workflow run
   - Watch the deployment logs in real-time

### After First Deployment

1. Once deployment succeeds, go to [Google Cloud Console → Cloud Run](https://console.cloud.google.com/run)
2. Click on your service (the name you used in `CLOUD_RUN_SERVICE_NAME`)
3. Your app is now live at the **URL** shown at the top (e.g., `https://fit-spark-abc123-uc.a.run.app`)
4. Visit the URL to access your deployed application

### Subsequent Deployments

Every time you push to the `main` branch, GitHub Actions will automatically:
- Build your updated code
- Create a new Docker image
- Deploy to Cloud Run
- Your app will update with zero downtime

---

## Monitoring and Troubleshooting

### View Deployment Logs
- **GitHub Actions**: Your repository → Actions tab → Click on workflow run
- **Cloud Run Logs**: GCP Console → Cloud Run → Your service → Logs tab

### Common Issues

**Issue**: Deployment fails with "Permission denied"
- **Solution**: Verify the service account has all required roles (Step 5)

**Issue**: "Repository not found" error
- **Solution**: Check that `GCP_IMAGE_BASE_URL` exactly matches the format from Step 4

**Issue**: Cloud Run service shows errors
- **Solution**: Check Cloud Run logs for missing environment variables or configuration issues

**Issue**: Webhooks not working on GCP
- **Solution**: Update Stripe webhook endpoint URL to your Cloud Run URL + `/api/webhook`

---

## Summary of What You've Done

✅ Enabled Artifact Registry and Cloud Run APIs on GCP  
✅ Created an Artifact Registry repository to store Docker images  
✅ Created a service account with deployment permissions  
✅ Generated a JSON key for GitHub Actions authentication  
✅ Added 15+ GitHub Secrets for deployment and app configuration  
✅ Set up automated CI/CD: every push to `main` → builds → deploys to Cloud Run  

**Your app is now running on Google Cloud with automatic deployments!**

For questions or issues, check:
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

---

## License

[Your License Here]