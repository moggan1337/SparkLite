# SparkLite ⚡

**Distributed Stream Processing Engine - Inspired by Apache Spark**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## Overview

SparkLite is a stream processing engine demonstrating distributed data processing concepts:

- **Stream Abstractions** - Continuous data flows
- **Parallel Operators** - Map, Filter, Reduce, Join
- **DAG Execution** - Directed Acyclic Graph for optimization
- **Partitioning** - Data distribution across workers
- **Checkpointing** - Fault tolerance with recovery

## Why SparkLite?

- **Learn Distributed Computing** - See how Spark works
- **Fault Tolerance** - Understand checkpoint/recovery
- **Optimization** - See DAG optimization in action
- **Scalability** - Partitioning and parallel execution

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   SparkLite Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Stream Context                        │  │
│  │                                                        │  │
│  │   val stream = ctx.read("events")                      │  │
│  │         .map(parse)                                    │  │
│  │         .filter(isValid)                               │  │
│  │         .reduceByKey(sum)                              │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    DAG Optimizer                        │  │
│  │                                                        │  │
│  │   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐          │  │
│  │   │Read │───►│Map  │───►│Filter│───►│Reduce│         │  │
│  │   └─────┘    └─────┘    └─────┘    └─────┘          │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Partitioned Execution                      │  │
│  │                                                        │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐            │  │
│  │   │Partition│  │Partition│  │Partition│   ...        │  │
│  │   │    0    │  │    1    │  │    2    │            │  │
│  │   └────┬────┘  └────┬────┘  └────┬────┘            │  │
│  │        │             │             │                   │  │
│  │        └─────────────┴─────────────┘                   │  │
│  │              Shuffle (if needed)                      │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Checkpoint Manager                        │  │
│  │                                                        │  │
│  │   Checkpoint 1 ──► Checkpoint 2 ──► Checkpoint 3     │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Stream Processing Model

```
┌─────────────────────────────────────────────────────────────┐
│                  Stream Processing Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Data Source        Transformations        Data Sink        │
│                                                              │
│   ┌────────┐        ┌────────────┐        ┌────────┐       │
│   │  Kafka │───────►│   Map     │───────►│  DB    │       │
│   │  File  │        │  Filter   │        │  File  │       │
│   │  Socket│        │  FlatMap  │        │  HTTP  │       │
│   └────────┘        │  GroupBy  │        └────────┘       │
│                     │  Join     │                          │
│                     └───────────┘                          │
│                                                              │
│   ════════════════════════════════════════════════          │
│                    Time Window                               │
│   ════════════════════════════════════════════════          │
│                                                              │
│   Event 1 ──► Event 2 ──► Event 3 ──► Event 4 ──►        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Operators

### Map

Transform each element:

```typescript
import { createContext } from 'sparklite';

const ctx = createContext();

const stream = ctx.registerStream('numbers', [1, 2, 3, 4, 5]);

ctx.map('numbers', 'doubled', (n: number) => n * 2);

// Result: [2, 4, 6, 8, 10]
```

### Filter

Keep matching elements:

```typescript
ctx.filter('numbers', 'evens', (n: number) => n % 2 === 0);

// Result: [2, 4]
```

### FlatMap

Map and flatten:

```typescript
ctx.flatMap('words', 'chars', (word: string) => word.split(''));

// "hello" → ["h", "e", "l", "l", "o"]
```

### Reduce

Aggregate by key:

```typescript
ctx.reduce(
  'sales',
  'totals',
  (sale: any) => sale.product,      // key function
  (a: any, b: any) => ({             // reduce function
    product: a.product,
    total: a.total + b.total
  })
);
```

### Join

Join two streams:

```typescript
ctx.join(
  'orders',
  'products',
  (order: any) => order.productId,      // left key
  (product: any) => product.id,          // right key
  (order, product) => ({                 // result
    orderId: order.id,
    productName: product.name
  })
);
```

## DAG Execution

```
┌─────────────────────────────────────────────────────────────┐
│                    Example DAG                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│      Read("logs")                                            │
│          │                                                   │
│          ▼                                                   │
│      Filter(hasError)                                        │
│          │                                                   │
│          ├──► FlatMap(extractIP)                            │
│          │        │                                         │
│          │        ▼                                         │
│          │    GroupBy(ip)                                   │
│          │        │                                         │
│          │        ▼                                         │
│          │    Count()                                       │
│          │        │                                         │
│          │        ▼                                         │
│          └──► Write("error_counts")                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Topological Sort Order                   │    │
│  │  1. Read → 2. Filter → 3. FlatMap → 4. Count       │    │
│  │                           → 5. Write                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Partitioning

### Hash Partitioner

Distributes by key hash:

```
┌─────────────────────────────────────────────────────────────┐
│                 Hash Partitioning                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Key: "user1"  ──► hash("user1") = 127 ──► Partition 0    │
│   Key: "user2"  ──► hash("user2") = 245 ──► Partition 1    │
│   Key: "user3"  ──► hash("user3") = 127 ──► Partition 0    │
│   Key: "user4"  ──► hash("user4") = 380 ──► Partition 2    │
│                                                              │
│   Partitions: [user1, user3], [user2], [user4]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Round-Robin

Distributes evenly:

```
┌─────────────────────────────────────────────────────────────┐
│               Round-Robin Partitioning                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Record 1 ──► Partition 0                                   │
│   Record 2 ──► Partition 1                                   │
│   Record 3 ──► Partition 2                                   │
│   Record 4 ──► Partition 0                                   │
│   Record 5 ──► Partition 1                                   │
│   Record 6 ──► Partition 2                                   │
│   ...                                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Checkpointing

```
┌─────────────────────────────────────────────────────────────┐
│                    Checkpoint Process                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Time ──────────────────────────────────────────────────►   │
│                                                              │
│   Checkpoint 1        Checkpoint 2        Checkpoint 3       │
│   ┌──────────┐       ┌──────────┐       ┌──────────┐       │
│   │ Offset: 0 │       │ Offset: 100│       │ Offset: 250│       │
│   │ State: {} │       │ State: {...}│       │ State: {...}│       │
│   └──────────┘       └──────────┘       └──────────┘       │
│        │                  │                  │                │
│        ▼                  ▼                  ▼                │
│   [Data 0-99]     [Data 100-249]    [Data 250-end]        │
│                                                              │
│   On failure: Restore from last checkpoint                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install sparklite
```

Or from source:

```bash
git clone https://github.com/moggan1337/SparkLite.git
cd SparkLite
npm install
npm run build
```

## Quick Start

```typescript
import { createContext } from 'sparklite';

async function main() {
  const ctx = createContext();

  // Create stream from data
  const sales = [
    { product: 'apple', amount: 10 },
    { product: 'banana', amount: 5 },
    { product: 'apple', amount: 15 },
    { product: 'banana', amount: 10 },
    { product: 'cherry', amount: 20 }
  ];

  // Register source
  const stream = ctx.registerStream('sales', sales);

  // Transform: filter high-value, then reduce by product
  ctx.filter('sales', 'highValue', (s: any) => s.amount >= 10);
  
  ctx.reduce(
    'highValue',
    'totals',
    (s: any) => s.product,
    (a: any, b: any) => ({
      product: a.product,
      total: a.total + b.total
    })
  );

  // Execute
  await ctx.execute();

  // Get results
  console.log(ctx.getResults('totals'));
}

main();
```

## Example: Log Analysis

```typescript
import { createContext } from 'sparklite';

async function analyzeLogs() {
  const ctx = createContext();

  // Sample log data
  const logs = [
    { time: '10:00', level: 'ERROR', msg: 'Failed to connect' },
    { time: '10:01', level: 'INFO', msg: 'Connected' },
    { time: '10:02', level: 'ERROR', msg: 'Timeout' },
    { time: '10:03', level: 'WARN', msg: 'Slow response' },
    { time: '10:04', level: 'ERROR', msg: 'Connection lost' },
  ];

  const stream = ctx.registerStream('logs', logs);

  // Filter errors only
  ctx.filter('logs', 'errors', (log: any) => log.level === 'ERROR');

  // Extract error codes
  ctx.map('errors', 'codes', (log: any) => ({
    code: log.msg.split(' ')[0],
    count: 1
  }));

  // Count by code
  ctx.reduce(
    'codes',
    'errorCounts',
    (e: any) => e.code,
    (a: any, b: any) => ({ code: a.code, count: a.count + b.count })
  );

  await ctx.execute();
  
  console.log('Error counts by code');
}
```

## Example: Windowed Aggregation

```typescript
import { createContext } from 'sparklite';

// Simulate time-series data
const events = [
  { time: 1000, value: 10 },
  { time: 2000, value: 20 },
  { time: 3000, value: 15 },
  { time: 4000, value: 25 },
  { time: 5000, value: 30 },
];

const ctx = createContext();
const stream = ctx.registerStream('events', events);

// Define window: events within 2000ms of each other
const windowSize = 2000;

ctx.map('events', 'withWindows', (e: any) => ({
  ...e,
  window: Math.floor(e.time / windowSize)
}));

ctx.reduce(
  'withWindows',
  'windowedSums',
  (e: any) => e.window.toString(),
  (a: any, b: any) => ({
    window: a.window,
    sum: a.sum + b.sum,
    count: a.count + 1
  })
);

await ctx.execute();
```

## API Reference

### StreamContext

```typescript
const ctx = createContext();

ctx.registerStream<T>(name: string, data: T[]): Stream<T>
ctx.map<I, O>(input: string, output: string, fn: (item: I) => O): Stream<O>
ctx.filter<T>(input: string, output: string, predicate: (item: T) => boolean): Stream<T>
ctx.flatMap<I, O>(input: string, output: string, fn: (item: I) => O[]): Stream<O>
ctx.reduce<T, K>(input: string, output: string, keyFn: (item: T) => K, reduceFn: (a: T, b: T) => T): Stream<T>
ctx.join<T, U, K, R>(left: string, right: string, leftKey: (T) => K, rightKey: (U) => K, result: (T, U) => R): Stream<R>
ctx.execute(): Promise<void>
ctx.getDAG(): DAG
ctx.getResults(name: string): any[]
```

### Operators

| Operator | Signature | Description |
|----------|-----------|-------------|
| `map` | `(T) => R` | Transform each element |
| `filter` | `(T) => boolean` | Keep matching elements |
| `flatMap` | `(T) => R[]` | Map and flatten |
| `reduce` | `(T) => K, (T, T) => T` | Group and reduce |
| `join` | `(T) => K, (U) => K, (T, U) => R` | Join two streams |

### CheckpointManager

```typescript
const checkpointManager = new CheckpointManager();

// Create checkpoint
const checkpoint = await checkpointManager.checkpoint(
  dagId,
  offsets,      // Map<string, number>
  operatorStates // Map<string, any>
);

// Restore from checkpoint
const restored = checkpointManager.restore(checkpoint.id);
```

## Performance Tips

1. **Filter Early** - Apply filters before expensive operations
2. **Choose Keys Wisely** - Good keys balance data distribution
3. **Checkpoint Strategically** - Too frequent = overhead, too rare = slow recovery
4. **Monitor Partitions** - Uneven distribution hurts performance

## Architecture Decisions

### Why DAG?

1. **Optimization** - Reorder operations for efficiency
2. **Lineage Tracking** - Know data provenance for fault tolerance
3. **Visualization** - See the data flow

### Why Partitioning?

1. **Parallelism** - Process partitions independently
2. **Data Locality** - Keep related data together
3. **Load Balancing** - Distribute work evenly

## Contributing

Contributions welcome:

- Add more operators (windowed aggregations, etc.)
- Implement distributed execution
- Add more partitioners
- Optimize the DAG optimizer
- Add more checkpoint backends

## Further Reading

- [Apache Spark Documentation](https://spark.apache.org/docs/latest/)
- [The Lambda Architecture](http://www.michael-noll.com/blog/2014/10/12/a-quick-primer-on-writing-a-streaming-mapreduce/)
- [Streaming 101](https://www.oreilly.com/ideas/streaming-101-the-past-present-and-future-of-stream-processing)

## License

MIT License
