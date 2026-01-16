# 🔐 Login Credentials & Troubleshooting

## ✅ Default Admin Account

The database was just seeded with this admin account:

```
Email:    admin@hexa.local
Password: Admin@12345
```

---

## 🐛 Current Error: "Unexpected token '<', "<!DOCTYPE"..."

This error means the API is returning HTML instead of JSON, which indicates a server-side error.

### **Possible Causes:**

1. **Server not running properly**
2. **Database connection issue**
3. **Missing dependencies**
4. **API route error**

---

## 🔧 Troubleshooting Steps

### **Step 1: Restart the Dev Server**

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### **Step 2: Check Browser Console**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in again
4. Look for error messages
5. Share the error details

### **Step 3: Check Network Tab**

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Click on the `/api/auth/login` request
5. Check the Response tab
6. See what HTML is being returned

### **Step 4: Verify Database Connection**

Check Prisma Studio is working:
```
http://localhost:5556
```

Look for the User table and verify `admin@hexa.local` exists.

### **Step 5: Check Server Terminal**

Look at your terminal where `npm run dev` is running.
Check for any error messages when you try to login.

---

## 🔍 Quick Database Check

Run this to verify the admin user exists:

```bash
npx prisma studio
```

Then:
1. Open `http://localhost:5556`
2. Click on **User** table
3. Look for `admin@hexa.local`
4. Verify:
   - Email: `admin@hexa.local`
   - Status: `active`
   - Role is assigned

---

## 🔄 If User Doesn't Exist

Re-run the seed script:

```bash
npx tsx prisma/seed.ts
```

This will create:
- Admin user: `admin@hexa.local` / `Admin@12345`
- Roles: Admin, Manager, Engineer, Operator
- Departments: Production, Design
- Sample projects and buildings

---

## 🚀 Alternative: Create User Manually

If seeding fails, create user directly in Prisma Studio:

1. Open Prisma Studio: `npx prisma studio`
2. Go to **Role** table
3. Note the ID of "Admin" role
4. Go to **User** table
5. Click **Add Record**
6. Fill in:
   - name: `System Admin`
   - email: `admin@hexa.local`
   - password: (You'll need to hash it - see below)
   - status: `active`
   - roleId: (paste Admin role ID)
7. Save

### **To Hash Password:**

Create a temporary script:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@12345', 10).then(console.log)"
```

Copy the output and use it as the password value.

---

## 📊 What to Check in Browser Console

When you try to login, you should see:

**Success:**
```
(no errors)
```

**Failure - Server Error:**
```
Server error: <!DOCTYPE html>...
```

**Failure - Invalid Credentials:**
```
Login error: Invalid credentials
```

---

## 🔧 Common Issues & Solutions

### **Issue: "Server error. Please check the console"**

**Solution:**
1. Check server terminal for errors
2. Restart dev server
3. Check database connection
4. Verify all dependencies installed: `npm install`

### **Issue: "Invalid credentials"**

**Solution:**
1. Verify email: `admin@hexa.local` (exact match)
2. Verify password: `Admin@12345` (case-sensitive)
3. Check user status is "active" in database
4. Re-run seed script

### **Issue: Can't connect to database**

**Solution:**
1. Check `.env` file has correct `DATABASE_URL`
2. Verify MySQL is running
3. Test connection: `npx prisma db pull`

---

## 📝 Next Steps

1. **Restart server** - Most important!
2. **Check browser console** - See actual error
3. **Check server terminal** - See backend error
4. **Verify user in Prisma Studio**
5. **Try login again**

---

## 🆘 If Still Not Working

Please share:
1. Error message from browser console
2. Error message from server terminal
3. Screenshot of Prisma Studio User table
4. Response from Network tab in DevTools

---

**Current Status:**
- Database: ✅ Seeded
- Admin User: ✅ Created (should exist)
- Login Form: ✅ Updated with better error handling
- Next: Restart server and try again

**Login URL:** `http://localhost:3000/login`
