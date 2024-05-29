[//]: # 'Note: this is the source of truth for DHIS2 Docker images. Any changes to this document need to be manually synced to Dockerhub since we do not have a paid account.'

# Quick reference

-   **Maintained by**:
    [the DHIS2 core team](https://github.com/dhis2/push-analytics)

-   **Where to get help**:
    [the DHIS2 Community of Practice - Tag docker](https://community.dhis2.org/tag/docker)

## Image variants

Semantic versioning is used and this is reflected in the Docker image tags:

-   Latest tag `:latest`
-   Exact version tags `:#.#.#`
-   Prerelease tags: `:#.#.#-rc.#` `:#.#.#-beta.#` `:#.#.#-alpha.#`

## Multi-architecture images

Images are published for `linux/amd64` and `linux/arm64`.

# Background

## About DHIS2

[DHIS2](https://dhis2.org/about) is an open source, web-based platform most commonly used as a
health management information system (HMIS). It allows for data capture through clients ranging from
web browsers, Android devices, Java feature phones and SMS. DHIS2 features data visualization apps
for dashboards, pivot tables, charting and GIS. It provides metadata management and configuration.
The data model and services are exposed through a RESTful Web API.

## About the Push Analytics Service

The Push Analytics Service is an open source, NodeJS based service which can be used to convert dynamic
dashboards from DHIS2 Core into static HTML. As such it only makes sense to install this service alongside
a DHIS2 Core instance. More background information, setup instructions and prerequisites can be found in
the [readme](https://github.com/dhis2/push-analytics/blob/master/README.mdl).

## About the Docker image

The Push Analytics Service uses [Puppeteer](https://pptr.dev/) to convert client-side generated visualizations
into static HTML. Puppeteer is a Node.js library which provides a high-level API to control Chrome/Chromium
over the DevTools Protocol. Because of this the image consists of the following parts:

-   We use the Alpine Linux base image (`alpine:3.20`)
-   Then we install NodeJS, Chromium and a number of libs which are required by Chromium/Puppeteer
-   And finally we add the compiled app and production dependencies

# How to use this image

## Using Docker Compose

The easiest way to get familiar with the Push Analytics Service is to start running it locally using [Docker
Compose](https://docs.docker.com/compose/install/). As mentioned before, the Push Analytics Service
is meant to be deployed alongside a DHIS2 Core instance, so it makes sense to add both as a service in a
Docker Compose file. An [example for a fully functioning setup](https://github.com/dhis2/push-analytics/blob/master/docker-compose.yml) can be found in the root dir of the repo.

It is advisable to create a `.env` file (and add this to `.gitignore`) to populate all the required environment variables.

# License

View [license](https://github.com/dhis2/push-analytics/blob/master/LICENSE) information for the software
contained in this image.

As with all Docker images, these likely also contain other software which may be under other
licenses (such as Bash, etc from the base distribution, along with any direct or indirect
dependencies of the primary software being contained).
