# Strategies for Modeling in NoSQL 

- [Foundations](#foundations)
  - [Does NoSQL mean NoRelationships?](#does-nosql-mean-norelationships)
  - [Documents vs Tables](#documents-vs-tables)
  - [Schemaless](#schemaless)
  - [Laws of Firestore](#laws-of-firestore)
  - [Denormalization vs Normalization](#demoralization-vs-normalization)
  - [Indexing](#indexing)
- [Strategies](#strategies)
  - [Structuring Data]()
  - [Handling Relationships](#handling-relationships)
  - [Fetching Strategies](#fetching-strategies)
  - [Versioning and Migrations](#versioning-and-migrations)
  - [Specific Use Cases](#specific-use-cases)
  - [Recommendations](#recommendations)
  - [Offline](#offline)

# Foundations

### Does NoSQL mean NoRelationships?

No. All data has relationships. NoSQL models data relationships differently. 
The real different is 
**NoSQL scales with GigaBytes. SQL scales with GigaHertz**.

_RDBMSs_ (MySQL being the most prominent) were built in an era of
Morse's Law. CPU doubled every 18 months. Data was _normalized_ with 
hard-coded relationships. When the database was put on a machine with 
more GigaHertz, the queries got faster. You just waited 18 months for a 
new CPU and bought a beefier machine. Upgrading the machine is called 
`vertical scaling`. 

_NoSQL_ allows relationships to be fluid instead of fixed.
_Demoralization_ of data allows data to be spread over multiple storage 
locations. As the amount of data grows, data is sharded across 
more machines to increase query speed. Adding more machines to 
speed up queries is called `horizontal scaling`.

### Documents vs Tables

document based vs table based

no joins. -- need to know access patterns up front. 

ERD: Entity Relationship Diagram. create to document the structure and 
flow of the data.

list out your access patterns, write down what the patterns are

More flexible than Dynamo for queries

# Planning


- Data modeling process
  - how to think about your problem
  - understand you application
  - create ERD entity relationship diagram, helps to preplan these relationships
  - list out your access patterns, write down what the patterns are
  -  design your table for those access pattern, list index key
  - Know your strategies

# Schemaless 

Super fast reads but no joins. 

# Laws of Firestore

Law 1. Limitations
  - 1 MB per document
  - 40,000 indexes per document
  - 1 QPS sustained writes
  - queries are NOT dynamic. Queries precompute sorting/filters 
  so that every query is a simple lookup in constant time. 

Law 2. Query will only fetch complete documents, no partials.

Law 3. Billing is based on the documents touch.
  - if your going to always grab all the parents and your subcollection there's lots of reads
  - in general one doc per react view

Law 4. Queries search for index fields collection. subcollections can be private.

Law 5. Queries are shallow. Queries will only fetch documents, not subcollections.

Law 6. Maximum of 500 docs per Transaction or Batch. 


# Demoralization 

# Indexing

@see the official Firestore document for the most 
detailed information.

Firestore automatically creates all single key indexes.
Running `useReads({path: 'tasks', where:['status', '==' 'done']})`
has a index that automatically created. As docs are added the
indexes get updated as well.

Query Exceptions. Nested fields also get indexes automatically 
created. When the key of a nested object is an ID or some other
dynamic variable it's not useful to index on and will go
against the max indexing limit. Manually add an exclusion 
for these types of data.
```ts
// Add an index exception for orderItems to avoid 
//  wasting space on impossible queries.
{ orderItems: {
  someItemID: { cost: 100 },
  otherItemID: { cost: 85 },
}}
```

# Strategies


#### Cascading relationship lookups

Strategies that work for MongoDB & DynamoDB won't automatically
for well for self-replicating NoSQL clients.

Warning. Don't use Mongo populates.
MongoDB uses populations to fetch a single document
and then fetch the relational documents. This works
for MongoDB because there's negligible latency between 
the code and the database. 

Populates in the browser NoSQL have a different limitation,
exponentially worse latency. Instead of thousands of a 
millisecond connection the database has multiple seconds. 
Unless the entire cascade can be models, batched and supported
in the database it's each request takes too long to be effective.
As of April 2022, Firestore server-side database doesn't have
any native batching support. 

The more effective strategy is to model data to _reduce_ n-deep
relational fetches, structure document differently, denormalize
and cache computed values.



#### Denormaliztation + Duplication Strategy
- server-side with Cloud Functions
- use a transaction in `createMutate` by listing the path/id of related documents

#### Handling Relationships



# Fetching Strategies

# Sorting/Filtering Strategies 
- ordering by a string field goes by UTF8 bytes. only sortes in UTF8 bytes. all uppercase come before lowercase. look at UTF8 byte chart
- filter as much as possible in the queries.
- the number of event listeners for queries even in large apps 
are < 50. Generally not a problem. Use an alias useRead with useCache
to reduce useless listeners/fetching.

# Specific Cases

- TODO: unique, incrementing ids
- TODO: ordered list of items
  - linked list, single vs double
  - parent ordered array
- TODO: computed values
  -  transactions vs cloud functions
- TODO: historical changes
  - subcollection snapshot vs changeset vs bigquery
- TODO: global configuration
  - global use settings for local docs (effort type)
- TODO: soft delete vs hard delete
- TODO: why exclude indexes
- TODO: undefined vs null for queries
- TODO: titles for relationship
  - listing user name, requirement title, sprint title
  - how frequently will it change
    - should it be a transaction or a side effect on cloud function
- TODO: cost of bad cascading relationship lookups
  - huge latency, 


# Versioning and Migrations

Rules for versioning.
- don't delete a key or remove existing simantics of a value
- think about stale local cache
### Thinking in local cache

### Recommendations
- Migrations: don't delete a key or remove existing semantics of a value
- Use nested updates
- Force a transaction by adding a query or path/id to the createMutate reads 
to guarantee globally accurate data
- Timestamps? In mutations use ['::serverTimestamp'] which provides a now
timestamp when mutating locally and a updated more globally accurate 
timestamp when validated on the server.
- Complex queries? NoSQL starts to break down. 
- Send the minimal data needs to update. All updates will merge with the 
document. Use [Atomic Operations](./write.md#atomic-operations)

## Offline

Offline must be enabled for Web. 
- Designed to be offline for a few days max.
- Need to figure out to run query on server or from local cache
- Can force to use server or use cache
- Writes first in indexDB then replicate to the server
- Big write updates will freeze the client for a bit
- Offline writes will write locally then send when reconnects online.
- LRU(Last Recently Used) cache. Recently used docs stay around longer.
- realtime listener won't ping the callback if the doc is the same

---

  