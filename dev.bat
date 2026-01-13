@echo off
chcp 65001 >nul
echo ========================================
echo   הפעלת שרת פיתוח
echo   Development Server
echo ========================================
echo.
echo טוען את שרת הפיתוח...
echo Loading development server...
echo.

npm run dev

pause
