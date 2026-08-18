@echo off
setlocal

rem Register the Context Capsule companion host with Chrome.
rem
rem Fixes the side panel's "The companion host is not registered" error. The
rem extension id is derived from the signing key in extension/manifest.json, so
rem you do not need to copy it out of chrome://extensions - but you can still
rem pass one as the first argument if you build with a different key.
rem
rem   install-host.bat
rem   install-host.bat abcdefghijklmnopabcdefghijklmnop

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js was not found on PATH. Install Node 20 or newer, then re-run this.
  echo   https://nodejs.org
  echo.
  exit /b 1
)

pushd "%~dp0"
node install-host.mjs %1
set EXIT=%ERRORLEVEL%
popd

if not "%EXIT%"=="0" (
  echo.
  echo Registration failed. See the error above.
  echo.
  exit /b %EXIT%
)

echo.
echo Done. Now quit Chrome completely - every window, and check the tray -
echo then start it again. Chrome only reads this registration at startup.
echo.
exit /b 0
