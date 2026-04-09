# Included inside each port-80 server block. ^~ beats regex locations; alias matches certbot webroot layout.
location ^~ /.well-known/acme-challenge/ {
    default_type text/plain;
    alias /var/www/certbot/.well-known/acme-challenge/;
}
