#!/bin/bash
RUN_ID=$(gh run list -w "Deploy to Hostinger VPS" --limit 1 --json databaseId -q '.[0].databaseId')
echo "Waiting for workflow $RUN_ID to complete..."
while true; do
  STATUS=$(gh run view $RUN_ID --json status -q '.status')
  CONCLUSION=$(gh run view $RUN_ID --json conclusion -q '.conclusion')
  if [ "$STATUS" == "completed" ]; then
    echo "Workflow completed with conclusion: $CONCLUSION"
    if [ "$CONCLUSION" == "success" ]; then
      echo "Deploying to prod..."
      ./deploy-to-prod.sh
    else
      echo "Workflow failed. Not deploying."
      exit 1
    fi
    break
  fi
  echo "Status: $STATUS... waiting 10s"
  sleep 10
done
