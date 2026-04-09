# Include inside `server { listen 443 ssl http2; ... }` for Suhani tenant hostnames.
# Combined stack upstream: suhani_app (same as standalone).

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:;" always;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Tenant-Domain $host;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        location /api/auth/ {
            limit_req zone=login burst=10 nodelay;
            proxy_pass http://suhani_app;
            proxy_buffering off;
        }

        location /api/ {
            limit_req zone=api burst=50 nodelay;
            proxy_pass http://suhani_app;
            proxy_buffering off;
            proxy_request_buffering off;
        }

        location /ws {
            proxy_pass http://suhani_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 86400;
        }

        location /uploads/ {
            alias /var/www/uploads/;
            expires 30d;
            add_header Cache-Control "public, no-transform";
            add_header X-Content-Type-Options "nosniff" always;
        }

        location /_nuxt/ {
            proxy_pass http://suhani_app;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

        location / {
            limit_conn addr 50;
            proxy_pass http://suhani_app;
        }

        location /health {
            access_log off;
            proxy_pass http://suhani_app;
        }

        location ~ /\. {
            deny all;
            return 404;
        }

        error_page 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
