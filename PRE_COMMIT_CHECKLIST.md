# Pre-Commit Checklist

Before committing to GitHub, verify the following:

## ✅ Security & Sensitive Data

- [ ] `.env` file is in `.gitignore` (already configured ✓)
- [ ] `.env.example` exists with placeholder values (created ✓)
- [ ] No database passwords in committed files
- [ ] No API keys or secrets in code
- [ ] No personal information in code

## ✅ Documentation

- [ ] `README.md` is comprehensive and up-to-date (created ✓)
- [ ] `GITHUB_SETUP.md` exists (created ✓)
- [ ] `.env.example` has all required variables (created ✓)
- [ ] `COMMIT_COMMANDS.txt` quick reference (created ✓)

## ✅ Code Quality

- [ ] No console.log statements in production code (review if needed)
- [ ] No commented-out code blocks
- [ ] No TODO comments that should be issues
- [ ] All TypeScript errors resolved
- [ ] Build succeeds: `npm run build`

## ✅ Dependencies

- [ ] `package.json` is up to date
- [ ] `package-lock.json` is committed
- [ ] No unnecessary dependencies
- [ ] All required packages listed

## ✅ Database

- [ ] Prisma schema is finalized
- [ ] Migrations are up to date
- [ ] No pending schema changes
- [ ] Seed data script works (if applicable)

## ✅ Files to Exclude (already in .gitignore)

- [ ] `node_modules/` ✓
- [ ] `.next/` ✓
- [ ] `.env` files ✓
- [ ] `*.log` files ✓
- [ ] Build artifacts ✓

## ✅ Files to Include

- [ ] All source code (`src/`)
- [ ] Prisma schema (`prisma/schema.prisma`)
- [ ] Configuration files (`package.json`, `tsconfig.json`, etc.)
- [ ] Documentation files
- [ ] `.gitignore`
- [ ] `.env.example`

## ✅ Recent Changes to Commit

### Latest Features Added:
1. **Procurement/Supply** added to scope of work
2. **Payment Terms** page in project wizard (Step 5)
3. **Month & Scope filters** in planning page
4. **Projects Dashboard** improvements:
   - Smart configuration based on scope
   - Production progress calculation (Fit-up, Welding, Visualization average)
   - Out of scope stages display
   - Stage name cleanup (removed "Started")
   - Progress percentages on circles

## ✅ Pre-Push Actions

Before pushing to GitHub:

1. **Test the application**:
   ```bash
   npm run dev
   ```
   - Visit key pages to ensure they work
   - Test login/logout
   - Create a test project

2. **Build the application**:
   ```bash
   npm run build
   ```
   - Ensure build succeeds without errors

3. **Review changes**:
   ```bash
   git status
   git diff
   ```

4. **Check file sizes**:
   - Ensure no large files (>100MB) are being committed
   - Use Git LFS for large files if needed

## ✅ Post-Commit Actions

After pushing to GitHub:

1. **Verify on GitHub**:
   - Visit https://github.com/refedo/OTS
   - Check that all files are present
   - Review README.md display

2. **Test clone**:
   - Clone the repository in a different location
   - Run `npm install`
   - Verify it works

3. **Set up repository settings**:
   - Add repository description
   - Add topics/tags
   - Configure branch protection (optional)
   - Add collaborators if needed

## 🚨 Critical Reminders

- **NEVER commit `.env` file** - Contains sensitive credentials
- **Always use `.env.example`** - For sharing configuration structure
- **Review changes before committing** - Use `git diff`
- **Write meaningful commit messages** - Describe what and why
- **Test before pushing** - Ensure code works

## 📝 Commit Message Template

```
<type>: <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat: Add payment terms to project wizard

- Added Step 5 for payment terms configuration
- Implemented percentage validation (total must be 100%)
- Added payment term CRUD operations
- Updated wizard navigation to 6 steps

Closes #123
```

---

**Ready to commit?** Follow the steps in `COMMIT_COMMANDS.txt` or `GITHUB_SETUP.md`
