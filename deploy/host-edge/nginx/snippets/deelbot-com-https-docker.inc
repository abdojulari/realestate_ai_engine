# Included from deelbot-edge.conf (HTTPS server www.deelbot.com).
# DEELBOT_COM_PROXY_MODE=docker — TLS terminates on host Nginx only; traffic is
# forwarded over HTTP to Suhani Docker Nginx (upstream deelbot_com_docker_http).
# Default 127.0.0.1:9080 = port in NGINX_PUBLISH_HTTP_HOST_PORT or NGINX_PUBLISH_HTTP_PORT — must match upstream deelbot_com_docker_http in host edge.

    proxy_connect_timeout 60s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    client_max_body_size 50m;

    location /api/webhooks/ {
        limit_req zone=cp_webhooks burst=20 nodelay;
        proxy_pass http://deelbot_com_docker_http;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    location /api/tenants {
        limit_req zone=cp_signup burst=5 nodelay;
        proxy_pass http://deelbot_com_docker_http;
    }

    location /api/ {
        proxy_pass http://deelbot_com_docker_http;
        proxy_buffering off;
    }

    location /_nuxt/ {
        proxy_pass http://deelbot_com_docker_http;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://deelbot_com_docker_http;
    }

    location ~ /\. {
        deny all;
        return 404;
    }
