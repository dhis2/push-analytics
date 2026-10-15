#!/bin/bash
set -euo pipefail

CREDENTIALS="$USERNAME:$PASSWORD"
YEAR="$DATA_YEAR"

api() {
    local method="$1" path="$2"
    shift 2
    curl -fsS -g --user "$CREDENTIALS" -X "$method" -H 'Content-Type: application/json' "$@" "$BASE_URL/api/$path"
}

import_metadata() {
    local status
    status=$(api POST 'metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=ALL' -d @"$1" | jq -r '.status')
    if [[ "$status" != "OK" ]]; then
        echo "Metadata import of $1 finished with status $status" 1>&2
        exit 1
    fi
}

until curl -fs -o /dev/null --user "$CREDENTIALS" "$BASE_URL/api/me"; do
    echo "Waiting for DHIS2"
    sleep 10
done

import_metadata metadata.json
echo "Imported users, user role, user group and dashboard"

for group in $(jq -r 'keys[]' user-group-memberships.json); do
    api POST "userGroups/$group/users" -o /dev/null \
        -d "$(jq --arg group "$group" '{additions: [.[$group][] | {id: .}]}' user-group-memberships.json)"
done
echo "Added the test users to the user groups that give access to the programs and data sets"

api POST 'userSettings/keyUiLocale?user=test_user_national_nb&value=nb' -o /dev/null
api POST 'userSettings/keyDbLocale?user=test_user_national_nb&value=no' -o /dev/null
echo "Set the UI and database locale of test_user_national_nb to Norwegian"

api PUT dashboards/KQVXh5tlzW2/translations \
    -d '{"translations":[{"locale":"no","property":"NAME","value":"Norwegian dashboard name"}]}'
for visualization in l49Xj5POupZ LW0O27b7TdD; do
    api PUT "visualizations/$visualization/translations" \
        -d '{"translations":[{"locale":"no","property":"NAME","value":"Norwegian viz name"}]}'
done
echo "Added the Norwegian dashboard and visualization names"

api GET 'metadata?skipSharing=true&fields=:owner&visualizations:filter=id:in:[l49Xj5POupZ,BktEbwJgoxI,WyN08Jo2qpj,GxsiESWvqnt,Ao2PcwdEOeA,LW0O27b7TdD]&maps:filter=id:in:[xIywMQ27ku3,zDP78aJU8nX]&eventVisualizations:filter=id:in:[R4wAb2yMLik,YZzuVprU7aZ,WIxuUpm5m4U]' |
    jq --arg year "$YEAR" '
        def year: [$year];
        def quarters: [range(1; 5) | "\($year)Q\(.)"];
        def second_half_quarters: ["\($year)Q3", "\($year)Q4"];
        def months: [range(1; 13) | "\($year)\(if . < 10 then "0" else "" end)\(.)"];
        def fixed($periods):
            (if .relativePeriods then .relativePeriods |= map_values(false) else . end)
            | .rawPeriods = []
            | .periods = ($periods | map({id: .}));
        def periods_for($id):
            {
                BktEbwJgoxI: quarters,
                Ao2PcwdEOeA: quarters,
                R4wAb2yMLik: second_half_quarters,
                YZzuVprU7aZ: months,
                WIxuUpm5m4U: months
            }[$id] // year;
        {
            visualizations: [.visualizations[] | fixed(periods_for(.id))],
            eventVisualizations: [.eventVisualizations[] | fixed(periods_for(.id))],
            maps: [.maps[] | .mapViews |= map(if .layer | startswith("thematic") then fixed(year) else . end)]
        }' >/tmp/fixed-periods.json
import_metadata /tmp/fixed-periods.json
echo "Switched the dashboard items to fixed periods in $YEAR"

api POST systemSettings -o /dev/null -d "$(jq -n \
    --arg port "$FAKESMTP_PORT" \
    --arg username "$FAKESMTP_AUTHENTICATION_USERNAME" \
    --arg password "$FAKESMTP_AUTHENTICATION_PASSWORD" \
    --arg url "$PUSH_ANALYTICS_URL_TEMPLATE" \
    '{
        keyCacheStrategy: "NO_CACHE",
        keyEmailHostName: "fake-smtp-server",
        keyEmailPort: $port,
        keyEmailUsername: $username,
        keyEmailPassword: $password,
        keyEmailTls: "false",
        keyEmailSender: "push-analytics@example.org",
        keyHtmlPushAnalyticsUrl: $url
    }')"
echo "Configured email, the push analytics URL and no HTTP caching"

for job in 'aVIoDwx6YXl|test-push-analytics-receivers|RECEIVER|0 0 9 ? * *' 'eAaTquPad1T|test-push-analytics-executors|EXECUTOR|0 0 8 ? * *'; do
    IFS='|' read -r id name mode cron <<<"$job"
    api POST jobConfigurations -o /dev/null -d "$(jq -n --arg id "$id" --arg name "$name" --arg mode "$mode" --arg cron "$cron" '{
        id: $id,
        name: $name,
        jobType: "HTML_PUSH_ANALYTICS",
        cronExpression: $cron,
        jobParameters: {dashboard: "KQVXh5tlzW2", receivers: "cbyGCxlLq2t", mode: $mode}
    }')"
done
echo "Created the push analytics jobs"
