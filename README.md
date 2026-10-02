# LOOP: Netlify frontend + Render API

Netlify serves the static frontend. Render runs the Express API. The frontend API URL is injected into `frontend/config.js` during the Netlify build from the public `LOOP_API_BASE_URL` build variable. It must be the HTTPS API URL ending in `/api`; it is a public address, not a secret.

## 1. Put the repository in GitHub

Netlify and Render deploy from a Git repository. Push this project to a GitHub repository without `.env`, `node_modules`, or real secrets. `.env` is ignored by Git. Keep API secrets in Render environment settings.

## 2. Create the Netlify site

Import the repository in Netlify. The included `netlify.toml` sets the publish directory to `frontend` and runs `node scripts/netlify-build.js`. The first build needs the Render API URL; create the Netlify site first to get its assigned `*.netlify.app` origin, then continue with Render and return to set the API URL. Netlify's site URL is shown in the site overview.

## 3. Create the Render API service

Use the repository's `render.yaml` as a Render Blueprint. It defines a Node web service with `npm ci`, `npm start`, and the `/api/health` health check. During setup, provide:

- `MONGO_URI` — production MongoDB connection string
- `GROQ_API_KEY`
- `CLIENT_URL` — exact Netlify site origin, such as `https://your-site.netlify.app` (no trailing slash)

The Blueprint generates `JWT_SECRET` and sets `NODE_ENV=production`. Render supplies `PORT`. `GROQ_MODEL` is optional. The API waits for MongoDB before listening. Render's [Node/Express deployment guide](https://render.com/docs/deploy-node-express-app) and [Blueprint reference](https://render.com/docs/blueprint-spec) describe these settings.

## 4. Configure Netlify's API URL and deploy

After Render deploys, copy its `onrender.com` service URL. In Netlify's site environment variables, set `LOOP_API_BASE_URL` to that URL plus `/api`, for example `https://your-api.onrender.com/api`. The included build command writes it into `frontend/config.js`; trigger a new deploy. Netlify's environment variables are applied during builds, so redeploy after changing one. See [Netlify environment variable docs](https://docs.netlify.com/build/environment-variables/get-started/) and [file-based build configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

If either site's URL changes, update the matching variable (`CLIENT_URL` on Render or `LOOP_API_BASE_URL` on Netlify) and redeploy that service. CORS only accepts the exact frontend origin.

Never run `npm run seed` against production. It deletes existing workspaces, users, and feedback before inserting demo records; `seed.js` refuses to run with `NODE_ENV=production`.

## Before public launch

Configure MongoDB backups and network access controls. Rotate any development secrets that may have been shared. The current app still needs distributed authentication rate limiting, secure cookie-based JWT storage instead of `localStorage`, and monitoring/error reporting before handling real customer data at scale. Tests and deployment have not been run from this workspace.

## Local development

1. Configure `.env` for your local MongoDB database and API secrets.
2. Run `npm run dev` from the repository root.
3. In another terminal run `node frontend/server.js`.
4. Open `http://localhost:4173`. The local `frontend/config.js` points to `http://localhost:5000/api`; the Netlify build replaces it with `LOOP_API_BASE_URL`.
