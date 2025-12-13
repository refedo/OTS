@echo off
echo Running Work Order migration...
npx prisma migrate dev --name add_work_order_module
echo Migration complete!
pause
