# @bow/agent — BOW Agent V3.3 Standalone Engine

Autonomous Enterprise AI Agent Engine extracted from monolithic e-commerce application (Shop of BOW).

## Architecture

BOW Agent operates strictly over abstract domain Provider interfaces:
- `CatalogProvider`: Product discovery and pricing resolution
- `OrderProvider`: Customer order history and warranty evaluation
- `WalletProvider`: Balance checks and VietQR deposit instructions
- `KnowledgeProvider`: FAQs and negative policies
- `AnalyticsProvider`: Ingest and telemetry
- `ActionHandler`: Local semantic event dispatch
- `StorageAdapter`: Persistence abstraction
- `LlmProvider`: Gemini and future LLM models
- `RobotAdapter`: Sensor and speech integration boundary for BOW Robot

## Installation

```bash
npm install
```

## Compilation & Typecheck

```bash
npm run typecheck
```

## Testing

```bash
npm run test
```
