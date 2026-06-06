# Sentry Alerts for Checkout

This project tags checkout-critical incidents with:

- `workflow=checkout`
- `area=checkout | checkout_params | wompi_webhook | stock | health`
- `issue=<stable_issue_name>`
- `route=<api_route>`
- `status=<wompi_or_order_status>` when available
- `payment_status=<order_payment_status>` when available

## Required Project Settings

Configure these environment variables in Vercel Production:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` if source map upload is enabled
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_TRACES_SAMPLE_RATE=0.1`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1`
- `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0`
- `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1`

Vercel provides `VERCEL_GIT_COMMIT_SHA`; the app uses it as the Sentry release when `SENTRY_RELEASE` is not set.

## Alert Rule: Critical Checkout Failures

Create one issue alert for the `javascript-nextjs` project:

- Name: `Checkout critical failure`
- Environment: `production`
- Triggers:
  - A new issue is created
  - The issue changes state from resolved to unresolved
  - The issue is seen more than `3` times in `5m`
- Filters:
  - Event tag `workflow` equals `checkout`
  - Event level is greater than or equal to `error`
- Actions:
  - Email active members or the owner/team responsible for checkout
  - Add Slack/Discord/PagerDuty later if the store volume grows
- Frequency:
  - `5` minutes

## Alert Rule: Wompi and Stock Warnings

Create a second issue alert:

- Name: `Checkout warning needs review`
- Environment: `production`
- Triggers:
  - The issue is seen more than `5` times in `15m`
- Filters:
  - Event tag `workflow` equals `checkout`
  - Event level equals `warning`
  - Event tag `area` equals `stock` or `wompi_webhook`
- Actions:
  - Email active members
- Frequency:
  - `60` minutes

## First Triage Checklist

For a checkout alert, check these fields first:

- `checkoutIssue.area`
- `checkoutIssue.name`
- `checkoutIssue.orderId`
- `checkoutIssue.orderNumber`
- `checkoutIssue.transactionId`
- `checkoutIssue.reason`
- Vercel runtime logs for the same timestamp/request
- Supabase order, order items, and stock reservations for the same `orderId`

Do not paste customer email, phone, address, Wompi secrets, authorization headers, or payment details into issue comments.
