@echo off
chcp 65001 >nul
echo ========================================
echo   בניית גרסה מוכנה
echo   Production Build
echo ========================================
echo.
echo בונה את הפרויקט...
echo Building project...
echo.

npm run build

echo.
echo ========================================
echo   הבנייה הושלמה!
echo   Build completed!
echo ========================================
echo.
echo הקבצים נמצאים בתיקיית dist/
echo Files are in the dist/ folder
echo.

pause
