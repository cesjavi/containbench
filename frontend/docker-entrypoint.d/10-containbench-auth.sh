#!/bin/sh
# Generates the nginx access config (basic auth or public demo) and the backend API key
# header. Runs automatically before nginx starts (official nginx image entrypoint).
set -eu

case "${DEMO_PUBLIC:-false}" in
    true|TRUE|1|yes)
        # Public demo (e.g. for hackathon judges): no login. nginx still rate-limits runs
        # per IP and the backend refuses external agent endpoints (see DEMO_PUBLIC there).
        echo "auth_basic off;" > /etc/nginx/containbench-auth.conf
        echo "containbench: DEMO_PUBLIC=true -> the dashboard is open to anyone, no login."
        ;;
    *)
        user="${BASIC_AUTH_USER:-admin}"
        password="${BASIC_AUTH_PASSWORD:-}"
        if [ -z "$password" ]; then
            password="$(head -c 18 /dev/urandom | base64 | tr -d '/+=')"
            echo "containbench: BASIC_AUTH_PASSWORD is not set; generated a password for '$user': $password"
        fi
        htpasswd -bcB /etc/nginx/.htpasswd "$user" "$password" > /dev/null
        printf 'auth_basic "ContainBench";\nauth_basic_user_file /etc/nginx/.htpasswd;\n' \
            > /etc/nginx/containbench-auth.conf
        ;;
esac

api_key="${CONTAINBENCH_API_KEY:-}"
case "$api_key" in
    # nginx expands $name inside header values, so '$' would corrupt or break the config.
    *'"'*|*'\'*|*'$'*) echo "containbench: CONTAINBENCH_API_KEY must not contain quotes, backslashes or '\$'" >&2; exit 1 ;;
esac
printf 'proxy_set_header X-API-Key "%s";\n' "$api_key" > /etc/nginx/containbench-api-key.conf
