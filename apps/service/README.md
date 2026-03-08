# Hermes Meta Doc

A support ticket workflow backend built with [Motia](https://www.motia.dev) and the iii engine.

## Prerequisites

- [iii engine](https://www.motia.dev/docs/getting-started/quick-start) (runtime that powers Motia)
- Node.js 18+
- Git

### Install iii

```bash
curl -fsSL https://install.iii.dev/iii/main/install.sh | sh
```

Verify:

```bash
iii -v
```

### Install iii Console (optional, for flow visualization)

```bash
curl -fsSL https://install.iii.dev/console/main/install.sh | sh
```

## Setup

1. Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd hermes-meta-doc
npm install
```

2. (Optional) Create a `.env` file for environment overrides:

```bash
cp .env.example .env  # if available, or create manually
```

Available environment variables (all have defaults in `iii-config.yaml`):

| Variable            | Default      | Description                |
| ------------------- | ------------ | -------------------------- |
| `STREAMS_PORT`      | `3112`       | WebSocket port for streams |
| `OTEL_ENABLED`      | `true`       | Enable OpenTelemetry       |
| `OTEL_SERVICE_NAME` | `iii-engine` | Service name for traces    |

## Running

Start the dev server:

```bash
iii -c iii-config.yaml
```

This starts the iii engine which:

- Runs the REST API on `http://localhost:3111`
- Runs the streams WebSocket on `ws://localhost:3112`
- Watches `src/**/*.ts` for changes and hot-reloads
- Executes `npx motia dev` to compile and register steps

### With the Console

In a separate terminal:

```bash
iii-console --enable-flow
```

Open `http://localhost:3113` to visualize flows and inspect traces.

## Testing the API

Create a ticket:

```bash
curl -X POST http://localhost:3111/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login issue",
    "description": "User cannot log in",
    "priority": "high",
    "customerEmail": "user@example.com"
  }' | jq
```

List all tickets:

```bash
curl http://localhost:3111/tickets | jq
```

Manually triage a ticket:

```bash
curl -X POST http://localhost:3111/tickets/triage \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "<id>", "assignee": "agent-1"}' | jq
```

Manually escalate a ticket:

```bash
curl -X POST http://localhost:3111/tickets/escalate \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "<id>", "reason": "Customer VIP"}' | jq
```

## Project Structure

```
src/
  create-ticket.step.ts      # POST /tickets -- create a support ticket
  triage-ticket.step.ts       # Queue + POST + Cron -- triage tickets
  notify-customer.step.ts     # Queue -- notify customer after triage
  sla-monitor.step.ts         # Cron -- check SLA breaches every 30s
  escalate-ticket.step.ts     # Queue + POST -- escalate breached tickets
  list-tickets.step.ts        # GET /tickets -- list all tickets
iii-config.yaml               # Infrastructure modules config
package.json
tsconfig.json
```

## Flow

```
POST /tickets → ticket::created → triage → ticket::triaged → notify customer
                                                    ↓
                              cron (SLA check) → ticket::sla-breached → escalate
```
