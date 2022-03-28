# Performance

Read-write-firestore is pre-baked with performance tracking. Profiling
provides full transparency of:
1. the time the cache reducer takes to run
2. how long and which documents load from Firestore
3. sequential phases your app load Firestore documents
4. how long the mutate function takes to create Firestore document refs


```ts
// most common; mutate data being sent to Firestore
localStorage.debug = 'readwrite:mutate';  

// cache reducer's optimistic reads + processing times
localStorage.debug = 'readwrite:cache';   

// track time in functions + Firestore load times
localStorage.debug = 'readwrite:profile'; 

// enable all non-verbose logging
localStorage.debug = 'readwrite:*';     

// rarely used; low-level library debugging
localStorage.debug = 'w3Verbose';  
```

# Profiling

Profiling displays the CPU time taken by the library.

#### Description of metrics
- `index`: The function that was run
- `mean`: The average (mean) time it takes to run the function
- `samples`: How many times this function has run since turning on profiling
- `min`: The shortest amount of time to run the function
- `max`: The longest amount of time to run the function
- `sum`: The total aggregate time to run the function for all samples

#### Types of indexes

- `@readwrite:/cache.SET_LISTENER`  
Runs everytime a `useRead` sets a new listener for a Firestore query.

- `@readwrite:/reprocess.${firestore-collection-name}`  
When an optimistic commit is added any of the existing queries for that
collection might change. So a new commit comes it the cache reducer will 
reprocess all queries for that path to ensure the results reflect what
should happen when that document as completed it's save and Firestore 
reruns the query. [@see docs/cache-reducer](./cache-reducer.md#reprocessing)


- `@readwrite:/cache.LISTENER_RESPONSE`  
When a Firestore listener has initial results or new results this action
is triggered. Initial results will add directly to the cache reducer alias key.
New results will get the add/remove documents and only modify those locations.

- `@readwrite:/cache.MUTATE_START`  
The cache reducer's total time to process a mutation into an optimistic commit.

- `@readwrite:/mutate.writeSingle`  
The mutate function turning a JSON into a Firestore Document Reference for a 
single update/set call.

- `@readwrite:/mutate.writeInTransaction:reads`  
In a transaction documents must be read from Firestore. This is the time it
takes the mutate function to read in all documents for a transaction. This 
is where most of the time is spent since Firestore `.get` requests must
go to the IndexDB on disk in order to get the documents. 


- `@readwrite:/mutate.writeInTransaction:writes`  
In a transaction after the documents are read (and locked) in Firestore the 
writes are called and JSON is turned into Firestore Document Reference that
are sent to the GCP server to process the Transaction.



# Firestore Collection Loads
- `index`: The path of the collection attempted to load
- `start`: The milliseconds since the app started that it tried to load
- `duration`: Total time for Firestore to respond to the query 
- `loaded`: How many documents Firestore returned for that query