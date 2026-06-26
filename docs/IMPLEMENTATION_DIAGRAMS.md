# Implementation Diagrams

## Runtime Component Map

```mermaid
flowchart TD
  Operator[Operator]
  CLI[jinn CLI]
  Gateway[Gateway daemon]
  API[API router]
  Web[React dashboard]
  Sessions[Session registry]
  Engines[Engine CLI adapters]
  Connectors[Connectors]
  Orchestration[Orchestration runtime]
  Files[Managed files]
  Home[(Jinn home)]

  Operator --> CLI
  CLI --> Gateway
  Operator --> Web
  Web --> API
  Gateway --> API
  API --> Sessions
  API --> Files
  API --> Orchestration
  Sessions --> Home
  Files --> Home
  Orchestration --> Home
  Gateway --> Engines
  Gateway --> Connectors
```

Evidence: `README.md`, `packages/jinn/bin/jinn.ts`, `packages/jinn/src/gateway/api.ts`,
`packages/web/src/main.tsx`, `packages/jinn/src/sessions/`, `packages/jinn/src/engines/`.

## Documentation Map

```mermaid
flowchart TD
  Readme[README.md]
  Index[docs/INDEX.md]
  Manual[docs/USER_MANUAL.md]
  Architecture[docs/ARCHITECTURE.md]
  Spec[docs/SPECIFICATION.md]
  Diagrams[docs/IMPLEMENTATION_DIAGRAMS.md]
  Tests[docs/TEST_LEDGER.md]
  Todos[docs/TODO_LEDGER.md]
  Decisions[docs/DECISION_LOG.md]
  Summaries[Session and audit summaries]
  RawLocal[Local raw logs and audits]

  Readme --> Index
  Index --> Manual
  Index --> Architecture
  Index --> Spec
  Architecture --> Diagrams
  Index --> Tests
  Index --> Todos
  Index --> Decisions
  Index --> Summaries
  Summaries --> RawLocal
```

Evidence: `docs/INDEX.md`, `AGENTS.md`, `docs/LOG_ARCHIVE.md`.

## API Routing Flow

```mermaid
flowchart TD
  Request[HTTP request /api/*]
  Api[handleApiRequest]
  Auth[Auth routes]
  OrchestrationRoutes[Orchestration routes]
  Status[Status/session/org/etc routes]
  Files[Files facade]
  Talk[Talk API]
  Response[JSON or stream response]

  Request --> Api
  Api --> Auth
  Api --> OrchestrationRoutes
  Api --> Status
  Api --> Talk
  Api --> Files
  Auth --> Response
  OrchestrationRoutes --> Response
  Status --> Response
  Talk --> Response
  Files --> Response
```

Evidence: `packages/jinn/src/gateway/api.ts`, `packages/jinn/src/gateway/api/orchestration-routes.ts`,
`packages/jinn/src/gateway/files.ts`, `packages/jinn/src/talk/routes.ts`.
