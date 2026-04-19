/**
 * SparkLite - Distributed Stream Processing Engine
 * 
 * Features:
 * - Stream abstraction
 * - Operators (map, filter, reduce, join)
 * - DAG execution
 * - Partitioning
 * - Checkpointing for fault tolerance
 */

export interface Stream<T> {
  source(): string;
  partitions: Partition<T>[];
}

export interface Partition<T> {
  id: string;
  data: T[];
  position: number;
}

export interface Operator<I, O> {
  name: string;
  execute(input: I[]): O[];
}

export interface StreamEdge {
  from: string;
  to: string;
  operator: string;
}

export interface DAG {
  vertices: Set<string>;
  edges: StreamEdge[];
}

// ============== OPERATORS ==============

export class MapOperator<T, R> implements Operator<T, R> {
  name = 'map';
  
  constructor(private fn: (item: T) => R) {}
  
  execute(input: T[]): R[] {
    return input.map(this.fn);
  }
}

export class FilterOperator<T> implements Operator<T, T> {
  name = 'filter';
  
  constructor(private predicate: (item: T) => boolean) {}
  
  execute(input: T[]): T[] {
    return input.filter(this.predicate);
  }
}

export class FlatMapOperator<T, R> implements Operator<T, R> {
  name = 'flatmap';
  
  constructor(private fn: (item: T) => R[]) {}
  
  execute(input: T[]): R[] {
    return input.flatMap(this.fn);
  }
}

export class ReduceOperator<T> implements Operator<T[], T> {
  name = 'reduce';
  
  constructor(
    private keyFn: (item: T) => string,
    private reduceFn: (a: T, b: T) => T
  ) {}
  
  execute(input: T[]): T[] {
    const groups = new Map<string, T[]>();
    
    for (const item of input) {
      const key = this.keyFn(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    
    return Array.from(groups.entries()).map(([key, items]) => {
      return items.reduce(this.reduceFn);
    });
  }
}

export class JoinOperator<T, U, K, R> implements Operator<[T[], U[]], R[]> {
  name = 'join';
  
  constructor(
    private leftKey: (item: T) => K,
    private rightKey: (item: U) => K,
    private resultFn: (left: T, right: U) => R
  ) {}
  
  execute(input: [T[], U[]]): R[] {
    const [left, right] = input;
    const rightIndex = new Map<K, U[]>();
    
    for (const item of right) {
      const key = this.rightKey(item);
      if (!rightIndex.has(key)) rightIndex.set(key, []);
      rightIndex.get(key)!.push(item);
    }
    
    const results: R[] = [];
    for (const leftItem of left) {
      const key = this.leftKey(leftItem);
      const matches = rightIndex.get(key) || [];
      for (const rightItem of matches) {
        results.push(this.resultFn(leftItem, rightItem));
      }
    }
    
    return results;
  }
}

export class AggregateOperator<T, K, R> implements Operator<T[], R[]> {
  name = 'aggregate';
  
  constructor(
    private keyFn: (item: T) => K,
    private aggregator: (items: T[]) => R
  ) {}
  
  execute(input: T[]): R[] {
    const groups = new Map<K, T[]>();
    
    for (const item of input) {
      const key = this.keyFn(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    
    return Array.from(groups.entries()).map(([key, items]) => {
      return this.aggregator(items);
    });
  }
}

// ============== PARTITIONER ==============

export interface Partitioner<T> {
  partition(key: T, numPartitions: number): number;
}

export class HashPartitioner<T> implements Partitioner<T> {
  partition(key: T, numPartitions: number): number {
    const hash = JSON.stringify(key);
    return Math.abs(hash.split('').reduce((a, b) => {
      return ((a << 5) - a) + b.charCodeAt(0) | 0;
    }, 0)) % numPartitions;
  }
}

export class RoundRobinPartitioner<T> implements Partitioner<T> {
  private counter = 0;
  
  partition(key: T, numPartitions: number): number {
    return this.counter++ % numPartitions;
  }
}

// ============== CHECKPOINTING ==============

export interface Checkpoint {
  id: string;
  timestamp: number;
  offsets: Map<string, number>;
  operatorStates: Map<string, any>;
}

export class CheckpointManager {
  private checkpoints: Checkpoint[] = [];
  private checkpointInterval = 60000; // 1 minute
  
  async checkpoint(dagId: string, offsets: Map<string, number>, states: Map<string, any>) {
    const checkpoint: Checkpoint = {
      id: `chk-${Date.now()}`,
      timestamp: Date.now(),
      offsets: new Map(offsets),
      operatorStates: new Map(states)
    };
    
    this.checkpoints.push(checkpoint);
    console.log(`Checkpoint created: ${checkpoint.id}`);
    
    return checkpoint;
  }
  
  getLatestCheckpoint(): Checkpoint | undefined {
    return this.checkpoints[this.checkpoints.length - 1];
  }
  
  restore(checkpointId: string) {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) throw new Error(`Checkpoint ${checkpointId} not found`);
    
    console.log(`Restoring from checkpoint: ${checkpointId}`);
    return checkpoint;
  }
}

// ============== STREAM CONTEXT ==============

export class StreamContext {
  private streams = new Map<string, Stream<any>>();
  private operators = new Map<string, Operator<any, any>>();
  private dag: DAG = { vertices: new Set(), edges: [] };
  private checkpointManager = new CheckpointManager();
  private defaultParallelism = 2;
  
  registerStream<T>(name: string, data: T[]): Stream<T> {
    const partitions = this.createPartitions(data, this.defaultParallelism);
    const stream: Stream<T> = { source: () => name, partitions };
    this.streams.set(name, stream);
    this.dag.vertices.add(name);
    return stream;
  }
  
  private createPartitions<T>(data: T[], numPartitions: number): Partition<T>[] {
    const partitions: Partition<T>[] = [];
    const chunkSize = Math.ceil(data.length / numPartitions);
    
    for (let i = 0; i < numPartitions; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.length);
      partitions.push({
        id: `partition-${i}`,
        data: data.slice(start, end),
        position: 0
      });
    }
    
    return partitions;
  }
  
  map<I, O>(inputName: string, outputName: string, fn: (item: I) => O): Stream<O> {
    this.operators.set(`${outputName}-map`, new MapOperator<I, O>(fn));
    this.dag.vertices.add(outputName);
    this.dag.edges.push({ from: inputName, to: outputName, operator: 'map' });
    
    return { source: () => outputName, partitions: [] };
  }
  
  filter<T>(inputName: string, outputName: string, predicate: (item: T) => boolean): Stream<T> {
    this.operators.set(`${outputName}-filter`, new FilterOperator<T>(predicate));
    this.dag.vertices.add(outputName);
    this.dag.edges.push({ from: inputName, to: outputName, operator: 'filter' });
    
    return { source: () => outputName, partitions: [] };
  }
  
  reduce<T>(inputName: string, outputName: string, keyFn: (item: T) => string, reduceFn: (a: T, b: T) => T): Stream<T> {
    this.operators.set(`${outputName}-reduce`, new ReduceOperator<T>(keyFn, reduceFn));
    this.dag.vertices.add(outputName);
    this.dag.edges.push({ from: inputName, to: outputName, operator: 'reduce' });
    
    return { source: () => outputName, partitions: [] };
  }
  
  async execute(): Promise<void> {
    console.log('Executing DAG...');
    console.log('Vertices:', Array.from(this.dag.vertices));
    console.log('Edges:', this.dag.edges);
    
    // Topological sort
    const sorted = this.topologicalSort();
    console.log('Execution order:', sorted);
    
    // Execute each vertex
    for (const vertex of sorted) {
      const incomingEdges = this.dag.edges.filter(e => e.to === vertex);
      
      for (const edge of incomingEdges) {
        const operator = this.operators.get(`${vertex}-${edge.operator}`);
        if (operator) {
          console.log(`Executing ${edge.operator} on ${edge.from} -> ${edge.to}`);
          // Simplified execution
        }
      }
    }
  }
  
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (vertex: string) => {
      if (visited.has(vertex)) return;
      visited.add(vertex);
      
      const outgoing = this.dag.edges.filter(e => e.from === vertex);
      for (const edge of outgoing) {
        visit(edge.to);
      }
      
      result.unshift(vertex);
    };
    
    for (const vertex of this.dag.vertices) {
      visit(vertex);
    }
    
    return result;
  }
  
  getDAG(): DAG {
    return this.dag;
  }
}

// ============== MAIN ==============

export function createContext() {
  return new StreamContext();
}
