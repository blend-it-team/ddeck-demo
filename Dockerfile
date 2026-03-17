FROM php:8.3-apache AS build

RUN apt-get update && apt-get install -y \
    git unzip curl \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libwebp-dev \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    libsqlite3-dev \
    mariadb-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo pdo_mysql mysqli gd intl zip opcache \
    && a2enmod rewrite headers expires remoteip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --optimize-autoloader

COPY . .
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --optimize-autoloader

FROM php:8.3-apache

RUN apt-get update && apt-get install -y \
    curl \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libwebp-dev \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    libsqlite3-dev \
    mariadb-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo pdo_mysql mysqli gd intl zip opcache \
    && a2enmod rewrite headers expires remoteip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY --from=build /var/www/html /var/www/html

ENV APACHE_DOCUMENT_ROOT=/var/www/html/web

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/*.conf \
    /etc/apache2/apache2.conf \
    /etc/apache2/conf-available/*.conf

RUN chown -R www-data:www-data /var/www/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://127.0.0.1/ || exit 1

EXPOSE 80
