Deploy README - linkedin-sniper

Overview
- This repo contains a prebuilt frontend at frontend/build to deploy to Cloudflare Pages.
- Use the GitHub Action (workflow_dispatch) or the local script to deploy.

Cloudflare token requirements
- Create a Cloudflare API Token with the following minimal scopes:
  - Account -> Pages -> Edit (or equivalent pages:edit)
  - Account -> Read (account:read)
- Do NOT use Global API keys. Use a scoped API Token.

Create Token (Cloudflare UI)
1. Go to https://dash.cloudflare.com -> My Profile -> API Tokens -> Create Token
2. Choose "Create Custom Token"
3. Give it a name (e.g., "Pages deploy from CI")
4. Add permissions:
   - Account -> Pages -> Edit
   - Account -> Read
5. (Optional) Restrict to specific Account (choose Soundxy9@gmail.com's Account)
6. Create token and copy it immediately (you will not be able to view it again)

GitHub Actions (recommended)
1. Go to your GitHub repo -> Settings -> Secrets -> Actions -> New repository secret
2. Name: CLOUDFLARE_API_TOKEN
3. Paste the token and save
4. Go to Actions -> Deploy to Cloudflare Pages -> Run workflow -> Deploy

Local deploy
1. Export token: export CLOUDFLARE_API_TOKEN=your_token
2. Run script: ./scripts/deploy_pages.sh

Audit & Safety
- Treat tokens as secrets; rotate if accidentally exposed.
- All deployments via GitHub Actions will be traceable in the Actions audit log.

If you want me to trigger the GitHub Action after you add the secret, tell me and I will run it (I need repository push/trigger access).