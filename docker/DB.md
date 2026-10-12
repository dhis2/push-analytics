# DHIS2 Core DB dump contents

The dump is a DHIS2 Core 2.41 Sierra Leone database. It is created with
`npm run db-dump:default`, so it excludes the generated analytics and resource tables. The
`post-install-scripts` service generates these from `ANALYTICS_FIRST_YEAR` (default
`2025`) onwards. The same dump is used for every DHIS2 version in the e2e matrix: newer
versions upgrade it on first start.

Prior to creating the dump, the following configuration was done to the database:

-   A new role `User impersonator` was created with the authorities listed in the README:
    `F_IMPERSONATE_USER`, `F_VIEW_EVENT_ANALYTICS` and the `M_` authorities for the
    dashboard, login and analytics apps. It deliberately does not have the `ALL` authority,
    so that the service account matches the recommended production setup.
-   A few users, who all share the same password `Test123!` and all have an
    `<username>@example.org` email address were created:
    -   `push_analytics_admin`: the user that has the `User impersonator` role (and no other roles)
    -   `test_user_national`: a user with the default locale, assigned to the top org-unit
    -   `test_user_national_nb`: a user with the NB locale, assigned to the top org-unit
    -   `test_user_bo`: a user with the default locale, assigned to the Bo org-unit
    -   `test_user_bonthe`: a user with the default locale, assigned to the Bonthe org-unit
-   A user group `Test users` (`cbyGCxlLq2t`) was created with all the test users in it
-   The system was configured to send email using the fake SMTP server:
    -   Most fields can simply be set using the email section of the system settings app
    -   One exception is the port, which needs to be set via a POST to
        `systemSettings/keyEmailPort` because the UI only allows a few fixed options
-   The push-analytics URL was created by issuing a POST to `/systemSettings/keyHtmlPushAnalyticsUrl`.
    Note that this URL needs to be a "template" like this:
    http://push-analytics:1337/?dashboardId={id}&username={username}&locale={locale}
    This points at the `push-analytics` service in the docker compose network. When running
    the service on the host instead, use `host.docker.internal` as the host name.
-   A push-analytics jobs was created in the job-scheduler for both the `RECEIVER` and
    the `EXECUTOR` mode. This was done by issuing a POST to `/jobConfigurations` with a
    payload like this:
    ```json
    {
        "name": "test-push-analytics-receivers",
        "jobType": "HTML_PUSH_ANALYTICS",
        "jobParameters": {
            "dashboard": "KQVXh5tlzW2",
            "receivers": "cbyGCxlLq2t",
            "mode": "RECEIVER"
        },
        "cronExpression": "0 0 9 ? * *"
    }
    ```
    Note that there is a system restriction on having 2 jobs of the same type sharing the
    same cron expression, so be sure to use a slightly different one in both
-   The items on the dashboards used by the e2e suite (`KQVXh5tlzW2` and `ceneQPMhemM`) use
    fixed periods in 2025 instead of relative periods, so the generated HTML does not change
    over time and no item is empty because the current period has no data yet.
-   Events and enrollments without an organisation unit were removed using the scripts in the
    [2.42 migration notes](https://github.com/dhis2/dhis2-releases/blob/master/releases/2.42/migration-notes.md#null-organisation-unit).
    Without this the database cannot be upgraded to 2.42 or later.
