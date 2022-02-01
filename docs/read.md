# Read

- [Basic Reads](#advanced-reads)
- [Partial Reads](#partial-reads)
- [Value Reads](#value-reads)
- [Query Syntax](#query-syntax)
- [useCache](#advanced-reads)

---

## Basic Reads


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
Create a parent/ancestor be React ErrorBoundries to catch and handle any errors.

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

## Partial Reads

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

## Value Reads

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


## Alias Reads

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


## Query Syntax


A 1-to-1 mirror of [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)

##### Entire Collection

```js
{ path: 'users' }
```

##### Single Document

```js
{ path: 'users', id: 'puppybits' }
```

##### Enitre Sub-collection

```js
{ path: 'orgs/my-workspace/tasks' }
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

###### Where Clause

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


##### startAt

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

##### startAfter

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

##### endAt

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

##### endBefore

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
## Advanced Usage

## useCache

Under the covers `useRead` returns a memoize `useCache` hook.

The `useRead` hook already de-dupe any extra listeners. Only one listener will
be attached for Firestore using the `.onSnapshotListener` method. Any addiontional 
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
  { 
    path: 'tasks', 
    where: ['status', '!=', 'done'],
  }
], '::alias');

const [myTaskDoc, doneTaskList] = useCache([taskAlias, doneTaskAlias]);
```



