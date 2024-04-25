# Note that there is also an official puppeteer docker image available
# However that is AMD64 only, so cannot be used on sillicon based macs
# So we are building our own here, but will also provide a link to the
# official image in case we change our minds https://pptr.dev/guides/docker

# The `builder` stage has node_modules with devDependencies and the compiled
# TypeScript files that can be used in production
FROM node:lts AS builder
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,target=/root/.npm npm ci --yes --verbose --ignore-scripts --include=dev
RUN ./scripts/build.sh

# The prod stage only installs dev dependencies and then gets the
# compiled JS assets from the builder stage
FROM node:lts AS prod
WORKDIR /usr/src/app
EXPOSE ${PORT:-1337}
ENV NODE_ENV production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

# Install Chromium etc. into the Ubuntu image (for any architecture)
RUN apt update -qq \
    && apt install -qq -y --no-install-recommends \
    curl \
    git \
    gnupg \
    libgconf-2-4 \
    libxss1 \
    libxtst6 \
    python3 \
    g++ \
    build-essential \
    chromium \
    chromium-sandbox \
    dumb-init \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /src/*.deb

# Only copy compiled JS files
COPY --from=builder ./usr/src/app/dist ./dist
COPY ./package.json .
COPY ./package-lock.json .
# Install production dependencies only, husky hooks skipped by --ignore-scripts
RUN --mount=type=cache,target=/root/.npm npm ci --yes --verbose --omit=dev --ignore-scripts
USER node
CMD node ./dist/index.js