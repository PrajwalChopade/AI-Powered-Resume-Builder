@echo off
echo Installing Python backend dependencies...
cd backend
pip install -r requirements.txt
echo.
echo Dependencies installed successfully!
echo.
echo To start the application, run: npm start
pause
