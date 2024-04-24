#!/bin/sh
set -euxo pipefail

CREDENTIALS="$USERNAME:$PASSWORD"
RELATIVE_POLL_ENDPOINT=$(curl --user $CREDENTIALS -X POST $BASE_URL/api/resourceTables/analytics?skipTrackedEntities=true | jq -r '.response.relativeNotifierEndpoint')
POLL_URL="$BASE_URL$RELATIVE_POLL_ENDPOINT"
TRIES=0

while true; do
    TRIES=$((TRIES + 1))
    COMPLETED=$(curl -fsSL --user $CREDENTIALS $POLL_URL | jq '. | any(.completed == true)')
    if [[ "$COMPLETED" == "true" ]]; then
        echo "Analytics table generation complete" 1>&2
        exit 0
        break
    # Let's give up after 15 minutes (180*5/60)
    elif test $TRIES -ge 180; then
        echo "Analytics table generation timed out" 1>&2
        exit 1
        break
    else
        echo "Polling analytics tables generation"
    fi
    sleep 5
done
