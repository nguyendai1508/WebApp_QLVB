@echo off
taskkill /F /IM chrome.exe
ping 127.0.0.1 -n 3 > nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --restore-last-session
