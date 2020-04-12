#!/bin/bash

# Check event name and client payload
EVENT="$1"
[ "${EVENT}" == "" ] && {
  echo "Usage: ${0} <event> (<payload>)"
  echo "  where"
  echo "    event:   name of the event to dispatch"
  echo "    payload: stringified JSON with client payload (optional)"
  exit 1
}
PAYLOAD="$2"

# Fetch token from .npmrc
NPMRC="${HOME}/.npmrc"
[ -r "${NPMRC}" ] || {
  echo "Missing .npmrc file - authenticate with GitHub first!"
  exit 2
}
TOKEN=$(cat ${NPMRC} | grep '//npm.pkg.github.com/:' | cut -d '=' -f2)
[ "${TOKEN}" == "" ] && {
  echo "Missing GitHub token in .npmrc file - authenticate with GitHub first!"
  exit 2
}

# Build POST data
DATA="{\"event_type\": \"${EVENT}\"";
[ "${PAYLOAD}" != "" ] && {
  DATA+=", \"client_payload\": ${PAYLOAD}";
}
DATA+="}"

# Trigger event
# https://goobar.io/2019/12/07/manually-trigger-a-github-actions-workflow/
echo "Going to trigger '${EVENT}' event..."
curl --request POST \
     -H "Accept: application/vnd.github.everest-preview+json" \
     -H "Authorization: token ${TOKEN}" \
     -w "HTTP Status Code: %{response_code}\n" \
     --data "${DATA}" \
     https://api.github.com/repos/cisco-sbgidm/idp-hook-updates/dispatches
