#!/bin/bash

CREDENTIALS="$USERNAME:$PASSWORD"
ANALYTICS_FIRST_YEAR="${ANALYTICS_FIRST_YEAR:-2025}"
LAST_YEARS=$(($(date +%Y) - ANALYTICS_FIRST_YEAR + 1))
# Only skip tracked entities because we need outlier tables and the rest
# Only request analytics table generation from ANALYTICS_FIRST_YEAR onwards to make things quicker and prevent out-of-disk-space issues on GHA
RELATIVE_POLL_ENDPOINT=$(curl --user $CREDENTIALS -X POST $BASE_URL/api/resourceTables/analytics?skipTrackedEntities=true\&lastYears=$LAST_YEARS | jq -r '.response.relativeNotifierEndpoint')
POLL_URL="$BASE_URL$RELATIVE_POLL_ENDPOINT"
TRIES=0

while true; do
    TRIES=$((TRIES + 1))
    NOTIFICATIONS=$(curl -fsSL --user $CREDENTIALS $POLL_URL)
    COMPLETED=$(echo "$NOTIFICATIONS" | jq '. | any(.completed == true)')
    FAILED=$(echo "$NOTIFICATIONS" | jq '. | any(.level == "ERROR")')
    if [[ "$FAILED" == "true" ]]; then
        echo "Analytics table generation failed: $(echo "$NOTIFICATIONS" | jq -r '[.[] | select(.level == "ERROR") | .message] | join("; ")')" 1>&2
        exit 1
    elif [[ "$COMPLETED" == "true" ]]; then
        echo "Analytics table generation complete" 1>&2
        exit 0
        break
    # Let's give up after 30 minutes (30*60/5=360)
    elif test $TRIES -ge 360; then
        echo "Analytics table generation timed out" 1>&2
        exit 1
        break
    else
        echo "Polling analytics tables generation"
    fi
    sleep 5
done
