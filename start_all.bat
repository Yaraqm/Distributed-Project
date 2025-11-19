@echo off
set ROOT=%~dp0

REM ====== AUTH SERVICE ======
start "auth-service" cmd /k "cd /d "%ROOT%services\auth-service" && npm run dev"

REM ====== API GATEWAY (AUTH + ROUTING) ======
start "gateway-auth" cmd /k "cd /d "%ROOT%gateway-auth" && node index.js"

REM ====== EXISTING MICROSERVICES ======
start "doctor-service" cmd /k "cd /d "%ROOT%services\doctor-service" && npm run dev"
start "admin-service" cmd /k "cd /d "%ROOT%services\admin-service" && npm run dev"
start "lab-service" cmd /k "cd /d "%ROOT%services\lab-service" && npm run dev"
start "pharmacy-service" cmd /k "cd /d "%ROOT%services\pharmacy-service" && npm run dev"

REM ====== FRONTEND ======
start "web" cmd /k "cd /d "%ROOT%web" && npm run dev"
