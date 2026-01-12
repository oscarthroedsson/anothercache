# Another Cache

A lightweight, flexible cache library for JavaScript that works seamlessly in both Node.js and browser environments.

## Features

- ✅ Works in Node.js and browsers
- ✅ TypeScript support with full type safety
- ✅ Configurable size limits (entries or bytes)
- ✅ **Two eviction policies: FIFO (default) and LRU (Least Recently Used)**
- ✅ TTL (Time To Live) support
- ✅ Automatic cleanup of expired entries
- ✅ Generic type support
- ✅ Rich mutation operations (increment, decrement, append, merge)
- ✅ Batch operations (setMany, getMany, deleteMany)
- ✅ **Peek operation** (check values without affecting eviction order)
- ✅ **Consistent size calculations** for accurate eviction decisions
- ✅ **Event system** for monitoring cache operations
- ✅ Zero dependencies
- ✅ Modular architecture

## Installation

```bash
npm install another-cache
```

## Usage

### Basic Usage

```typescript
import { Cache } from 'another-cache';

const cache = new Cache<string, number>();

// Set values
cache.set('key1', 100);
cache.set('key2', 200);

// Get values
const value = cache.get('key1'); // 100

// Check if key exists
if (cache.has('key1')) {
  console.log('Key exists!');
}

// Delete a value
cache.delete('key1');

// Clear all values
cache.clear();

// Get cache size (number of entries)
const size = cache.size();

// Get cache size in bytes
const bytes = cache.sizeInBytes();
```

**⚠️ Note on `sizeInBytes()`:** The byte size calculation is an **approximation**. It estimates memory usage based on JavaScript value types, but actual memory consumption can vary due to:

- V8 engine internals and object overhead
- Memory alignment and padding
- Garbage collection overhead
- Browser/Node.js implementation differences

Use `sizeInBytes()` as a guideline for cache size management, not as an exact memory measurement.

**Size calculation details:**

- The cache uses consistent size calculations for both individual entries and total cache size
- Each entry includes: key size + value size + 48 bytes (Map entry overhead) + 16 bytes (metadata: createdAt, expiresAt, lastAccessed)
- This ensures accurate eviction decisions when using `maxBytes`

**Note on `peek()` and LRU:** When using LRU eviction policy, `peek()` does not update the access time, so it won't affect which entries are evicted. Use `get()` if you want to update the access time for LRU.

### With Options

```typescript
const cache = new Cache<string, any>({
  maxEntries: 100, // Maximum number of entries
  maxBytes: 2 * 1024 * 1024, // Maximum size in bytes (2MB)
  ttl: 3600000, // Time to live in milliseconds (1 hour)
  cleanupInterval: 60000, // Cleanup interval in milliseconds (1 minute)
  evictionPolicy: 'FIFO', // Eviction policy: 'FIFO' (default) or 'LRU'
  autoDeleteAfterUse: false, // Auto-delete after get() (default: false)
});
```

### Size Limits

The cache supports two eviction policies: **FIFO (First In First Out)** and **LRU (Least Recently Used)**. When size limits are reached, entries are automatically removed based on the selected policy.

#### Eviction Policies

**FIFO (Default):** Removes the oldest entries (first inserted) when limits are reached. Accessing entries with `get()` does not affect eviction order.

**LRU:** Removes the least recently used entries. Accessing entries with `get()` updates their access time, keeping frequently used entries in cache longer.

```typescript
// FIFO (default)
const fifoCache = new Cache<string, any>({
  maxEntries: 10,
  evictionPolicy: 'FIFO', // This is default - but could be added for clarity
});

// LRU
const lruCache = new Cache<string, any>({
  maxEntries: 10,
  evictionPolicy: 'LRU',
});
```

#### Entry-based Limit

**FIFO Example:**

```typescript
const cache = new Cache<string, any>({ maxEntries: 3, evictionPolicy: 'FIFO' });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
cache.get('a'); // Access 'a', but it doesn't change eviction order
cache.set('d', 4); // 'a' is removed (oldest entry)
console.log(cache.get('a')); // undefined
```

**LRU Example:**

```typescript
const cache = new Cache<string, any>({ maxEntries: 3, evictionPolicy: 'LRU' });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
cache.get('a'); // Access 'a' - updates its access time
cache.set('d', 4); // 'b' is removed (least recently used, not 'a')
console.log(cache.get('a')); // 1 (still exists)
console.log(cache.get('b')); // undefined (removed)
```

#### Bytes-based Limit

The cache can be limited by total size in bytes instead of (or in addition to) entry count. This provides more predictable memory usage.

**How eviction works with maxBytes:**

When you attempt to add an entry that would exceed `maxBytes`, the cache removes existing entries **one by one** based on your eviction policy until there's enough space:

1. **Calculate required space:** The cache calculates the size of the new entry (key + value + overhead)
2. **Check current size:** If `currentCacheSize + newEntrySize > maxBytes`, eviction starts
3. **Remove entries:** Entries are removed one at a time based on eviction policy:
   - **FIFO:** Removes oldest entries (first inserted) until there's space
   - **LRU:** Removes least recently used entries (oldest access time) until there's space
     - Entries accessed with `get()` have their access time updated
     - Entries only accessed with `peek()` do NOT update access time
4. **Continue until space available:** The process repeats until `currentSize + newEntrySize <= maxBytes`
5. **Set new entry:** Once there's enough space, the new entry is added

**Special case - Entry larger than maxBytes:**

If the entry itself is larger than `maxBytes`, all existing entries are removed and the new entry is set anyway. This allows you to set large entries when needed, effectively clearing the cache.

```typescript
// Limit cache to 2MB with LRU eviction
const cache = new Cache<string, any>({
  maxBytes: 2 * 1024 * 1024,
  evictionPolicy: 'LRU',
});

cache.set('largeKey', largeObject);
// When adding entries would exceed 2MB, least recently used entries are removed
```

**Note:** In JavaScript runtimes, garbage collection is driven by heap memory pressure rather than the number of cached entries.
Byte-based cache limits therefore provide more predictable memory behavior and help reduce GC pressure compared to entry-count-based limits, both in Node.js and browser environments.

### TTL (Time To Live)

```typescript
// Cache entries expire after 1 hour
const cache = new Cache<string, string>({ ttl: 3600000 });

cache.set('token', 'abc123');
// ... after 1 hour ...
const token = cache.get('token'); // undefined (expired)
```

## Operations

### Set Operations

Set operations allow you to add values to the cache. The cache automatically manages size limits by removing entries based on the selected eviction policy (FIFO or LRU) when limits are reached.

#### `set(key, value)`

Sets a single value in the cache. If the cache is at capacity, entries are automatically removed based on the eviction policy (FIFO or LRU).

**Note:** This operation emits a `set` event. See [Events](#events) section for details.

**Eviction priority and behavior:**

The cache uses the following priority when deciding what to remove:

1. **Entry-based limit (`maxEntries`):**
   - When adding a new entry would exceed `maxEntries`, exactly one entry is removed
   - **FIFO:** The oldest entry (first inserted) is removed
   - **LRU:** The least recently used entry (oldest access time) is removed

2. **Bytes-based limit (`maxBytes`):**
   - When adding a new entry would exceed `maxBytes`, entries are removed one by one until there's space
   - **FIFO:** Oldest entries are removed first (in insertion order)
   - **LRU:** Least recently used entries are removed first (by access time)
   - Multiple entries may be removed if needed to make space

3. **Entry larger than `maxBytes`:**
   - If the entry itself is larger than `maxBytes`, all existing entries are removed
   - The new entry is then set anyway (allows setting large entries when needed)

**Example 1: Basic usage**

```typescript
const cache = new Cache<string, number>();

// Set a simple value
cache.set('user:123', 42);
const value = cache.get('user:123'); // 42
```

**Example 2: Overwriting existing values**

```typescript
const cache = new Cache<string, string>();

// Set initial value
cache.set('status', 'pending');
console.log(cache.get('status')); // 'pending'

// Overwrite with new value
cache.set('status', 'completed');
console.log(cache.get('status')); // 'completed'
```

**Example 3: With entry-based limit**

```typescript
const cache = new Cache<string, number>({ maxEntries: 3 });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
console.log(cache.size()); // 3

// Adding a 4th entry removes the oldest ('a')
cache.set('d', 4);
console.log(cache.get('a')); // undefined (removed)
console.log(cache.get('d')); // 4
```

**Example 4: With bytes-based limit**

```typescript
const cache = new Cache<string, string>({ maxBytes: 1000 });

// Add entries until limit is reached
cache.set('key1', 'x'.repeat(200)); // ~200 bytes
cache.set('key2', 'y'.repeat(200)); // ~200 bytes
cache.set('key3', 'z'.repeat(200)); // ~200 bytes

// Adding more will remove oldest entries
cache.set('key4', 'w'.repeat(300)); // ~300 bytes
// Oldest entries are removed to make space
```

**Example 5: LRU eviction with maxBytes**

```typescript
const cache = new Cache<string, string>({
  maxBytes: 800,
  evictionPolicy: 'LRU',
});

// Add three entries (~312 bytes each, total ~936 bytes)
cache.set('key1', 'x'.repeat(200));
cache.set('key2', 'y'.repeat(200));
cache.set('key3', 'z'.repeat(200));

// Access key1 - this updates its access time (makes it more recently used)
cache.get('key1');

// Add new entry (~472 bytes)
// Current cache: ~936 bytes
// New entry: ~472 bytes
// Total needed: ~1408 bytes, but maxBytes is 800
//
// Eviction process:
// 1. Remove key3 (least recently used - never accessed)
// 2. Cache now: ~624 bytes, still not enough
// 3. Remove key2 (now least recently used)
// 4. Cache now: ~312 bytes
// 5. 312 + 472 = 784 bytes <= 800, enough space!
// 6. Add key4
//
// Result: key1 and key4 exist, key2 and key3 were removed
cache.set('key4', 'w'.repeat(300));
```

**Example 6: Entry larger than maxBytes**

```typescript
const cache = new Cache<string, string>({ maxBytes: 500 });

cache.set('key1', 'data1');
cache.set('key2', 'data2');

// Set entry larger than maxBytes (4000+ bytes)
// Since entry itself is larger than maxBytes, all existing entries are removed
// and the new entry is set anyway
cache.set('huge', 'x'.repeat(2000));

// Result: Only 'huge' exists, key1 and key2 were removed
```

#### `setMany(entries)`

Sets multiple key-value pairs at once. Useful for bulk operations or initializing the cache with data.

**Note:** This operation emits a `setMany` event. See [Events](#events) section for details.

**Example 1: Bulk initialization**

```typescript
const cache = new Cache<string, number>();

// Initialize cache with multiple values at once
cache.setMany([
  ['user:1', 100],
  ['user:2', 200],
  ['user:3', 300],
  ['user:4', 400],
]);

console.log(cache.size()); // 4
console.log(cache.get('user:2')); // 200
```

**Example 2: Updating multiple values**

```typescript
const cache = new Cache<string, { score: number; level: number }>();

// Set initial data
cache.set('player1', { score: 100, level: 1 });
cache.set('player2', { score: 200, level: 2 });

// Update multiple players at once
cache.setMany([
  ['player1', { score: 150, level: 2 }],
  ['player2', { score: 250, level: 3 }],
  ['player3', { score: 50, level: 1 }], // New player
]);

console.log(cache.get('player1')); // { score: 150, level: 2 }
console.log(cache.get('player3')); // { score: 50, level: 1 }
```

**Example 3: With size limits**

```typescript
const cache = new Cache<string, number>({ maxEntries: 5 });

// Set 7 entries, but only 5 will remain
cache.setMany([
  ['a', 1],
  ['b', 2],
  ['c', 3],
  ['d', 4],
  ['e', 5],
  ['f', 6], // 'a' is removed
  ['g', 7], // 'b' is removed
]);

console.log(cache.size()); // 5
console.log(cache.get('a')); // undefined (removed)
console.log(cache.get('g')); // 7
```

### Get Operations

Get operations allow you to retrieve values from the cache. The cache automatically handles expired entries by removing them when accessed.

#### `get(key)`

Retrieves a single value from the cache. Returns `undefined` if the key doesn't exist or if the entry has expired.

**Note:** This operation emits a `get` event. See [Events](#events) section for details.

**Example 1: Basic retrieval**

```typescript
const cache = new Cache<string, number>();

cache.set('score', 100);
const score = cache.get('score');
console.log(score); // 100
```

**Example 2: Handling non-existent keys**

```typescript
const cache = new Cache<string, string>();

// Get a value that doesn't exist
const value = cache.get('nonexistent');
console.log(value); // undefined

// Can be used with optional chaining or default value
const result = cache.get('key') ?? 'default';
console.log(result); // 'default'
```

**Example 3: With expired entries**

```typescript
const cache = new Cache<string, string>({ ttl: 1000 }); // 1 second TTL

cache.set('token', 'abc123');
console.log(cache.get('token')); // 'abc123'

// After 1 second
console.log(cache.get('token')); // undefined (expired and removed)
```

**Example 4: Retrieving objects**

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const cache = new Cache<string, User>();

cache.set('user:123', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
});

const user = cache.get('user:123');
if (user) {
  console.log(user.name); // 'John Doe'
  console.log(user.email); // 'john@example.com'
}
```

#### `getMany(keys)`

Retrieves multiple values at once. Returns an array where each element corresponds to the value for each key, or `undefined` if the key doesn't exist or has expired.

**Note:** This operation emits a `getMany` event. See [Events](#events) section for details.

**Example 1: Bulk retrieval**

```typescript
const cache = new Cache<string, number>();

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);

// Get multiple values at once
// Only returns existing values (non-existent keys are filtered out)
const values = cache.getMany(['a', 'b', 'c', 'd']);
console.log(values); // [1, 2, 3] (no undefined for 'd')
```

**Example 2: Getting subset of existing values**

```typescript
const cache = new Cache<string, string>();

cache.set('user:1', 'Alice');
cache.set('user:3', 'Charlie');
// user:2 doesn't exist

// Get multiple values - only existing ones are returned
const values = cache.getMany(['user:1', 'user:2', 'user:3']);
console.log(values); // ['Alice', 'Charlie'] (user:2 is not included)
```

**Example 3: Processing all retrieved values**

```typescript
const cache = new Cache<string, { name: string; score: number }>();

cache.set('player1', { name: 'Alice', score: 100 });
cache.set('player2', { name: 'Bob', score: 200 });

// Get all values - only existing ones are returned
const players = cache.getMany(['player1', 'player2', 'player3']);

// Process all returned values (no need to filter undefined)
players.forEach((player) => {
  console.log(`${player.name}: ${player.score}`);
});
// Output:
// Alice: 100
// Bob: 200
```

#### `has(key)`

Checks if a key exists in the cache and is not expired. Returns `true` if the key exists and is valid, `false` otherwise.

**Example 1: Conditional operations**

```typescript
const cache = new Cache<string, number>();

cache.set('count', 42);

if (cache.has('count')) {
  const value = cache.get('count');
  console.log(`Count exists: ${value}`); // Count exists: 42
} else {
  console.log('Count not found');
}
```

#### `getEntry(key)`

Retrieves the full cache entry including metadata (createdAt, expiresAt, ttlLeft, age). Returns `undefined` if the key doesn't exist or has expired. Useful when you need to know when an entry was created, when it will expire, how much time is left, or how old it is.

**Example 1: Accessing all metadata**

```typescript
const cache = new Cache<string, number>({ ttl: 3600000 }); // 1 hour TTL

cache.set('data', 100);
const entry = cache.getEntry('data');

if (entry) {
  console.log(entry.value); // 100
  console.log(entry.createdAt); // Timestamp when created
  console.log(entry.expiresAt); // Timestamp when it expires
  console.log(entry.ttlLeft); // Milliseconds until expiration (e.g., 3600000)
  console.log(entry.age); // Age in milliseconds (e.g., 0 if just created)
}
```

**Example 2: Using ttlLeft for expiration checks**

```typescript
const cache = new Cache<string, string>({ ttl: 60000 }); // 1 minute TTL

cache.set('token', 'abc123');
const entry = cache.getEntry('token');

// ttlLeft kan be used as a validator because it will be 0 if it is no time left
if (entry && entry.ttlLeft) {
  const secondsLeft = Math.floor(entry.ttlLeft / 1000);
  console.log(`Token expires in ${secondsLeft} seconds`);

  // Refresh if less than 10 seconds left
  if (entry.ttlLeft < 10000) cache.set('token', 'new-token');
}
```

**Example 3: Using age to check data freshness**

```typescript
const cache = new Cache<string, { data: any }>();

cache.set('api-response', { data: 'some data' });

// Wait a bit, then check age

const entry = cache.getEntry('api-response');

// after a x-seconds
if (entry) {
  const ageInSeconds = Math.floor(entry.age / 1000);
  console.log(`Entry is ${ageInSeconds} seconds old`);

  // Refresh if older than 5 minutes
  if (entry.age > 300000) {
    console.log('Data is stale, refreshing...');
    cache.set('api-response', { data: 'fresh data' });
  }
}
```

#### `peek(key)`

Peek at a value without updating access time or triggering auto-delete. Useful for checking values without affecting eviction order. When using LRU, `peek()` does not update the `lastAccessed` timestamp, so it won't prevent the entry from being evicted.

**Example 1: Check value without affecting eviction (FIFO)**

```typescript
const cache = new Cache<string, number>({
  maxEntries: 3,
  evictionPolicy: 'FIFO',
});

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);

// Peek at 'a' without moving it in eviction queue
const value = cache.peek('a');
console.log(value); // 1

// 'a' is still the oldest and will be evicted first
cache.set('d', 4);
console.log(cache.get('a')); // undefined (evicted)
```

**Example 1b: Peek with LRU (doesn't update access time)**

```typescript
const cache = new Cache<string, number>({
  maxEntries: 3,
  evictionPolicy: 'LRU',
});

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
cache.get('a'); // Access 'a' - updates access time
cache.peek('b'); // Peek at 'b' - does NOT update access time

// 'b' is least recently used (was never accessed with get())
cache.set('d', 4);
console.log(cache.get('b')); // undefined (evicted, not 'a')
console.log(cache.get('a')); // 1 (still exists)
```

**Example 2: Peek vs get with autoDeleteAfterUse**

```typescript
const cache = new Cache<string, string>({ autoDeleteAfterUse: true });

cache.set('token', 'abc123');

// get() will delete the entry
const value1 = cache.get('token');
console.log(value1); // 'abc123'
console.log(cache.has('token')); // false (deleted)

// Reset
cache.set('token', 'abc123');

// peek() won't delete the entry
const value2 = cache.peek('token');
console.log(value2); // 'abc123'
console.log(cache.has('token')); // true (still exists)
```

**Example 3: Conditional check without side effects**

```typescript
const cache = new Cache<string, { status: string }>();

cache.set('task:1', { status: 'pending' });

// Check status without affecting cache
if (cache.peek('task:1')?.status === 'pending') {
  // Process task...
  // Entry remains in cache for later use
  console.log('Task is pending');
}
```

### Delete Operations

Delete operations allow you to remove entries from the cache. You can delete single entries, multiple entries at once, or clear the entire cache.

#### `delete(key)`

Deletes a single entry from the cache. Returns `true` if the key existed and was deleted, `false` if the key didn't exist.

**Note:** This operation emits a `delete` event. See [Events](#events) section for details.

**Example 1: Basic deletion**

```typescript
const cache = new Cache<string, number>();

cache.set('score', 100);
console.log(cache.get('score')); // 100

const deleted = cache.delete('score');
console.log(deleted); // true
console.log(cache.get('score')); // undefined
```

**Example 2: Deleting non-existent key**

```typescript
const cache = new Cache<string, string>();

// Try to delete a key that doesn't exist
const deleted = cache.delete('nonexistent');
console.log(deleted); // false
```

**Example 3: Conditional deletion**

```typescript
const cache = new Cache<string, { status: string }>();

cache.set('task:1', { status: 'completed' });
cache.set('task:2', { status: 'pending' });

// Delete only if status is completed
const task = cache.get('task:1');
if (task && task.status === 'completed') cache.delete('task:1');

// Result
console.log(cache.has('task:1')); // false
console.log(cache.has('task:2')); // true
```

**Example 4: Auto-delete after use**

```typescript
// Enable auto-delete after use in cache options
const cache = new Cache<string, any>({
  autoDeleteAfterUse: true, // Entries are automatically deleted after get()
});

// Store temporary data
cache.set('temp:session', { userId: 123, token: 'abc' });

// Use the data - entry is automatically deleted after retrieval
const session = cache.get('temp:session');
if (session) {
  // Process session...
  console.log('Processing session:', session.userId);
}

// Entry is already deleted, no need to manually clean up
console.log(cache.has('temp:session')); // false
```

**Example 5: One-time use tokens**

```typescript
const cache = new Cache<string, string>({
  autoDeleteAfterUse: true,
});

// Store one-time tokens
cache.set('token:abc123', 'user:123');
cache.set('token:xyz789', 'user:456');

// Tokens are consumed and deleted when retrieved
const userId1 = cache.get('token:abc123');
console.log(userId1); // 'user:123'
console.log(cache.has('token:abc123')); // false (auto-deleted)

// Token can only be used once
const userId1Again = cache.get('token:abc123');
console.log(userId1Again); // undefined (already consumed)
```

#### `deleteMany(keys)`

Deletes multiple entries at once. Returns the number of entries that were successfully deleted.

**Note:** This operation emits a `deleteMany` event. See [Events](#events) section for details.

**Example 1: Bulk deletion**

```typescript
const cache = new Cache<string, number>();

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
cache.set('d', 4);

// Delete multiple keys at once
const deleted = cache.deleteMany(['a', 'b', 'e']); // 'e' doesn't exist
console.log(deleted); // 2 (only 'a' and 'b' were deleted)
console.log(cache.size()); // 2 ('c' and 'd' remain)
```

**Example 2: Removing expired or invalid entries**

```typescript
const cache = new Cache<string, { valid: boolean }>();

cache.set('item:1', { valid: true });
cache.set('item:2', { valid: false });
cache.set('item:3', { valid: true });
cache.set('item:4', { valid: false });

// Find and delete invalid items
const allKeys = cache.keys();
const invalidKeys = allKeys.filter((key) => {
  const item = cache.get(key);
  return item && !item.valid;
});

const deleted = cache.deleteMany(invalidKeys);
console.log(`Deleted ${deleted} invalid items`);
console.log(cache.size()); // 2 (only valid items remain)
```

**Example 3: Cleanup by prefix**

```typescript
const cache = new Cache<string, any>();

cache.set('user:1:profile', { name: 'Alice' });
cache.set('user:1:settings', { theme: 'dark' });
cache.set('user:2:profile', { name: 'Bob' });
cache.set('user:2:settings', { theme: 'light' });
cache.set('session:abc', { token: 'xyz' });

// Delete all entries for user:1
const allKeys = cache.keys();
const user1Keys = allKeys.filter((key) => key.startsWith('user:1:'));

const deleted = cache.deleteMany(user1Keys);
console.log(`Deleted ${deleted} entries for user:1`);
console.log(cache.has('user:1:profile')); // false
console.log(cache.has('user:2:profile')); // true
```

#### `clear()`

Removes all entries from the cache. Useful for resetting the cache or freeing memory.

**Example 1: Resetting the cache**

```typescript
const cache = new Cache<string, number>();

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
console.log(cache.size()); // 3

// Clear everything
cache.clear();
console.log(cache.size()); // 0
console.log(cache.get('a')); // undefined
```

**Example 2: Memory cleanup**

```typescript
const cache = new Cache<string, any>({ maxBytes: 100 * 1024 * 1024 }); // 100MB

// Cache grows over time
for (let i = 0; i < 1000; i++) {
  cache.set(`item:${i}`, { data: 'large object' });
}

console.log(cache.sizeInBytes()); // Large size

// Clear cache to free memory
cache.clear();
console.log(cache.size()); // 0
console.log(cache.sizeInBytes()); // 0
```

**Example 3: Cleanup before shutdown**

```typescript
const cache = new Cache<string, any>();

// Application runs and caches data
cache.set('config', { setting: 'value' });
cache.set('session', { userId: 123 });

// Before application shutdown
process.on('SIGTERM', () => {
  console.log('Cleaning up cache before shutdown...');
  cache.clear();
  cache.destroy();
  process.exit(0);
});
```

### Mutate Operations

Mutate operations allow you to update existing cache entries in place. These operations are useful for modifying values without retrieving, updating, and setting them separately.

#### `mutate(key, updater)`

Updates an existing value using a function. Returns the new value, or `undefined` if the key doesn't exist.

**Note:** This operation emits a `mutate` event. See [Events](#events) section for details.

**Example 1: Basic mutation**

```typescript
const cache = new Cache<string, number>();

cache.set('counter', 100);
const newValue = cache.mutate('counter', (value) => value * 2);
console.log(newValue); // 200
console.log(cache.get('counter')); // 200
```

**Example 2: Complex transformation**

```typescript
const cache = new Cache<string, { count: number; multiplier: number }>();

cache.set('stats', { count: 10, multiplier: 2 });
const updated = cache.mutate('stats', (value) => ({
  ...value,
  count: value.count * value.multiplier,
}));
console.log(updated); // { count: 20, multiplier: 2 }
```

**Example 3: Conditional mutation**

```typescript
const cache = new Cache<string, number>();

cache.set('score', 50);
const result = cache.mutate('score', (value) => {
  // Only update if value is less than 100
  return value < 100 ? value + 10 : value;
});
console.log(result); // 60

// Try again
const result2 = cache.mutate('score', (value) => {
  return value < 100 ? value + 10 : value;
});
console.log(result2); // 70
```

**Example 4: Mutating non-existent key**

```typescript
const cache = new Cache<string, number>();

// Mutate returns undefined if key doesn't exist
const result = cache.mutate('nonexistent', (value) => value + 1);
console.log(result); // undefined
console.log(cache.has('nonexistent')); // false
```

#### `upsert(key, valueOrUpdater)`

Updates an existing value or sets it if it doesn't exist. Can accept either a direct value or an updater function. Always returns the final value.

**Note:** This operation emits an `upsert` event. See [Events](#events) section for details.

**Example 1: Inserting new value**

```typescript
const cache = new Cache<string, number>();

// Set if doesn't exist
const value1 = cache.upsert('counter', 10);
console.log(value1); // 10
console.log(cache.get('counter')); // 10
```

**Example 2: Updating existing value with direct value**

```typescript
const cache = new Cache<string, number>();

cache.set('counter', 5);
const value = cache.upsert('counter', 20);
console.log(value); // 20
console.log(cache.get('counter')); // 20
```

**Example 3: Using updater function**

```typescript
const cache = new Cache<string, number>();

// Initialize with updater function
cache.upsert('counter', (current) => (current || 0) + 1);
console.log(cache.get('counter')); // 1

// Update existing with updater
cache.upsert('counter', (current) => (current || 0) + 5);
console.log(cache.get('counter')); // 6
```

**Example 4: Complex upsert with object**

```typescript
const cache = new Cache<string, { count: number; lastUpdated: number }>();

// Insert new object
cache.upsert('stats', {
  count: 0,
  lastUpdated: Date.now(),
});

// Update with function
cache.upsert('stats', (current) => ({
  count: (current?.count || 0) + 1,
  lastUpdated: Date.now(),
}));

console.log(cache.get('stats')); // { count: 1, lastUpdated: <timestamp> }
```

#### `increment(key, amount?)`

Increments a numeric value by the specified amount (default: 1). Returns the new value, or `undefined` if the key doesn't exist.

**⚠️ Important:** `increment()` only works when the cache value type is `number`. It does NOT work on objects, arrays, or other types.

**Note:** This operation emits an `increment` event. See [Events](#events) section for details.

**✅ What works:**

```typescript
// Works: Cache with number values
const cache = new Cache<string, number>();
cache.set('views', 0);
cache.increment('views'); // ✅ Works
console.log(cache.get('views')); // 1
```

**❌ What doesn't work:**

```typescript
// Doesn't work: Cache with object values
const cache2 = new Cache<string, { count: number }>();
cache2.set('stats', { count: 5 });
cache2.increment('stats'); // ❌ ERROR: Cannot increment object

// Doesn't work: Cache with array values
const cache3 = new Cache<string, number[]>();
cache3.set('items', [1, 2, 3]);
cache3.increment('items'); // ❌ ERROR: Cannot increment array

// Solution: Use mutate() for objects/arrays
cache2.mutate('stats', (obj) => ({
  ...obj,
  count: obj.count + 1,
}));
```

**Example 1: Basic increment**

```typescript
const cache = new Cache<string, number>();

cache.set('views', 0);
cache.increment('views');
console.log(cache.get('views')); // 1

cache.increment('views');
console.log(cache.get('views')); // 2
```

**Example 2: Increment by custom amount**

```typescript
const cache = new Cache<string, number>();

cache.set('score', 100);
cache.increment('score', 25);
console.log(cache.get('score')); // 125

cache.increment('score', 50);
console.log(cache.get('score')); // 175
```

**Example 3: Tracking page views**

```typescript
const cache = new Cache<string, number>();

// Track views for different pages
const pageId = 'page:123';
cache.set(pageId, 0);

// Increment on each view
cache.increment(pageId);
cache.increment(pageId);
cache.increment(pageId, 5); // Bulk views

console.log(cache.get(pageId)); // 7
```

#### `decrement(key, amount?)`

Decrements a numeric value by the specified amount (default: 1). Returns the new value, or `undefined` if the key doesn't exist.

**⚠️ Important:** `decrement()` only works when the cache value type is `number`. It does NOT work on objects, arrays, or other types.

**Note:** This operation emits a `decrement` event. See [Events](#events) section for details.

**✅ What works:**

```typescript
// Works: Cache with number values
const cache = new Cache<string, number>();
cache.set('lives', 3);
cache.decrement('lives'); // ✅ Works
console.log(cache.get('lives')); // 2
```

**❌ What doesn't work:**

```typescript
// Doesn't work: Cache with object values containing numbers
const cache2 = new Cache<string, { lives: number; score: number }>();
cache2.set('player', { lives: 3, score: 100 });
cache2.decrement('player'); // ❌ ERROR: Cannot decrement object

// Doesn't work: Cache with array values
const cache3 = new Cache<string, number[]>();
cache3.set('items', [1, 2, 3]);
cache3.decrement('items'); // ❌ ERROR: Cannot decrement array

// Solution: Use mutate() for objects/arrays
cache2.mutate('player', (obj) => ({
  ...obj,
  lives: obj.lives - 1,
  score: obj.score - 10,
}));
```

**Example 1: Basic decrement**

```typescript
const cache = new Cache<string, number>();

cache.set('lives', 3);
cache.decrement('lives');
console.log(cache.get('lives')); // 2

cache.decrement('lives');
console.log(cache.get('lives')); // 1
```

**Example 2: Decrement by custom amount**

```typescript
const cache = new Cache<string, number>();

cache.set('balance', 1000);
cache.decrement('balance', 250);
console.log(cache.get('balance')); // 750

cache.decrement('balance', 100);
console.log(cache.get('balance')); // 650
```

**Example 3: Inventory management**

```typescript
const cache = new Cache<string, number>();

cache.set('item:123:stock', 50);

// Sell items
cache.decrement('item:123:stock', 5);
console.log(cache.get('item:123:stock')); // 45

// Return items
cache.increment('item:123:stock', 2);
console.log(cache.get('item:123:stock')); // 47
```

#### `append(key, ...items)`

Appends one or more items to an array value. Returns the new array, or `undefined` if the key doesn't exist.

**Note:** This operation emits an `append` event. See [Events](#events) section for details.

**Example 1: Basic append**

```typescript
const cache = new Cache<string, number[]>();

cache.set('items', [1, 2, 3]);
cache.append('items', 4);
console.log(cache.get('items')); // [1, 2, 3, 4]

cache.append('items', 5, 6);
console.log(cache.get('items')); // [1, 2, 3, 4, 5, 6]
```

**Example 2: Building a list**

```typescript
const cache = new Cache<string, string[]>();

cache.set('log', []);

// Append log entries
cache.append('log', 'User logged in');
cache.append('log', 'User viewed page');
cache.append('log', 'User logged out');

console.log(cache.get('log'));
// ['User logged in', 'User viewed page', 'User logged out']
```

**Example 3: Appending multiple items**

```typescript
const cache = new Cache<string, string[]>();

cache.set('tags', ['javascript', 'typescript']);
cache.append('tags', 'nodejs', 'react', 'vue');

console.log(cache.get('tags'));
// ['javascript', 'typescript', 'nodejs', 'react', 'vue']
```

#### `merge(key, updates, options?)`

Merges values based on their type. Returns the merged value, or `undefined` if the key doesn't exist.

**Note:** This operation emits a `merge` event. See [Events](#events) section for details.

**Supported types and behavior:**

- **Objects**: Shallow merge properties (can add new properties)
- **Arrays**: Concatenate arrays (with optional duplicate filtering)
- **Strings**: Concatenate strings
- **Numbers**: Concatenate as strings then convert back to number (4 + 2 = 42, not 6)

**Options:**

- `allowDuplicates?: boolean` - Allow duplicates when merging arrays (default: false, or uses cache-level `mergeAllowDuplicates` setting)

**Example 1: Merging objects (shallow merge)**

```typescript
const cache = new Cache<string, { name: string; age: number }>();

cache.set('user', { name: 'John', age: 30 });
cache.merge('user', { age: 31 });
console.log(cache.get('user')); // { name: 'John', age: 31 }

// Add new properties
cache.merge('user', { city: 'Stockholm', country: 'Sweden' });
console.log(cache.get('user'));
// { name: 'John', age: 31, city: 'Stockholm', country: 'Sweden' }
```

**Example 2: Merging strings (concatenation)**

```typescript
const cache = new Cache<string, string>();

cache.set('greeting', 'Good');
cache.merge('greeting', ' Bye');
console.log(cache.get('greeting')); // 'Good Bye'

// Multiple merges
cache.set('text', 'Hello');
cache.merge('text', ' ');
cache.merge('text', 'World');
console.log(cache.get('text')); // 'Hello World'
```

**Example 3: Merging numbers (concatenation)**

```typescript
const cache = new Cache<string, number>();

cache.set('value', 4);
cache.merge('value', 2);
console.log(cache.get('value')); // 42 (not 6!)

// Multiple merges
cache.set('code', 1);
cache.merge('code', 2);
cache.merge('code', 3);
console.log(cache.get('code')); // 123
```

**Example 4: Merging arrays (without duplicates by default)**

```typescript
const cache = new Cache<string, number[]>();

cache.set('items', [1, 2, 3]);
cache.merge('items', [3, 4, 5]);
console.log(cache.get('items')); // [1, 2, 3, 4, 5] (3 is not duplicated)
```

**Example 5: Merging arrays (with duplicates allowed)**

```typescript
const cache = new Cache<string, number[]>();

cache.set('items', [1, 2, 3]);
cache.merge('items', [3, 4, 5], { allowDuplicates: true });
console.log(cache.get('items')); // [1, 2, 3, 3, 4, 5] (duplicates allowed)
```

**Example 6: Cache-level duplicate setting**

```typescript
// Set allowDuplicates at cache level
const cache = new Cache<string, number[]>({ mergeAllowDuplicates: true });

cache.set('items', [1, 2]);
cache.merge('items', [2, 3]);
console.log(cache.get('items')); // [1, 2, 2, 3] (duplicates allowed)

// Override with option parameter
cache.merge('items', [3, 4], { allowDuplicates: false });
console.log(cache.get('items')); // [1, 2, 2, 3, 4] (no new duplicates)
```

**Example 7: Shallow merge for nested objects**

```typescript
const cache = new Cache<
  string,
  { profile: { name: string; bio: string }; settings: { theme: string } }
>();

cache.set('user', {
  profile: { name: 'Bob', bio: 'Developer' },
  settings: { theme: 'light' },
});

// Shallow merge: nested objects are replaced, not merged
cache.merge('user', {
  profile: { name: 'Bob Smith' }, // This replaces the entire profile object
});

console.log(cache.get('user'));
// {
//   profile: { name: 'Bob Smith' }, // bio is lost!
//   settings: { theme: 'light' }
// }
```

### Utility Operations

Utility operations provide information about the cache state and contents.

**Note:** All utility operations emit events. See [Events](#events) section for details on `size`, `sizeInBytes`, `keys`, `values`, `entries`, `isEmpty`, and `randomKey` events.

```typescript
const cache = new Cache<string, number>();

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);

// Get all keys
const keys = cache.keys(); // ['a', 'b', 'c']

// Get all values
const values = cache.values(); // [1, 2, 3]

// Get all entries
const entries = cache.entries(); // [['a', 1], ['b', 2], ['c', 3]]

// Check if cache is empty
const isEmpty = cache.isEmpty(); // false

// Get a random key
const randomKey = cache.randomKey(); // 'a', 'b', or 'c'

// Get entry with metadata
const entry = cache.getEntry('a');
// { value: 1, createdAt: 1234567890, expiresAt: undefined }
```

### Cleanup

```typescript
const cache = new Cache<string, any>({
  ttl: 1000,
  cleanupInterval: 500,
});

// Automatic cleanup runs every 500ms
// Expired entries are removed automatically

// Manually cleanup expired entries
const cleaned = cache.cleanupExpired(); // Returns number of cleaned entries

// Stop automatic cleanup
cache.stopCleanup();

// Destroy cache and cleanup resources
cache.destroy();
```

## Events

The cache provides a comprehensive event system that allows you to monitor and react to all cache operations. Events are emitted for every operation, giving you full visibility into cache behavior.

### How Events Work

Events can be registered using the `on()` method with flexible patterns:

1. **Specific key and event:** `cache.on("key", "event", handler)` - Listen to a specific event on a specific key
2. **All events for a key:** `cache.on("key", handler)` - Listen to all events for a specific key
3. **All keys for an event:** `cache.on("*", "event", handler)` - Listen to a specific event for all keys
4. **All keys and events:** `cache.on("*", handler)` - Listen to all events for all keys

**Event handler signature:**

```typescript
type CacheEventHandler<K, V> = (
  key: K | K[] | undefined, // The key(s) involved, undefined for utility operations
  value: V | V[] | undefined, // The value(s) involved, undefined for delete operations
  event: CacheEvent // The event name
) => void;
```

**Removing listeners:**

- `cache.off("key", "event", handler)` - Remove specific handler
- `cache.off("key", "event")` - Remove all handlers for an event
- `cache.off("key", handler)` - Remove handler from all events on a key
- `cache.off("key")` - Remove all listeners for a key

### Available Events

#### Set Events

**`set`** - Emitted when a single value is set

```typescript
const cache = new Cache<string, number>();

cache.on('user:123', 'set', (key, value, event) => {
  console.log(`Set ${key} to ${value}`); // Set user:123 to 42
});

cache.set('user:123', 42);
```

**`setMany`** - Emitted when multiple values are set at once

```typescript
const cache = new Cache<string, number>();

cache.on('*', 'setMany', (keys, values, event) => {
  console.log(`Set ${keys.length} keys`); // Set 3 keys
});

cache.setMany([
  ['key1', 100],
  ['key2', 200],
  ['key3', 300],
]);
```

#### Get Events

**`get`** - Emitted when a value is retrieved

```typescript
const cache = new Cache<string, number>();
cache.set('user:123', 42);

cache.on('user:123', 'get', (key, value, event) => {
  console.log(`Retrieved ${key}: ${value}`); // Retrieved user:123: 42
});

cache.get('user:123');
```

**`getMany`** - Emitted when multiple values are retrieved

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);
cache.set('key2', 200);

cache.on('*', 'getMany', (keys, values, event) => {
  console.log(`Retrieved ${values.length} values`); // Retrieved 2 values
});

cache.getMany(['key1', 'key2', 'key3']);
```

#### Delete Events

**`delete`** - Emitted when a value is deleted

```typescript
const cache = new Cache<string, number>();
cache.set('user:123', 42);

cache.on('user:123', 'delete', (key, value, event) => {
  console.log(`Deleted ${key}`); // Deleted user:123
});

cache.delete('user:123');
```

**`deleteMany`** - Emitted when multiple values are deleted

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);
cache.set('key2', 200);

cache.on('*', 'deleteMany', (keys, value, event) => {
  console.log(`Deleted ${keys.length} keys`); // Deleted 2 keys
});

cache.deleteMany(['key1', 'key2', 'key3']);
```

#### Mutate Events

**`mutate`** - Emitted when a value is updated using a function

```typescript
const cache = new Cache<string, number>();
cache.set('counter', 10);

cache.on('counter', 'mutate', (key, value, event) => {
  console.log(`Mutated ${key} to ${value}`); // Mutated counter to 20
});

cache.mutate('counter', (v) => v * 2);
```

**`upsert`** - Emitted when a value is updated or inserted

```typescript
const cache = new Cache<string, number>();

cache.on('counter', 'upsert', (key, value, event) => {
  console.log(`Upserted ${key} to ${value}`); // Upserted counter to 5
});

cache.upsert('counter', 5);
```

**`increment`** - Emitted when a numeric value is incremented

```typescript
const cache = new Cache<string, number>();
cache.set('counter', 10);

cache.on('counter', 'increment', (key, value, event) => {
  console.log(`Incremented ${key} to ${value}`); // Incremented counter to 15
});

cache.increment('counter', 5);
```

**`decrement`** - Emitted when a numeric value is decremented

```typescript
const cache = new Cache<string, number>();
cache.set('counter', 10);

cache.on('counter', 'decrement', (key, value, event) => {
  console.log(`Decremented ${key} to ${value}`); // Decremented counter to 5
});

cache.decrement('counter', 5);
```

**`append`** - Emitted when items are appended to an array

```typescript
const cache = new Cache<string, number[]>();
cache.set('items', [1, 2]);

cache.on('items', 'append', (key, value, event) => {
  console.log(`Appended to ${key}:`, value); // Appended to items: [1, 2, 3, 4]
});

cache.append('items', 3, 4);
```

**`merge`** - Emitted when values are merged

```typescript
const cache = new Cache<string, { a: number; b: number }>();
cache.set('obj', { a: 1, b: 2 });

cache.on('obj', 'merge', (key, value, event) => {
  console.log(`Merged ${key}:`, value); // Merged obj: { a: 1, b: 3, c: 4 }
});

cache.merge('obj', { b: 3, c: 4 });
```

#### Utility Events

**`size`** - Emitted when cache size is queried

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);

cache.on('*', 'size', (key, value, event) => {
  console.log('Size queried');
});

const size = cache.size(); // Triggers event
```

**`sizeInBytes`** - Emitted when cache size in bytes is queried

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);

cache.on('*', 'sizeInBytes', (key, value, event) => {
  console.log('Size in bytes queried');
});

const bytes = cache.sizeInBytes(); // Triggers event
```

**`keys`** - Emitted when all keys are retrieved

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);
cache.set('key2', 200);

cache.on('*', 'keys', (key, values, event) => {
  console.log('Keys retrieved:', values); // Keys retrieved: ['key1', 'key2']
});

const keys = cache.keys(); // Triggers event
```

**`values`** - Emitted when all values are retrieved

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);
cache.set('key2', 200);

cache.on('*', 'values', (key, values, event) => {
  console.log('Values retrieved:', values); // Values retrieved: [100, 200]
});

const values = cache.values(); // Triggers event
```

**`entries`** - Emitted when all entries are retrieved

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);

cache.on('*', 'entries', (key, values, event) => {
  console.log('Entries retrieved:', values); // Entries retrieved: [['key1', 100]]
});

const entries = cache.entries(); // Triggers event
```

**`isEmpty`** - Emitted when cache emptiness is checked

```typescript
const cache = new Cache<string, number>();

cache.on('*', 'isEmpty', (key, value, event) => {
  console.log('Is empty checked:', value); // Is empty checked: true
});

const isEmpty = cache.isEmpty(); // Triggers event
```

**`randomKey`** - Emitted when a random key is retrieved

```typescript
const cache = new Cache<string, number>();
cache.set('key1', 100);
cache.set('key2', 200);

cache.on('*', 'randomKey', (key, value, event) => {
  console.log('Random key queried');
});

const random = cache.randomKey(); // Triggers event
```

### Advanced Event Usage

**Listen to all operations on a specific key:**

```typescript
const cache = new Cache<string, number>();

cache.on('user:123', (key, value, event) => {
  console.log(`Operation ${event} on ${key}:`, value);
});

cache.set('user:123', 42); // Operation set on user:123: 42
cache.get('user:123'); // Operation get on user:123: 42
cache.delete('user:123'); // Operation delete on user:123: undefined
```

**Listen to a specific event for all keys:**

```typescript
const cache = new Cache<string, number>();

cache.on('*', 'set', (key, value, event) => {
  console.log(`Set operation on ${key}:`, value);
});

cache.set('key1', 100); // Set operation on key1: 100
cache.set('key2', 200); // Set operation on key2: 200
```

**Error handling:**

Event handlers that throw errors are caught and logged, but don't break cache operations:

```typescript
const cache = new Cache<string, number>();

cache.on('*', 'set', (key, value, event) => {
  throw new Error('Handler error'); // Error is caught and logged
});

cache.set('key1', 100); // Still works, error is logged to console
```

## API

### `Cache<K, V>`

#### Constructor

```typescript
new Cache(options?: CacheOptions)
```

#### Set Operations

- `set(key: K, value: V): void` - Set a value in the cache
- `setMany(entries: Array<[K, V]>): void` - Set multiple values at once

#### Get Operations

- `get(key: K): V | undefined` - Get a value from the cache
- `getMany(keys: K[]): V[]` - Get multiple values at once (filters out undefined)
- `has(key: K): boolean` - Check if a key exists
- `getEntry(key: K): CacheEntry<V> | undefined` - Get entry with metadata
- `peek(key: K): V | undefined` - Peek at a value without affecting eviction order

#### Delete Operations

- `delete(key: K): boolean` - Delete a value from the cache
- `deleteMany(keys: K[]): number` - Delete multiple values, returns count
- `clear(): void` - Clear all entries

#### Mutate Operations

- `mutate(key: K, updater: (value: V) => V): V | undefined` - Update using a function
- `upsert(key: K, valueOrUpdater: V | ((value: V | undefined) => V)): V` - Update or insert
- `increment(key: K, amount?: number): number | undefined` - Increment numeric value
- `decrement(key: K, amount?: number): number | undefined` - Decrement numeric value
- `append<T>(key: K, ...items: T[]): T[] | undefined` - Append to array
- `merge<T>(key: K, updates: Partial<T>): T | undefined` - Merge object

#### Utility Operations

- `size(): number` - Get the number of entries
- `sizeInBytes(): number` - Get the size in bytes
- `keys(): K[]` - Get all keys
- `values(): V[]` - Get all values
- `entries(): Array<[K, V]>` - Get all entries
- `isEmpty(): boolean` - Check if cache is empty
- `randomKey(): K | undefined` - Get a random key

#### Cleanup Operations

- `cleanupExpired(): number` - Manually cleanup expired entries
- `stopCleanup(): void` - Stop automatic cleanup
- `destroy(): void` - Destroy the cache and cleanup resources

### `CacheOptions`

```typescript
interface CacheOptions {
  maxEntries?: number; // Maximum number of entries (default: Infinity)
  maxBytes?: number; // Maximum size in bytes. If entry is larger, all entries are removed and new entry is set anyway
  ttl?: number; // Time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds (default: 60000)
  evictionPolicy?: 'FIFO' | 'LRU'; // Eviction policy: 'FIFO' (default) or 'LRU'
  autoDeleteAfterUse?: boolean; // Automatically delete entry after get() is called (default: false)
  mergeAllowDuplicates?: boolean; // Allow duplicates when merging arrays (default: false)
  alarm?: CacheAlarm; // Alarm callbacks for size warnings
}
```

### `CacheEntry<T>`

```typescript
interface CacheEntry<T> {
  value: T;
  expiresAt?: number; // Timestamp when entry expires
  createdAt: number; // Timestamp when entry was created
  lastAccessed?: number; // Last access time (used for LRU eviction, set when using LRU policy)
  ttlLeft?: number; // Time to live remaining in milliseconds (calculated dynamically)
  age?: number; // Age of the entry in milliseconds (calculated dynamically)
}
```

## Persistence

This cache is **in-memory only** by design. Data is not persisted to disk or shared between browser tabs by default. If you need persistence, you can implement it yourself:

### Browser: Using localStorage

```typescript
import { Cache } from 'another-cache';

// Create cache with serialization helpers
const cache = new Cache<string, any>();

// Save to localStorage on changes
function saveToStorage() {
  const entries = cache.entries();
  localStorage.setItem('cache', JSON.stringify(entries));
}

// Load from localStorage on init
function loadFromStorage() {
  const stored = localStorage.getItem('cache');
  if (stored) {
    const entries = JSON.parse(stored);
    cache.setMany(entries);
  }
}

// Load on init
loadFromStorage();

// Save on every set/delete
const originalSet = cache.set.bind(cache);
cache.set = (key, value) => {
  originalSet(key, value);
  saveToStorage();
};

const originalDelete = cache.delete.bind(cache);
cache.delete = (key) => {
  const result = originalDelete(key);
  saveToStorage();
  return result;
};
```

### Node.js: Using File System

```typescript
import { Cache } from 'another-cache';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CACHE_FILE = join(process.cwd(), 'cache.json');

const cache = new Cache<string, any>();

// Load from file
function loadCache() {
  try {
    const data = readFileSync(CACHE_FILE, 'utf-8');
    const entries = JSON.parse(data);
    cache.setMany(entries);
  } catch (error) {
    // File doesn't exist or is invalid
  }
}

// Save to file
function saveCache() {
  const entries = cache.entries();
  writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
}

// Load on init
loadCache();

// Save periodically or on process exit
setInterval(saveCache, 60000); // Every minute
process.on('SIGINT', () => {
  saveCache();
  process.exit(0);
});
```

### Browser: Sharing Between Tabs (BroadcastChannel)

```typescript
import { Cache } from 'another-cache';

const cache = new Cache<string, any>();
const channel = new BroadcastChannel('cache-sync');

// Listen for updates from other tabs
channel.onmessage = (event) => {
  const { type, key, value } = event.data;
  if (type === 'set') {
    cache.set(key, value);
  } else if (type === 'delete') {
    cache.delete(key);
  }
};

// Broadcast changes to other tabs
const originalSet = cache.set.bind(cache);
cache.set = (key, value) => {
  originalSet(key, value);
  channel.postMessage({ type: 'set', key, value });
};

const originalDelete = cache.delete.bind(cache);
cache.delete = (key) => {
  const result = originalDelete(key);
  channel.postMessage({ type: 'delete', key });
  return result;
};
```

## Architecture

The library is built with a modular architecture:

```
src/
├── cache.ts              # Main Cache class
├── types.ts              # TypeScript types
├── operations/           # Modular operations
│   ├── set.ts           # Set operations
│   ├── get.ts           # Get operations
│   ├── delete.ts        # Delete operations
│   ├── mutate.ts        # Mutation operations
│   ├── utility.ts        # Utility operations
│   └── cleanup.ts       # Cleanup operations
└── utils/
    └── size.ts          # Size calculation utilities
```

## Building

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Testing

Tests are organized in a structured test directory:

```
tests/
├── cache.test.ts              # Main Cache tests
├── operations/               # Operation-specific tests
│   ├── set.test.ts
│   ├── get.test.ts
│   ├── delete.test.ts
│   ├── mutate.test.ts
│   ├── utility.test.ts
│   └── cleanup.test.ts
└── utils/
    └── size.test.ts
```

## License

MIT
