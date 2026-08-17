#!/bin/bash
BACKEND_URL="http://localhost:3000"
INSTANCE_NAME="tenant_fbaec340"
PHONE="1234567890"

send_message() {
  local msg="$1"
  echo "----------------------------------------"
  echo "User: $msg"
  local json_payload=$(cat <<JSON
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "${PHONE}@s.whatsapp.net",
      "fromMe": false,
      "id": "msg_${RANDOM}"
    },
    "message": {
      "conversation": "$msg"
    }
  }
}
JSON
)
  curl -s -X POST "$BACKEND_URL/whatsapp/webhook/$INSTANCE_NAME?secret=mysecret" \
       -H "Content-Type: application/json" \
       -d "$json_payload"
  echo ""
  sleep 1
}

send_message "Hello"
send_message "1"
send_message "3"

