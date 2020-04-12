#!/bin/bash

DIR=$(dirname ${0})
${DIR}/dispatch-event.sh "trigger-ci"
