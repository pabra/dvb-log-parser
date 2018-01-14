#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd -P)"
SYNC_SRC=${DIR}/dist/
SYNC_DST=/var/www/dvb-log/
SYNC_HOST=dvb.peppnet.de
EXCLUDE_DATA='static/log-parser/data/*'

rsync \
    -avP \
    --delete \
    --exclude=${EXCLUDE_DATA} \
    ${SYNC_SRC} \
    ${SYNC_HOST}:${SYNC_DST}
