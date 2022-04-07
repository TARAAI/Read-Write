# Read

- [Basic Reads](#basic-reads)
  - [Read](#read)
  - [Partial Reads](#partial-reads)
  - [Value Reads](#value-reads)
- [Advanced Reads](#advanced-reads)
   - [Alias Reads](#alias-reads)
   - [Derived Data Reads](#derived-data-reads)
- [Query Syntax](#query-syntax)
  - [Collections](#collections)
  - [Single Document](#single-document)
  - [Collection Group](#collection-group)
  - [where](#where)
  - [Where Clauses](#where-clauses)
  - [Order By](#orderby)
  - [Limit](#limit)
  - [startAt/startAfter](#startatstartafter)
  - [endAt/endBefore](#endatendbefore)
- [Firestore Indexes](#firestore-indexes)
- [Advanced Strategies](#advanced-strategies)
  - [Rendering lists](#rendering-lists)
  - [Pagination](#pagination)
  - [Sliding Windows](#sliding-windows)
  - [useCache](#usecache)

---

## Basic Reads

**Read/Write Subscriptions**

In Read/Write subscriptions are turned on by default. Anytime useRead is
called it automatically listens for any document changes both locally and
globally. When the order changes, docs are added/removed from the query 
results or the contents of a document are changed, then the hook will fire 
and this will trigger the React component to rerender. As of v1, there is not a single
fetching; only a fetch and subscribe for global changes. 

You can minimize when rerender are triggered by selecting a 
[Partial Read](#partial-reads) or a [Value Read](#value-read). If the subscription listener is separate from displaying the data (like in a normal list fo items) then use an [Alias Read](#alias-reads) to setup the subscription and
a [`useCache`](#usecache) to access data from the local store. Even [Derived data](#drivied-data-reads) in Read/Write is straight forward and performant without 
the need for any complexity in the setup or usage. 

**Query**

[All queries of Firestore](#query-syntax) work in Read/Write. The only difference 
is to use data to instead of the chaining API provided by Google. Internally 
Google's API supports everything from a basic get to an advanced nested subset 
of FieldValue updates. 

**Strategies for Modeling Data**

For best practices on modeling data see the [modeling-nosql](./modeling-nosql.md)
document. 


#### Read

`useRead({ path, ...query })` 

Query/Load document & subscribe to live updates from Firestore.

```ts
const singleTask = useRead<Task>({ 
  path: 'tasks', 
  id: 'task-one'
});

const tasks = useRead<Task>({ 
  path: 'tasks', 
  where: [
    ['status', '==', 'done'],
    ['assignee', '==', myUID]
  ],
  orderBy: ['createdAt', 'desc'],
});
```

**loading state**\
When a `useRead` is called initially, and data is not already loaded in memory, 
it will return an `undefined`. Just like in React 18, the recommendation is 
if a loader is needed then return null from the component. Then use a parent 
component to decide whether to show a loader or not.

**not found state**\
If the document is not found after reading from the database it will 
return a `null`.

**error state**\
Create a parent/ancestor be React ErrorBoundaries to catch and handle any errors.

**Typescript Types**\
`useRead` uses function overloading. This means it can return the data requested 
depending on what was asked for. Below are the types for a single document load 
or loading a list of documents from a query.\
For full query syntax details [jump to #ReadQuerySyntax](#query-syntax).
```ts
type PathId = { id:string; path: string; };
type Document = FirestoreDocument & PathId;
type Loading = undefined;
type NotFound = null;

// Single Document
function useRead<Document>(
  pathId: PathId
): Document | Loading | NotFound;

// Multiple Documents
function useRead<Document>(
  query: { path:string; } & Optional<ReadQuery>,
): Document[] | Loading | NotFound;
```

#### Partial Reads

`useRead({ path, ...query }, [...keysOfDocument])` 

Query & load & subscribe to live updates from Firestore but only return a partial of top-level properties.

```ts
const { title, status } = useRead<Task>({ 
    path: 'tasks', 
    id: 'task-one'
  },
  ['title', 'status']
);

const taskTitlePartials = useRead<Task>({ 
    path: 'tasks', 
    where: [
      ['status', '==', 'done'],
      ['assignee', '==', myUID]
    ],
    orderBy: ['createdAt', 'desc'],
  },
   ['title']
);
```

**Typescript Types**
```ts
// Partial
function useRead<Document)>(
  pathId: PathId,
  fields: (keyof Document)[],
): Pick<Doc, (keyof Document)[]> | Loading | NotFound;

// Multiple Partials
function useRead<Document>(
  query: { path:string; } & Optional<ReadQuery>,
  fields: (keyof Document)[],
): Pick<Doc, (keyof Document)[]>[] | Loading | NotFound;
```

#### Value Reads

`useRead({ path, ...query }, keysOfDocument)` 

Query & load & subscribe to live updates from Firestore but only return 
the value of a single top-level property.

```ts
const title = useRead<Task>({ 
    path: 'tasks', 
    id: 'task-one'
  },
  'title'
);

const taskTitleStrings = useRead<Task>({ 
    path: 'tasks', 
    where: [
      ['status', '==', 'done'],
      ['assignee', '==', myUID]
    ],
    orderBy: ['createdAt', 'desc'],
  },
  'title'
);
```

**Typescript Types**
```ts
// Load a value
function useRead<Document)>(
  pathId: PathId,
  field: keyof Document,
): Document[keyof Document] | Loading | NotFound;

// Load values from multiple documents
function useRead<Document>(
  query: { path:string; } & Optional<ReadQuery>,
  field: keyof Document,
): (Document[keyof Document])[] | Loading | NotFound;
```

## Advanced Reads

#### Alias Reads

The most used advanced read will be an alias. Reads will subscribe 
Firestore to updates on the doc(s) requested until the component 
is unmounted. To minimize listeners you can pass a second argument 
to return the reads alias(es). Those aliases can be passed into 
the `useCache` function. `useCache` is only a Redux selector to 
get the results and _does not_ add more Firestore .onSnapshot listeners. 
In order to get just the alias the second argument is a special 
enum of `::alias`.
```ts
const taskAlias = useRead(
  { path: 'tasks' }, 
  '::alias'
);
```
Example of usage
```ts
function ParentComponent() {
  const taskAlias = useRead({ path: 'tasks' }, '::alias');
  return <ChildComponent taskAlias={taskAlias} />;
}

function ChildComponent ({taskAlias}) {
  const tasks = useRead(taskAlias);

  if (tasks === undefined) return null;

  return task.map((doc) => (<li>`{doc.path}/${doc.id}`</li>);
}
```

**Typescript Types**
```ts
// Get alias for a single document
function useRead<Document)>(
  pathId: PathId,
  hasAlias: '::alias',
): String;

// Get alias for a query
function useRead<Document>(
  query: { path:string; } & Optional<ReadQuery>,
  hasAlias: '::alias',
): String;
```

##### Derived Data Reads

Derived data in Redux add vast complexity; not reduces it. Fortunately 
derived data (aka computed data) in Read/Write is designed to be simple, easy 
and performant.

To start let's review the challenges in Redux proper. Redux's [`createSelector`](https://redux.js.org/usage/deriving-data-selectors#createselector-overview) 
requires overly complex boilerplate. It's so easy to get wrong that the 
documentation calls out how you will probably write it wrong. It's that the API
designer's job? Should the design reduce complexity, provide flexibility/expressiveness so it's easy to so the right thing?

Read/Write is built on data-driven, composable pieces. Learning one concept is 
built upon with others. The hard work of simplification makes things easy and composable. 

The heart of computed data in Read/Write just uses a partial read. Since the 
component only pulls up the primitive data it needs a simple equality check
inside useRead ensures the component will only trigger a React render check
when data needed for the compute has changed. 

To calculating derived data just pull the needed data and calculate like normal.
```ts
const effortType = useRead<Sprint, 'effortType'>(
  {path: 'sprints', id: sprintId}, 
  'effortType'
);
const taskEfforts = useRead<Task, 'effortLevel'>(
  {path: 'tasks', where: ['sprintId', '==', sprintId]}, 
  'effortLevel'
);

function calculateEffort(type: 'days' | 'points', efforts: number[]): number {
  return `${efforts.reduce((sum, value) => sum + value, 0)} ${type}`;
}

if(!!effortType || !!taskEfforts) return null;

return <span>{calculateEffort(effortType, taskEfforts)}</span>;
```

---

## Query Syntax


A 1-to-1 mirror of [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)

##### Collections

```js
{ path: 'users' } // entire collection
{ path: `orgs/${myWorkspace}/tasks` } // entire subcollection
```

##### Single Document

```js
{ path: 'users', id: 'puppybits' }
```

##### Collection Group

Collection Groups are all Collections of that
have the same collection name, regardless of hierarchy. 
```js
//  task collection is under <org collection>/<org doc>/tasks
// this gets all tasks regardless of nesting
{ collectionGroup: 'tasks' },
```

##### Where

To create a single `where` call, pass a single argument array to the `where` parameter:

```js
{
  path: 'orgs/my-workspace/tasks',
  where: ['status', '==', 'done']
},
```

Multiple `where` queries are as simple as passing multiple argument arrays (each one representing a `where` call):

```js
{
  path: 'orgs/my-workspace/tasks',
  where: [
    ['status', '==', 'done']
    ['subtasks', '<', 2]
  ]
},
```

Firestore doesn't allow you to create `or` style queries. Use the `in` option with an array of options. Firestore only support 10
items in each `in` where so it will be broken up into multiple calls to firestore and returned
as a single result. 

```javascript
{
  path: 'users',
  where: [
    ['assignee', 'in', ['alice', 'bob', 'iba']],
    ['isOnline', '==', true]
  ]
}
```

###### Where Clauses

All Firestore [Where Clause](https://firebase.google.com/docs/reference/js/firestore_) are supported. 
- `<` 
- `<=`
- `==` 
- `!=` 
- `>=` 
- `>` 
- `array-contains`
- `array-contains-any` 
- `in`
- `not-in`

##### orderBy

To create a single `orderBy` call, pass a single argument array to `orderBy`

```js
{
  path: 'orgs/my-workspace/tasks',
  orderBy: ['assignee', 'asc'],
},
```

Multiple `orderBy`s are as simple as passing multiple argument arrays (each one representing a `orderBy` call)

```js
{
  path: 'orgs/my-workspace/tasks',
  orderBy: [
    ['assignee', 'desc'],
    ['status']
  ]
},
```

##### limit

Limit the query to a certain number of results

```js
{
  path: 'orgs/my-workspace/tasks',
  limit: 10
},
```


##### startAt/startAfter

> Creates a new query where the results start at the provided document (inclusive)

[From Firebase's `startAt` docs](https://firebase.google.com/docs/reference/js/firebase.firestore.CollectionReference#startAt)

```js
{
  path: 'orgs/my-workspace/tasks',
  orderBy: 'dueDate',
  startAt: new Date(),
},
```

_Can only be used with collections. Types can be a string, number, Date object, or an array of these types, but not a Firestore Document Snapshot_

> Creates a new query where the results start after the provided document (exclusive)...

[From Firebase's `startAfter` docs](https://firebase.google.com/docs/reference/js/firebase.firestore.CollectionReference#startAfter)

```js
{
  path: 'orgs/my-workspace/tasks',
  orderBy: ['dueDate', 'assignee'],
  startAt: [new Date(), 'alice'],
}
```

_Can only be used with collections. Types can be a string, number, Date object, or an array of these types, but not a Firestore Document Snapshot_

##### endAt/endBefore

> Creates a new query where the results end at the provided document (inclusive)...

[From Firebase's `endAt` docs](https://firebase.google.com/docs/reference/js/firebase.firestore.CollectionReference#endAt)

```js
{
  path: 'orgs/my-workspace/tasks',
  orderBy: ['dueDate', 'assignee'],
  endAt: [new Date(), 'alice'],
}
```

_Can only be used with collections. Types can be a string, number, Date object, or an array of these types, but not a Firestore Document Snapshot_

> Creates a new query where the results end before the provided document (exclusive) ...

[From Firebase's `endBefore` docs](https://firebase.google.com/docs/reference/js/firebase.firestore.CollectionReference#endBefore)

```js
{
  path: 'orgs/my-workspace/tasks',
  orderBy: 'dueDate',
  endBefore: new Date(),
},
```

_Can only be used with collections. Types can be a string, number, Date object, or an array of these types, but not a Firestore Document Snapshot_

---

## Firestore Indexes

Firestore indexes are still required ([@see official Firestore Index documentation](https://firebase.google.com/docs/firestore/query-data/indexing)) for all complex queries of more than one property.

Firestore queries are incredibly fast and do not degrade as the database gets
 more and more documents. 

There's a couple key points for Firestore reads:
1. Each collection has a 40,000 index limit
2. Each document has a 1MB limit
3. Single indexes are automatically created.
  In general this is good. But if you have a dynamic nested field in a document
  (like `{orderItems: {'some-sku': 4.54, 'other-sku': 10.20}}`) ever key will 
  get it's own index. [@see Firestore index exemptions](https://firebase.google.com/docs/firestore/query-data/index-overview)
4. Complex queries are pre-defined. 
  This means code can NOT dynamically mix and match different values to 
  query data. The first time you query data that's not indexed the console will
  notify you to create the index. 
5. Queries are available offline.
  Full queries work offline and in lo-fi/li-fi situations. The only limitation is 
  queries will return only the documents that were previously downloaded. 


---
## Advanced Strategies

## Rendering Lists

How should we display a list of items? The ideal is that each
React component will only rerender when the single document that it's
displaying has changed. Also if the list of order of documents changes
then only the parent component rerenders with the minimal changed. To seamlessly
enable this

```ts
// useRead sets up a global subscription for changes & 
//   will rerender when items are added/removed but NOT if a doc's values change
function listParentView() {
  const tasks = useRead<Task, 'path' | 'id'>(
    { path: 'tasks', where: ['status', '!=', 'done']}, 
    ['path', 'id']
  );
  if (tasks === undefined) return null;

  return <ol>{tasks.map(listItem)}</ol>
}

// useCache reads data from the local store but does NOT add a subscription listener &
//   will rerender only if the document values change
function listItem({path, id}){
  const task = useCache<Task, 'title' | 'assignee'>(
    {path, id}, 
    ['title', 'assignee']
  );
  return <div key={id}>{`${title}: ${assignee}`}</div>
}
```

#### Pagination

Pagination works with simple cursors. [@see official Firestore documentation](https://firebase.google.com/docs/firestore/query-data/query-cursors) for details
on writing pagination with query cursors.

Paginate through data by passing a variable for the `startAt`, `startAfter`, 
`endAt`, or `endBefore` that corresponds to the `orderBy` field.

```ts
const paginatedTasks = useRead({
  path: 'tasks', 
  where: ['status', '==', 'done'], 
  orderBy: ['completionDate', 'asc'], 
  startAfter: lastCompletionDate,
  limit: 20
});
```

Expand through data by loading more and more into the store by increasing the 
limit on each call.

```ts
const paginatedTasks = useRead({
  path: 'tasks', 
  where: ['status', '==', 'done'], 
  orderBy: ['completionDate', 'asc'], 
  startAfter: lastCompletionDate,
  limit: totalLimit
});
```

#### Sliding Windows

A sliding window is an advanced form of a pagination query. It relays on
starting at a pivot point document then loading docs both before and after.

```ts
const [before, pivot, after] = useRead([
  {path: 'sprints', orderBy: 'isoWeek', endBefore: now, limit: 3},
  {path: 'sprints', where: ['isoWeek', '==', now]},
  {path: 'sprints', orderBy: 'isoWeek', startAfter: now, limit: 3}
]);
const sprints = [...before, ...pivot, ...after];

return sprints.map(SprintView);
```


#### useCache

Under the covers `useRead` returns a memoize `useCache` hook.

The `useRead` hook already de-dupe any extra listeners. Only one listener will
be attached for Firestore using the `.onSnapshotListener` method. Any additional 
calls will be registered and the listener for Firestore will only be removed 
after _all_ components using the data is unmounted.

`useCache` is publicly available but shouldn't need to be used. All it really 
does is grab the data but doesn't listen for changed. In Redux terminology
`useCache` is a memoize selector and `useRead` dispatches an action to load 
data and returns a memoize selector which contains the results.

`useCache({ path, id })` 

Select a document directly from the normalized, in-memory Redux store.
```ts
const readTask = useCache({ 
  path: 'tasks', 
  id: taskOne.id
});
```

`useCache(alias)`

Select a document directly from the normalized, in-memory Redux store.
```ts
const myAlias = useRead({ 
  path: 'tasks', 
  where: ['status', '!=', 'done'],
}, '::alias');

const taskList = useCache(myAlias);
```

Cache also accepts multiple reads and a mix of queries and document fetches. 
```ts
const [taskAlias, doneTaskAlias] = useRead([
  { path: 'tasks', id:'my-task' },
  { path: 'tasks', where: ['status', '!=', 'done'] }
], '::alias');

const [myTaskDoc, doneTaskList] = useCache([taskAlias, doneTaskAlias]);
```
