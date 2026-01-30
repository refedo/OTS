# PM2 Crash Investigation & Monitoring Guide

## 🚨 Critical Errors Found in Your System

Based on the terminal logs analysis, the following errors are causing PM2 crashes:

### 1. **Next.js Async Params Error** ✅ FIXED
```
Error: Route "/projects/[id]" used `params.id`. `params` should be awaited before using its properties.
```
**Impact**: This causes route handlers to crash, leading to 502 errors
**Status**: Fixed in all project routes

### 2. **Prisma Model Name Error** ✅ FIXED
```
Error: Cannot read properties of undefined (reading 'findUnique')
prisma.systemSetting is undefined
```
**Impact**: Login page crashes when trying to fetch logo
**Status**: Fixed - changed to `prisma.systemSettings` (plural)

### 3. **401 Unauthorized Errors** ⚠️ MONITORING NEEDED
```
GET /api/dashboard/kpis/summary 401
GET /api/dashboard/objectives/summary 401
```
**Impact**: Session expiration causing cascading failures
**Status**: Related to 2-hour idle timeout system

---

## 📊 How to Investigate PM2 Crashes

### Step 1: Check PM2 Status
```bash
pm2 status
pm2 info hexa-steel-ots
```

### Step 2: View Recent Logs
```bash
# Last 100 lines of error logs
pm2 logs hexa-steel-ots --err --lines 100

# Last 100 lines of all logs
pm2 logs hexa-steel-ots --lines 100

# Real-time monitoring
pm2 logs hexa-steel-ots
```

### Step 3: Check PM2 Log Files
```bash
# Navigate to logs directory
cd /path/to/mrp/logs

# View error log
tail -100 pm2-error.log

# View output log
tail -100 pm2-out.log

# Search for specific errors
grep -i "error" pm2-error.log | tail -50
grep -i "crash" pm2-error.log | tail -50
grep -i "memory" pm2-error.log | tail -50
```

### Step 4: Check Memory Usage
```bash
# Current memory usage
pm2 info hexa-steel-ots | grep memory

# Monitor memory in real-time
pm2 monit
```

### Step 5: Check System Resources
```bash
# Check available memory
free -h

# Check disk space
df -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

---

## 🔍 Common Crash Causes & Solutions

### 1. **Memory Leaks**
**Symptoms**: 
- PM2 restarts due to exceeding memory limit
- Gradual memory increase over time

**Investigation**:
```bash
pm2 logs hexa-steel-ots --err | grep "max_memory_restart"
```

**Solution**:
- ✅ Already increased limit from 1G to 2G
- Monitor if crashes continue
- If needed, increase to 3G or 4G

### 2. **Uncaught Exceptions**
**Symptoms**:
- Sudden crashes with error messages
- Routes returning 502 errors

**Investigation**:
```bash
pm2 logs hexa-steel-ots --err | grep -i "uncaught\|unhandled"
```

**Solution**:
- ✅ Fixed async params errors
- ✅ Fixed Prisma model errors
- Add more try-catch blocks in critical routes

### 3. **Database Connection Issues**
**Symptoms**:
- "Too many connections" errors
- Prisma client errors

**Investigation**:
```bash
pm2 logs hexa-steel-ots --err | grep -i "prisma\|database\|connection"
```

**Solution**:
```javascript
// Check Prisma connection pool settings
// In prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
  // Add connection pool settings if needed
}
```

### 4. **Port Already in Use**
**Symptoms**:
- PM2 can't start
- "EADDRINUSE" errors

**Investigation**:
```bash
lsof -i :3000
netstat -tulpn | grep :3000
```

**Solution**:
```bash
# Kill process using port 3000
kill -9 $(lsof -t -i:3000)

# Then restart PM2
pm2 restart hexa-steel-ots
```

### 5. **Build Errors**
**Symptoms**:
- PM2 starts but app doesn't respond
- Missing dependencies

**Investigation**:
```bash
cd /path/to/mrp
npm run build
```

**Solution**:
```bash
# Rebuild the application
npm install
npm run build
pm2 restart hexa-steel-ots
```

---

## 🛠️ PM2 Management Commands

### Restart & Reload
```bash
# Graceful reload (zero-downtime)
pm2 reload hexa-steel-ots

# Hard restart
pm2 restart hexa-steel-ots

# Restart all apps
pm2 restart all
```

### Stop & Start
```bash
# Stop app
pm2 stop hexa-steel-ots

# Start app
pm2 start hexa-steel-ots

# Delete from PM2 list
pm2 delete hexa-steel-ots

# Start with ecosystem file
pm2 start ecosystem.config.js
```

### Monitoring
```bash
# Interactive monitoring
pm2 monit

# List all processes
pm2 list

# Detailed info
pm2 info hexa-steel-ots

# Show logs
pm2 logs hexa-steel-ots
```

### Save & Startup
```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Resurrect saved processes after reboot
pm2 resurrect
```

---

## 📈 Monitoring Best Practices

### 1. Set Up Log Rotation
```bash
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 2. Enable PM2 Plus (Optional)
```bash
pm2 link <secret_key> <public_key>
```
This provides:
- Real-time monitoring dashboard
- Exception tracking
- Custom metrics
- Email/Slack alerts

### 3. Create Health Check Script
Create `scripts/health-check.sh`:
```bash
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $response != "200" ]; then
  echo "Health check failed with status $response"
  pm2 restart hexa-steel-ots
fi
```

Add to crontab:
```bash
*/5 * * * * /path/to/scripts/health-check.sh
```

### 4. Monitor Disk Space
```bash
# Check if logs directory is growing too large
du -sh /path/to/mrp/logs

# Clean old logs if needed
find /path/to/mrp/logs -name "*.log" -mtime +7 -delete
```

---

## 🚀 Quick Recovery Checklist

When PM2 crashes, follow these steps:

1. **Check PM2 status**
   ```bash
   pm2 status
   ```

2. **View last 50 error lines**
   ```bash
   pm2 logs hexa-steel-ots --err --lines 50
   ```

3. **Check memory usage**
   ```bash
   pm2 info hexa-steel-ots | grep memory
   free -h
   ```

4. **Restart PM2**
   ```bash
   pm2 restart hexa-steel-ots
   ```

5. **Monitor for 5 minutes**
   ```bash
   pm2 logs hexa-steel-ots
   ```

6. **If crash persists, check system resources**
   ```bash
   df -h
   top -bn1
   ```

7. **Last resort: Full rebuild**
   ```bash
   cd /path/to/mrp
   npm install
   npm run build
   pm2 restart hexa-steel-ots
   ```

---

## 📞 Emergency Contact Points

### Critical Errors to Watch For:
1. **Memory limit exceeded** → Increase memory in ecosystem.config.js
2. **Uncaught exceptions** → Check error logs for stack traces
3. **Database connection errors** → Check MySQL status and connection pool
4. **Port conflicts** → Kill conflicting processes
5. **Build failures** → Rebuild application

### Log Locations:
- PM2 Logs: `/path/to/mrp/logs/`
- Next.js Logs: Console output in PM2 logs
- System Logs: `/var/log/syslog` (Linux)

---

## 🔧 Updated PM2 Configuration

Your new configuration includes:
- ✅ Memory limit: 2G (increased from 1G)
- ✅ Listen timeout: 30s (increased from 10s)
- ✅ Kill timeout: 10s (increased from 5s)
- ✅ Max restarts: 15 (increased from 10)
- ✅ Min uptime: 30s (increased from 10s)
- ✅ Exponential backoff: 4s + 100ms exponential
- ✅ Graceful shutdown enabled

Apply changes:
```bash
pm2 reload ecosystem.config.js
pm2 save
```

---

## 📝 Next Steps

1. **Monitor for 24 hours** after applying fixes
2. **Check logs daily** for any new error patterns
3. **Set up alerts** if crashes continue
4. **Consider PM2 Plus** for advanced monitoring
5. **Document any new issues** in this guide

---

## 🎯 Prevention Tips

1. **Always test locally** before deploying
2. **Use try-catch blocks** in all async functions
3. **Validate all user inputs** before processing
4. **Monitor memory usage** regularly
5. **Keep dependencies updated** (but test first)
6. **Use TypeScript** to catch errors at compile time
7. **Add error boundaries** in React components
8. **Implement proper logging** throughout the app
9. **Set up automated tests** for critical paths
10. **Review PM2 logs weekly** for patterns
