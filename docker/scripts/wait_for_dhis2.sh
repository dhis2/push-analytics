#!/bin/bash

TRIES=0

while true; do
    TRIES=$((TRIES + 1))
    if curl -fsS -o /dev/null --user "$USERNAME:$PASSWORD" "$BASE_URL/api/me"; then
        echo "DHIS2 Core is up" 1>&2
        exit 0
    elif [[ $TRIES -ge 120 ]]; then
        echo "DHIS2 Core did not come up within 20 minutes" 1>&2
        exit 1
    else
        echo "Waiting for DHIS2 Core"
    fi
    sleep 10
done
