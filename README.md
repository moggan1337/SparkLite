# SparkLite ⚡

**Distributed Stream Processing Engine**

## What is SparkLite?

Inspired by Apache Spark, SparkLite is a stream processing engine demonstrating:
- Stream abstraction
- Parallel operators
- DAG execution
- Fault tolerance with checkpoints

## Architecture

```
┌─────────────────────────────────────────────┐
│           SparkLite Application              │
├─────────────────────────────────────────────┤
│              Stream Context                   │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   Map   │  │ Filter  │  │  Join   │    │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │              │              │          │
│  ┌────┴──────────────┴──────────────┴────┐  │
│  │           Partitioner                   │  │
│  └────┬──────────────┬──────────────┬────┘  │
│       │              │              │          │
│  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐    │
│  │ Part 0  │  │ Part 1  │  │ Part N  │      │
│  └─────────┘  └─────────┘  └─────────┘      │
├─────────────────────────────────────────────┤
│            Checkpoint Manager              │
└─────────────────────────────────────────────┘
```

## Features

- ✅ Map/Filter/FlatMap
- ✅ Reduce by key
- ✅ Join streams
- ✅ Hash partitioning
- ✅ Round-robin partitioning
- ✅ DAG execution
- ✅ Checkpointing

## Installation

```bash
npm install sparklite
```

## Usage

```typescript
import { createContext } from 'sparklite';

const ctx = createContext();

// Create a stream from data
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const stream = ctx.registerStream('numbers', numbers);

// Transform: filter evens, then multiply by 2
ctx.filter('numbers', 'evens', n => n % 2 === 0);
ctx.map('evens', 'doubled', n => n * 2);

// Execute
await ctx.execute();

// Or use chaining
const result = ctx
  .registerStream('data', largeDataset)
  .map(x => transform(x))
  .filter(x => predicate(x))
  .reduce(keyFn, reduceFn);
```

## Operators

| Operator | Description |
|----------|-------------|
| `map` | Transform each element |
| `filter` | Keep matching elements |
| `flatMap` | Map and flatten |
| `reduce` | Aggregate by key |
| `join` | Join two streams |
| `aggregate` | Custom aggregation |

## License

MIT
