#!/bin/sh
# Generates /usr/share/nginx/html/env-config.js at container startup.
# All REACT_APP_* environment variables are injected as window.__ENV__.

ENV_FILE="/usr/share/nginx/html/env-config.js"

cat > "$ENV_FILE" <<EOF
window.__ENV__ = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-http://localhost:4000}",
  METRICS_ENDPOINT: "${METRICS_ENDPOINT:-}",
  NODE_ENV: "${NODE_ENV:-production}"
};
EOF

echo "[entrypoint] Generated $ENV_FILE"
