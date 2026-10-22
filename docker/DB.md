# DHIS2 Core DB dump contents

The dump is a DHIS2 Core 2.41 Sierra Leone database. It excludes the generated analytics and
resource tables. The `post-install-scripts` service generates these from
`ANALYTICS_FIRST_YEAR` (set in `.env.e2e`) onwards. The same dump is used for every DHIS2
version in the e2e matrix: newer versions upgrade it on first start.

## Creating a new dump

Run `scripts/create-e2e-db-dump.sh`. It needs Docker and writes `docker/db-dump/dump.sql.gz`.
It accepts these environment variables:

-   `DATA_YEAR`: the year the dashboard items show data for. Defaults to last year. Pick a
    year for which the Sierra Leone database has data for every month.
-   `SIERRA_LEONE_DB_URL`: the database to start from. Defaults to the 2.41 Sierra Leone
    database from https://databases.dhis2.org.
-   `DHIS2_IMAGE`: the DHIS2 image that configures the database. Defaults to the one in
    `.env.e2e` and must match the version of the database.

Afterwards:

1. Set `ANALYTICS_FIRST_YEAR` in `.env.e2e` to the same year as `DATA_YEAR`
2. Regenerate the fixtures in `e2e/__fixtures__` for every DHIS2 version in the nightly matrix
3. Attach the dump to a GitHub release and point `DHIS2_DB_DUMP_URL` in `.env.e2e` to it

## What the script changes

The script starts DHIS2 on the Sierra Leone database in `docker/e2e-db/docker-compose.yml`
and makes the following changes:

-   `docker/e2e-db/metadata.json` is imported. It contains:
    -   A role `User impersonator` with the authorities listed in the README:
        `F_IMPERSONATE_USER`, `F_VIEW_EVENT_ANALYTICS` and the `M_` authorities for the
        dashboard, login and analytics apps. It deliberately does not have the `ALL`
        authority, so that the service account matches the recommended production setup.
    -   A few users, who all share the password `Test123!` and have an
        `<username>@example.org` email address:
        -   `push_analytics_admin`: the user that has the `User impersonator` role (and no
            other roles)
        -   `test_user_national`: a user with the default locale, assigned to the top org-unit
        -   `test_user_national_nb`: a user with the `nb` UI locale and the `no` database
            locale, assigned to the top org-unit
        -   `test_user_bo`: a user with the default locale, assigned to the Bo org-unit
        -   `test_user_bonthe`: a user with the default locale, assigned to the Bonthe
            org-unit
    -   A user group `Test users` (`cbyGCxlLq2t`) with all the test users in it
    -   A dashboard `One of everything` (`ceneQPMhemM`) with one item of each type
-   The test users are added to the existing user groups listed in
    `docker/e2e-db/user-group-memberships.json`. These groups give them access to the
    programs and data sets on the dashboards.
-   The dashboard `Measles (user org unit)` (`KQVXh5tlzW2`) gets the Norwegian name
    `Norwegian dashboard name`, and the visualizations `l49Xj5POupZ` and `LW0O27b7TdD` get
    the Norwegian name `Norwegian viz name`.
-   The HTTP cache strategy is set to `NO_CACHE`.
-   The items on both dashboards use fixed periods in `DATA_YEAR` instead of relative
    periods, so the generated HTML does not change over time and no item is empty because
    the current period has no data yet.
-   Email is sent through the fake SMTP server, configured from the `FAKESMTP_` variables
    in `.env.e2e`.
-   The push-analytics URL is set to the template
    http://push-analytics:1337/?dashboardId={id}&username={username}&locale={locale}
    which points at the `push-analytics` service in the docker compose network. When
    running the service on the host instead, use `host.docker.internal` as the host name.
-   Two `HTML_PUSH_ANALYTICS` jobs are created for dashboard `KQVXh5tlzW2` and the
    `Test users` group: one in `RECEIVER` mode and one in `EXECUTOR` mode. They use
    different cron expressions because DHIS2 does not allow two jobs of the same type with
    the same cron expression.
