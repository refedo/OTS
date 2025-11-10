# GitHub Setup Guide for Hexa Steel® OTS

## Prerequisites

1. **Install Git** (if not already installed):
   - Download from: https://git-scm.com/download/win
   - During installation, select "Git from the command line and also from 3rd-party software"
   - Restart your terminal/IDE after installation

2. **GitHub Account**:
   - Ensure you have access to: https://github.com/refedo/OTS

## Step 1: Initialize Git Repository

Open Git Bash or Command Prompt in the project folder and run:

```bash
cd c:/Users/Walid/CascadeProjects/mrp
git init
```

## Step 2: Configure Git (First Time Only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Add Remote Repository

```bash
git remote add origin https://github.com/refedo/OTS.git
```

## Step 4: Create .env.example (Important!)

Before committing, ensure you have a `.env.example` file (without sensitive data):

```bash
# Copy your .env to .env.example and remove sensitive values
cp .env .env.example
```

Then edit `.env.example` and replace actual values with placeholders:
- Database passwords → `your_database_password`
- API keys → `your_api_key_here`
- Session secrets → `your_session_secret_here`

## Step 5: Stage All Files

```bash
git add .
```

## Step 6: Create Initial Commit

```bash
git commit -m "Initial commit: Hexa Steel OTS - Complete ERP System

Features:
- Project Management with Wizard
- Document Control & Timeline
- Production Management & Logs
- Assembly Parts Management
- Procurement & Purchase Orders
- Initiatives & Tasks
- Operations Dashboard
- Planning & Scheduling
- User Management & Roles
- Complete Authentication System
"
```

## Step 7: Push to GitHub

### If repository is empty (first push):

```bash
git branch -M main
git push -u origin main
```

### If repository already has content:

```bash
# Pull existing content first
git pull origin main --allow-unrelated-histories

# Resolve any conflicts if they occur
# Then push
git push -u origin main
```

## Step 8: Verify

Visit https://github.com/refedo/OTS to see your code!

## Future Commits

After the initial setup, use these commands for future updates:

```bash
# Check what files changed
git status

# Stage specific files
git add path/to/file

# Or stage all changes
git add .

# Commit with a message
git commit -m "Description of changes"

# Push to GitHub
git push
```

## Common Git Commands

```bash
# View commit history
git log --oneline

# View current branch
git branch

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Pull latest changes
git pull

# View remote URL
git remote -v
```

## Troubleshooting

### Authentication Issues

If you get authentication errors, you may need to:

1. **Use Personal Access Token** (recommended):
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token with `repo` permissions
   - Use token as password when pushing

2. **Or configure SSH**:
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   # Add the public key to GitHub Settings → SSH Keys
   git remote set-url origin git@github.com:refedo/OTS.git
   ```

### Large Files

If you have large files (>100MB), use Git LFS:

```bash
git lfs install
git lfs track "*.xlsx"
git lfs track "*.pdf"
git add .gitattributes
git commit -m "Configure Git LFS"
```

## Important Files to Review Before Pushing

1. ✅ `.gitignore` - Ensure sensitive files are excluded
2. ✅ `.env.example` - Template without sensitive data
3. ✅ `README.md` - Project documentation
4. ✅ `package.json` - Dependencies list
5. ⚠️ `.env` - Should NOT be committed (check .gitignore)

## Next Steps After Push

1. Add a comprehensive README.md to the repository
2. Set up GitHub Actions for CI/CD (optional)
3. Configure branch protection rules
4. Add collaborators if needed
5. Create project documentation in GitHub Wiki

---

**Repository URL**: https://github.com/refedo/OTS
**Project**: Hexa Steel® Operations Tracking System (OTS)
