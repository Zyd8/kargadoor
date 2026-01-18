# ADB Server for Docker Containers 
# Keep this window open 
@echo off 
echo Starting ADB server in network mode... 
adb -a -P 5037 nodaemon server start 
