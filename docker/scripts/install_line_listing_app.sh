#!/bin/sh
set -euxo pipefail

CREDENTIALS="$USERNAME:$PASSWORD"
APP_ID=$(curl -fsSL --user $CREDENTIALS $BASE_URL/api/appHub | jq -r '.[] | select(.name == "Line Listing") | .id')
DHIS2_VERSION=$(curl -fsSL --user $CREDENTIALS $BASE_URL/api/system/info | jq -r '.version' | cut -d '.' -f 1,2)
LATEST_APP_VERSION_ID=$(curl -fsSL --user $CREDENTIALS $BASE_URL/api/appHub/v2/apps/$APP_ID/versions?minDhisVersion=lte:$DHIS2_VERSION | jq -r '.result[0].id // empty')

if [[ -n "\$LATEST_APP_VERSION_ID" ]]; then
    curl -fsSL --user $CREDENTIALS -X POST $BASE_URL/api/appHub/$LATEST_APP_VERSION_ID
    exit 0
else
    echo "No compatible app version found for DHIS2 version $DHIS2_VERSION" 1>&2
    exit 1
fi
