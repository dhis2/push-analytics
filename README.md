# Push Analytics

## Setting things up

### Environment variables

This app needs to establish an authenticated connection to a DHIS2 Core backend and relies on some environment variables to do so. If these variables are not found, then default values will be used and a message is logged to the console.

| ENV variable name          | Default value           | Description                                                             |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `HOST`                     | `localhost`             | Host for the Http server                                                |
| `PORT`                     | `1337`                  | Port for the Http server                                                |
| `DHIS2_CORE_URL`           | `http://localhost:8080` | Host of the DHIS2 Core instance                                         |
| `DHIS2_CORE_MAJOR_VERSION` | `40`                    | API version to use when issuing API requests to the DHIS2 Core instance |
| `DHIS2_CORE_USERNAME`      | `admin`                 | DHIS2 Core username                                                     |
| `DHIS2_CORE_PASSWORD`      | `district`              | DHIS2 Core password                                                     |

In development mode this application uses [dotenv](https://github.com/motdotla/dotenv#readme) to load environment variables from a `.env` at the project root. This file is being gitignored, because it may contain sensitive information. Below is an example of a valid `.env` file which you can copy-paste into the project root:

```
HOST=localhost
PORT=1337
DHIS2_CORE_URL=http://localhost:8080
DHIS2_CORE_MAJOR_VERSION=40
DHIS2_CORE_USERNAME=admin
DHIS2_CORE_PASSWORD=district
```

### Installing dependencies

Run `yarn install`

### Using the application

To start the application in development run `yarn start:dev`. To try out dashboard-to-email conversion, issue a GET request to `host:port/dashboardId` (i.e. with default environment variable values, and using a dashboard ID from the Sierra Leone database, the following URL would be valid `http://localhost:1337/JW7RlN5xafN`)
