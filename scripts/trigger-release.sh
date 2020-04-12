#!/bin/bash

DIR=$(dirname "${0}")

# Pick current local version hash and send it also for verification -
# We want to make sure CI will publish the version we intended and not something newer.
HASH=$(git rev-parse HEAD)

# Trigger release
"${DIR}/dispatch-event.sh" "trigger-release" "{\"hash\": \"${HASH}\"}"
