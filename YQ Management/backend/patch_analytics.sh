#!/bin/bash
sed -i "s/import { toZonedTime, fromZonedTime } from 'date-fns-tz';/import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';/" src/analytics/analytics.service.ts
