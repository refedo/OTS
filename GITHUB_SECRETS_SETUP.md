# GitHub Secrets Setup Guide

## Required Secrets

You need to add these secrets to your GitHub repository for the deployment workflow to work.

### How to Add Secrets:

1. Go to your GitHub repository: https://github.com/refedo/OTS
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following secrets:

---

## Secrets to Add:

### 1. DO_HOST
- **Name:** `DO_HOST`
- **Value:** Your server IP address or domain
- **Example:** `hexasteel.sa` or `123.456.789.0`

### 2. DO_USER
- **Name:** `DO_USER`
- **Value:** SSH username (usually `root`)
- **Example:** `root`

### 3. DO_SSH_KEY
- **Name:** `DO_SSH_KEY`
- **Value:** Your private SSH key

**To get your SSH key:**

On your **local machine**, run:
```bash
cat ~/.ssh/id_rsa
```

Or if you need to generate a new key:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
cat ~/.ssh/id_rsa
```

Then copy the **entire output** (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)

**Add the public key to your server:**
```bash
# On your server
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key (id_rsa.pub content)
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 4. DO_PORT (Optional)
- **Name:** `DO_PORT`
- **Value:** SSH port (default is 22)
- **Example:** `22`

---

## After Adding Secrets:

Once all secrets are added, push your code to trigger the deployment:

```bash
git push origin main
```

Then:
1. Go to **Actions** tab in your GitHub repository
2. Watch the deployment workflow run
3. It will build on GitHub's servers (no memory issues!)
4. Then deploy the built files to your server

---

## Verify Deployment:

After the workflow completes:
1. Check https://ots.hexasteel.sa/itp/new
2. Try creating a new ITP
3. It should work without the 500 error!

---

## Troubleshooting:

If the workflow fails:
- Check the **Actions** tab for error logs
- Verify all secrets are correct
- Make sure SSH key has proper permissions on server
- Ensure the path `/var/www/hexasteel.sa/ots` exists on server
