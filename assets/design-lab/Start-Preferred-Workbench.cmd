@echo off
setlocal
node "%~dp0..\..\scripts\serve-workbench.mjs" --open
if errorlevel 1 pause
