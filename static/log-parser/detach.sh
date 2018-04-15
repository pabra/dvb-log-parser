#!/bin/bash

set -x

DIR="$(cd "$(dirname "$0")" && pwd -P)"
IMAGE_NAME='node:8-alpine'
CONTAINER_NAME='dvb-log-parser'

LOG_DIR=/var/log/nginx

docker run \
    --rm \
    --user "$(id -u):$(id -g)" \
    --name $CONTAINER_NAME \
    --volume "${DIR}/dvb-log-parser.js:/usr/local/bin/dvb-log-parser.js:ro" \
    --volume "${DIR}/data:/data" \
    --volume ${LOG_DIR}:/var/log:ro \
    --env 'LOG_FILE_NAME_STARTS_WITH=postdata.dvb.log' \
    $IMAGE_NAME \
    /usr/local/bin/dvb-log-parser.js
