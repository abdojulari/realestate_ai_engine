# Included from deelbot-edge.conf (HTTPS server www.deelbot.com).
# DEELBOT_COM_PROXY_MODE=direct — proxy straight to control plane on 127.0.0.1:3001.

    location /api/webhooks/ {
        limit_req zone=cp_webhooks burst=20 nodelay;
        proxy_pass http://control_plane;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    location /api/tenants {
        limit_req zone=cp_signup burst=5 nodelay;
        proxy_pass http://control_plane;
    }

    location /api/ {
        proxy_pass http://control_plane;
        proxy_buffering off;
    }

    location /_nuxt/ {
        proxy_pass http://control_plane;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://control_plane;
    }

    location ~ /\. {
        deny all;
        return 404;
    }
