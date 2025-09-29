#!/bin/sh

# Start nginx in background
nginx -g "daemon off;" &

# Start Node.js server
cd /app/server && node server.js &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?