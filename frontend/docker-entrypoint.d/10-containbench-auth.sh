#!/bin/sh
# Generates the basic-auth password file and the backend API key header for nginx.
# Runs automatically before nginx starts (official nginx image entrypoint).
set -eu

user="${BASIC_AUTH_USER:-admin}"
password="${BASIC_AUTH_PASSWORD:-}"

if [ -z "$password" ]; then
    password="$(head -c 18 /dev/urandom | base64 | tr -d '/+=')"
    echo "containbench: BASIC_AUTH_PASSWORD is not set; generated a password for '$user': $password"
fi

htpasswd -bcB /etc/nginx/.htpasswd "$user" "$password" > /dev/null

api_key="${CONTAINBENCH_API_KEY:-}"
case "$api_key" in
    # nginx expands $name inside header values, so '$' would corrupt or break the config.
    *'"'*|*'\'*|*'$'*) echo "containbench: CONTAINBENCH_API_KEY must not contain quotes, backslashes or '\$'" >&2; exit 1 ;;
esac
printf 'proxy_set_header X-API-Key "%s";\n' "$api_key" > /etc/nginx/containbench-api-key.conf
