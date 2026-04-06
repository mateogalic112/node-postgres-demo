
#!/bin/bash
set -e

op item get "node-demo-dev" --vault Personal --fields notesPlain --reveal | sed 's/^"//;s/"$//' > .env.local
chmod 600 .env.local

echo ".env.local pulled from 1Password"
