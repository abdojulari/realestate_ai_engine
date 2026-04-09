#!/bin/sh
# Certbot deploy hook: reload Nginx after renewed certs land in /etc/letsencrypt/live/
systemctl reload nginx
