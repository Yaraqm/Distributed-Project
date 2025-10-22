@echo off
set ROOT=%~dp0

start "doctor-service" cmd /k "cd /d "%ROOT%services\doctor-service" && npm run dev"
start "admin-service" cmd /k "cd /d "%ROOT%services\admin-service" && npm run dev"
start "lab-service" cmd /k "cd /d "%ROOT%services\lab-service" && npm run dev"
start "pharmacy-service" cmd /k "cd /d "%ROOT%services\pharmacy-service" && npm run dev"
start "web" cmd /k "cd /d "%ROOT%web" && npm run dev"
