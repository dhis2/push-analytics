# Note that there is also an official puppeteer docker image available
# However that is AMD64 only, so cannot be used on sillicon based macs
# So we are building our own here, but will also provide a link to the
# official image in case we change our minds https://pptr.dev/guides/docker

# The `builder` stage has node_modules with devDependencies and the compiled
# TypeScript files that can be used in production
FROM zenika/alpine-chrome:with-puppeteer AS builder
WORKDIR /usr/src/app
USER root
COPY . .
RUN --mount=type=cache,target=/root/.npm npm ci --yes --verbose --ignore-scripts --include=dev
RUN ./scripts/build.sh

# The prod stage only installs dev dependencies and then gets the
# compiled JS assets from the builder stage
FROM zenika/alpine-chrome:with-puppeteer AS prod
WORKDIR /usr/src/app
USER root
EXPOSE ${PORT:-1337}
# Only copy compiled JS files
COPY --from=builder ./usr/src/app/dist ./dist
COPY ./package.json .
COPY ./package-lock.json .
# Install production dependencies only, husky hooks skipped by --ignore-scripts
RUN --mount=type=cache,target=/root/.npm npm ci --yes --verbose --omit=dev --ignore-scripts
# This is problematic: when setting the user we run into issues when awaiting downloaded files
# But when not setting the user we may introduce a security risk
# USER node
CMD node ./dist/index.js