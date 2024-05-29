# DHIS2 Core DB dump contents

Prior to creating the dump, the following configuration was done to the database:

-   Generated resource and analytics tables, incl. outlier data. Unlike normal DHIS2
    Core DB dumps, we do not exclude the generated tables from the export, so the
    instance is ready for use immediately.
-   A new role `User impersonator`, with the `IMPERSONATE_USER` authority was created
-   A few users, who all share the same password `Test123!` and all have an email
    address were created:
    -   `push_analytics_admin`: the user that has the `User impersonator` role
    -   `test_user_national`: a user with the default locale, assigned to the top org-unit
    -   `test_user_national_nb`: a user with the NB locale, assigned to the top org-unit
    -   `test_user_bo`: a user with the default locale, assigned to the Bo org-unit
    -   `test_user_bonthe`: a user with the default locale, assigned to the Bonthe org-unit
-   A user group `Test users` was created with all the test users in it
-   The system was configured to send email using the fake SMTP server:
    -   Most fields can simply be set using the email section of the system settings app
    -   One exception is the port, which needs to be set via a POST to
        `systemSettings/keyEmailPort` because the UI only allows a few fixed options
-   The push-analytics URL was created by issuing a POST to `/systemSettings/keyHtmlPushAnalyticsUrl`.
    Note that this URL needs to be a "template" like this:
    http://host.docker.internal:1337?username={username}&dashboardId={id}
-   A push-analytics jobs was created in the job-scheduler for both the `RECEIVER` and
    the `EXECUTOR` mode. This was done by issuing a POST to `/jobConfigurations` with a
    payload like this:
    ```json
    {
        "name": "test-push-analytics-receivers",
        "jobType": "HTML_PUSH_ANALYTICS",
        "jobParameters": {
            "dashboard": "KQVXh5tlzW2",
            "receivers": "o2I7denYO8U",
            "mode": "RECEIVER"
        },
        "cronExpression": "0 0 9 ? * *"
    }
    ```
    Note that there is a system restriction on having 2 jobs of the same type sharing the
    same cron expression, so be sure to use a slightly different one in both
