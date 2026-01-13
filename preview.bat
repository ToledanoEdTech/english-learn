@echo off
chcp 65001 >nul
echo ========================================
echo   תצוגה מקדימה של גרסה מוכנה
echo   Preview Production Build
echo ========================================
echo.
echo טוען תצוגה מקדימה...
echo Loading preview...
echo.

npm run preview

pause
