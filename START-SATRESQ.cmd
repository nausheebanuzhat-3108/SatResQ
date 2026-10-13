@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22.12 or later first.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm ci
 if errorlevel 1 goto failed
)
call npm run build
if errorlevel 1 goto failed
echo Open http://localhost:4173 after the server starts.
call npm start
pause
exit /b
:failed
echo Setup failed. Copy the error above for troubleshooting.
pause
