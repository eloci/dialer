FROM alpine:3.18

RUN apk add --no-cache \
    kamailio \
    kamailio-websocket \
    kamailio-json \
    kamailio-tls \
    kamailio-utils

EXPOSE 5060/udp 5060/tcp 8088/tcp

CMD ["kamailio", "-DD", "-E", "-m", "64"]
