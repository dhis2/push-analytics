# Note that there is also an official puppeteer docker image available
# However that is AMD64 only, so cannot be used on silicon based macs
# So we are building our own here, but will also provide a link to the
# official image in case we change our minds https://pptr.dev/guides/docker

# This Dockerfile is a combination (with minor modifications) of `Dockerfile`,
# `with-node/Dockerfile` and `with-puppeteer/Dockerfile` found on
# https://github.com/Zenika/alpine-chrome

FROM alpine:3.20 as base

# Installs latest Chromium package.
RUN apk upgrade --no-cache --available \
    && apk add --no-cache \
    chromium-swiftshader \
    tini \
    make \
    gcc \
    g++ \
    python3 \
    git \
    nodejs \
    npm \
    ttf-freefont \
    font-noto-emoji \
    && apk add --no-cache \
    --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
    font-wqy-zenhei font-ipa font-terminus font-inconsolata font-dejavu font-noto font-noto-cjk font-noto-extra

COPY e2e/docker/browserfonts.conf /etc/fonts/local.conf

# Add Chrome as a user
RUN mkdir -p /usr/src/app \
    && adduser -D chrome \
    && chown -R chrome:chrome /usr/src/app

# Run Chrome as non-privileged
USER chrome
WORKDIR /usr/src/app

ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    CHROMIUM_FLAGS="--disable-software-rasterizer --disable-dev-shm-usage" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENTRYPOINT ["tini", "--"]

FROM base AS builder
WORKDIR /usr/src/app
USER chrome
# Copy all files to container
COPY --chown=chrome . .
# Install all dependencies, including the ones needed to build the production bundle
RUN --mount=type=cache,target=/root/.npm npm ci --yes --verbose --ignore-scripts --include=dev
# Compile TS into JS and place JS files into `./dist`
RUN ./scripts/build.sh

FROM base AS prod
WORKDIR /usr/src/app
USER chrome
EXPOSE ${PORT:-1337}
# Copy compiled JS files
COPY --chown=chrome --from=builder ./usr/src/app/dist ./dist
# Copy all NPM related files, including dev dependencies
COPY --chown=chrome ./package.json .
COPY --chown=chrome ./package-lock.json .
COPY --chown=chrome --from=builder ./usr/src/app/node_modules ./node_modules
# Remove dev dependencies
RUN --mount=type=cache,target=/root/.npm npm prune --production
# Run the Push Analytics Service
ENTRYPOINT [ "node", "./dist/index.js" ]