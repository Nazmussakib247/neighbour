FROM php:8.2-apache

# MySQL PDO driver + Apache modules used by .htaccess
RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite headers

# Allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# App is mounted at /var/www/html/neighbour by docker-compose
WORKDIR /var/www/html/neighbour
