
# Read-Write-Firestore

A data-driven design, production ready Firestore client for React/Redux. The fastest UI & DX for Firestore.

---
- instant UI updates
- zero boilerplate redux: no reducers, no slices, no selectors, no entity mappers, no normalization
- data-driven tests: no boilerplate, no mocks, seemlessly switch between unit & integation tests
- offline first NoSQL with live subscriptions

[badges]

# API Basics

## Read

`useRead({ path, ...query })` 

Load, query & subscribe to live updates from Firestore.

```ts
const taskList = useRead({ path: 'tasks' });

const taskOne = useRead({ 
  path: 'tasks', 
  id: 'task-one' 
});

const taskQuery = useRead({ 
  path: 'tasks', 
  where: [
    ['status', '==', 'done'],
    ['assignee', '==', myUID]
  ],
  orderBy: ['createdAt', 'desc'],
});
```

`useCache({ path, id })` 

Select a document directly from the normalized, in-memory Redux store.
```ts
const readTask = useCache({ 
  path: 'tasks', 
  id: taskOne.id
});
```
[@see Advanced Read](./read.md#advanced-read)

## Write

`createMutate({ action, read, write })` 

Create a Redux action creator to create, update & delete data. Mutations synchrnously update the Redux store making React components feel instant. 

```ts
const archiveTask = createMutate({ 
  action: 'ArchiveTask', 

  read: (taskId) => ({ taskId: () => taskId }), 
  
  write: ({ taskId }) => ({ 
    path:'tasks', 
    id: taskId, 
    archived: true 
  }),
});
```

Action creators return a promise when Firestore accepts or rejects your mutation. 

```ts
useDispatch(archiveTask('task-one'))
  .then(() => alert('task archived.'));
```

## Test

`it.each([{ payload, mutation, returned }])(...shouldPass)`

`it.each([{ payload, returned }])(...shouldFail)`

Zero bolierplate testing. No mocks or spies; just data. Instantly switch between unit & integration tests.

```ts
const USE_EMULATOR = false;

it.each([{
  payload: 'task-one',
  mutation: { 
    path:'tasks', 
    id: 'task-one', 
    archived: true 
  }
}])(...shouldPass(archiveTask, USE_EMULATOR));

it.each([{
  payload: 'task-one',
  returned: new Error('Document not found.'),
}])(...shouldFail(archiveTask, USE_EMULATOR));
```

`setCache({[alias]: [DocumentOne, DocumentTwo]});`

Storybook tests are as simple as providing the data that should return to the useRead & useCache calls. 

```tsx
const cache = setCache({
  myAlias: [
    { path:'tasks', id:'task-one', title: 'test task' }
  ],
});

export const Default = (): JSX.Element => (
  <Provider store={cache}>
    <TaskList />
  </Provider>
);
```

# Documentation

[link to docs]

[What's DoD (Data Oriented Design)?](https://gamesfromwithin.com/data-oriented-design)  
[Rational](https://github.com/TARAAI/read-write-firestore/docs/rational.md)  

# Setup

```
yarn add read-write-firestore firebase @reduxjs/toolkit 
```

```javascript
import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import {
  getFirebase,
  getFirestore,
  firebaseReducer,
  firestoreReducer,
} from 'read-write-firestore';
import thunk from 'redux-thunk';

import firebase from 'firebase/compat/app';

// Create store with reducers and initial state
export const store = configureStore({
  // Add Firebase to reducers
  reducer: combineReducers({ 
    firebase: firebaseReducer,
    firestore: firestoreReducer,
  }),
  middleware: [
    thunk.withExtraArgument({
      getFirestore,
      getFirebase,
    }),
  ],
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
```

Then pass store to your component's context using [react-redux's `Provider`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store):

```js
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import { store } from './app/store';
import { Provider } from 'react-redux';
import {
  ReactReduxFirebaseProvider,
  createFirestoreInstance,
} from 'read-write-firestore';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compact/auth';

const firebaseApp = firebase.initializeApp({
  authDomain: process.env.REACT_APP_FIREBASE_authDomain,
  databaseURL: process.env.REACT_APP_FIREBASE_databaseUrl,
  projectId: process.env.REACT_APP_FIREBASE_projectId,
});

render(
  <Provider store={store}>
      <ReactReduxFirebaseProvider
        firebase={firebaseApp}
        dispatch={store.dispatch}
        createFirestoreInstance={createFirestoreInstance}
      >
        <App />
      </ReactReduxFirebaseProvider>
    </Provider>,
  document.querySelector('body'),
);
```


  
  



---
---
---

```ts
const isLoading = useRead({ path, id }) === undefined;
const hasNoResults = useRead({ path, id }) === null;
// const { error } = useRead({ path, id });

const isLoading = useRead({ path }) === undefined;
const hasNoResults = useRead({ path }) === [];
// const { error } = useRead({ path });


const computed = useRead(
  [{ path }, { path }], 
  ([list1=[], list2=[]]) => list1.length + list2.length
);

// how to useCache
// const alias = useRead({ path }, '::alias');
// const list = useCache(alias); 

// how to useCache
// const aliases = useRead([{ path }], '::alias');
// const list = useCache(alias); 
```

---
# Research

GraphQL hooks - 1k
(GraphQL - decribe your data, ask for what you want, get predicitable results) many results in single request. move faster with powerful developer tools. evovle your API w/o version

```md
🥇 First-class hooks API
⚖️ Tiny bundle: only 7.6kB (2.8 gzipped)
📄 Full SSR support: see graphql-hooks-ssr
🔌 Plugin Caching: see graphql-hooks-memcache
🔥 No more render props hell
⏳ Handle loading and error states with ease
```


```ts
const { loading, error, data, refetch, cacheHit } = useQuery(QUERY)
const [queryFn, state] = useManualQuery(query, [options])
const [mutationFn, state, resetFn] = useMutation(mutation, [options])
```

Features, Install, Support (Node LTS, Browsers > 1%, not dead), Quick Start (Provider setup, useRead), Why graphql-hooks (Small in size, Concise API, Quick to get up and running), API


Apollo - 17k
"A fully-featured, production ready caching GraphQL client for every UI framework and GraphQL server." - github
"The Apollo Graph Platform unifies GraphQL across your apps and services, unlocking faster delivery for your engineering teams." - site

Documentation, Maintainers, Who is Apollo?

graphql/graphql-js - 18k
"A reference implementation of GraphQL for JavaScript"

redux-firestore - 6k DL

firestore - 1M DL
apollo client - 1.9M DL
Redux - 6.7M DL
ReduxToolkit - 1M DL 



# Read-Write-Firestore

A data-first, production ready Firestore client for React/Redux.



A Data-driven Design for Firestore.
- homogenous API
- stateless
- writes are syncrchonous & eventually consistent
- fast
- easily switch between transaction, single and batch writes
- read complex queries
- compaitable with redux
- zero boliterplate - no reducers, slices, selectors, 
- Recieve a promise from a dispatch
- no boliterplate to create class to represent data
- fine tune performance with zero work
- no string parsing API
- pagination, infinite loading
- offline, cache. Instant synchronous mutations that are eventually consistent. 
- no entity adapter, no hand-rolled normalization 
- offline support
- seemless intergration with redux stacks
- seemless connecting and indexing for web3
- Fully data driven, so app can be built w/o react, fully headless BFF; making react UIs extremely light and fully swappable.
- Testing extermely easy with full data driven API. No mock, no spys, with optional Typescript decoders no stubs either. 
- Tests front-to-back of the wrapper or full end-to-end in the database. 
- API built to avoid many of the design restrictions with Firestore



## Outline
- solutions - ordered lists, incrementing ids, unique documents

## Entire API

Create Firestore onSnapshotListener
- `useRead({ path, id })` 

Create an action creator to save, update & delete documents
- `createMutate({ action, read, write })` 

Optionally get read data directly from the in-memory cache
- `useCache({ path, id })` 



```ts
const isLoading = useRead({ path, id }) === undefined;
const hasNoResults = useRead({ path, id }) === null;

const isLoading = useRead({ path, ..query }) === undefined;
const hasNoResults = useRead({ path, ..query }) === [];

const computed = useRead(
  [{ path, id }, { path, ..query }], 
  ([list1=[], list2=[]]) => list1.length + list2.length
);

// allow for nested components to use select direction
const alias = useRead({ path, ..query }, '::alias');
const list = useCache(alias); 

const aliases = useRead([{ path, ..query }], '::alias');
const list = useCache(alias); 

const doc = useCache({ id, path });
```


How to compose multiple documents and queries??
```ts
const count = useRead([
    { path: 'counter'. id: 'global' }, 
    { path: 'users' }
  ],
  ([counterDoc, users]: any[]) => 
    counterDoc.amount * users.length
);
```

How to write up completely headless?
```ts
const pageQueries = [
  { path: 'counter'. id: 'global' }, 
  { path: 'users' }
];
// get reads for an entire page.
const [counterAlias, userAlias] = useRead(pageQueries, '::alias');

return <>
  <UserList alias={userAlias} />
  <Counter alias={counterAlias} />
</>

// user.tsx
export function UserList({alias}) {
  const usernames = useCache(alias, ['name']);
  return usernames.map(({name}) => (<div>{name}</div>));
}
```


```ts 
const tasks = useRead({ path: 'tasks' });
const taskOne = useRead({ path: 'tasks', id: 'task1' });
const [tasks, users] = useRead([{ path: 'tasks'}, {path: 'users'}]);
```


## Reads and Writes

Data-driven Design focus on data to comumicate the API. Rather then class inheratence
structure are flat and simple data is the API. 

```ts
const read = useRead({ id:'task1', path:'tasks' });
const list = useRead({ path:'tasks' });
const query = useRead({ path:'tasks', where: ['status', '==', 'done'] });
const paginate = useRead({ 
  path:'tasks', 
  where: [
    ['status', '==', 'done'],
    ['teamId', '==' 'team1']
  ],
  orderBy: ['createdAt', 'desc'],
  startAt: LocalDate.now(), // cursor based on orderBy field
  limit: 10
});
const nextPage = useRead({ 
  path:'tasks', 
  where: [
    ['status', '==', 'done'],
    ['teamId', '==' 'team1']
  ],
  orderBy: ['createdAt', 'desc'],
  startAt: paginate[paginate.length - 1].createdAt,
  limit: 10
});
const [ oneRead, oneList ] = useRead([
    { id: 'task1', path: 'tasks' }, 
    { path:'users' }
]);
const limitFields = useRead({ path:'users', fields: ['name'] });
```

```ts
// single write
export const singleArchiveTask = createMutate({
  action: 'SingleArchiveTask',

  read: (taskId) => ({ taskId: () => taskId }),

  write: ({ taskId }) => ({
    id: task.id,
    path: 'tasks',
    archived: true,
  }),
});

// batch write
export const batchArchiveTask = createMutate({
  action: 'BatchArchiveTask',

  read: (taskIds) => ({ taskIds: () => taskIds }),

  write: ({ taskIds, uid }) => 
    taskIds.map((task) => ({
        id: task.id,
        path: 'tasks',
        archived: true,
      })
    ),
});

// multiple documents acid-compliant transaction write
export const transactionArchiveTask = createMutate({
  action: 'TransactionArchiveTask',

  read: (taskId, sprintId) => ({ 
    task: { id: taskId, path: 'tasks' },
    sprint: { id: sprintId, path: 'sprint' }
  }),

  write: [
    ({ task }) => ({
      id: task.id,
      path: task.path,
      archived: true,
    }),
    ({ task, sprint }) => ({
      id: sprint.id,
      path: sprint.path,
      orderedTaskIds: ['::arrayRemove', task.id]
    }),
});
```





single and batches writes
```ts
export const archiveTask = createMutate({
  action: 'ArchiveTask',

  read: (taskIds) => ({
    taskIds: () => taskIds,
  }),

  write: ({ uid, orgId, taskIds }) => 
    (Array.isArray(taskIds) ? taskIds : [taskIds]).map((task) => ({
      archived: true,
      updatedAt: ['::serverTimestamp'],
      updatedBy: uid,
      path: `orgs/${orgId}/tasks`,
      id: task.id,
      }),
    ),
});
```

## Data-driven Tests

### Unit Tests
```ts
// archive.js
import createMutate from 'redux-firestore/es/utils/createMutate';

export const singleArchiveTask = createMutate({
  action: 'SingleArchiveTask',

  read: (taskId) => ({ taskId: () => taskId }),

  write: ({ taskId }) => ({
    id: task.id,
    path: 'tasks',
    archived: true,
  }),
});

// archive.test.js
import { shouldPass } from 'redux-firestore/es/jest.test';

it.each([{
    payload: { taskId: 'task1' },
    mutation: [{
      id: task.id,
      path: 'tasks',
      archived: true,
    }],
  },
])(...shouldPass(singleArchiveTask));
```

### Storybook Tests

```ts
mockCache({
  query: { path: "tasks" },
  result: [{ id: 'task1', path: 'tasks', title: 'test title' }]
});

export const Default = (): JSX.Element => (
  <Provider store={store}>
    <MemoryRouter initialEntries={[`/${MOCK_ORG_ID}`]}>
      <Route path='/:orgId'>
        <TaskCard
          assigneeAvatarURL={MOCK_CURRENT_USER.avatarURL}
          assigneeId={MOCK_CURRENT_USER.id}
          assigneeName={MOCK_CURRENT_USER.name}
          effortLevel={1}
          removeTaskAssignee={remove}
          setTaskAssignee={setAssignee}
          status={TaskStatus.Todo}
          taskId='123'
          title='Lorem ipsum dolor sit amet consectetur'
          updateTaskWithTitle={updateTask}
          users={[]}
        />
      </Route>
    </MemoryRouter>
  </Provider>
);
```


## Debugging

Enable browser debugging to troubleshoot dataflow issues
```ts 
localStore.debug='w3:*'
localStore.debug='w3:cache'
localStore.debug='w3:mutate'
localStore.debug='rrfVerbose:*'
```

## Hook Components

```tsx
export function TodoList({ uid }) {
  const recentTodos = useRead({
    path: `users/${uid}/todos`, 
    where: ['updatedAt', '>', LocalDate.now().minusWeeks(2)]
  });
  
  return (<ol>
    {recentTodos.map((todo) => 
      (<TodoItem todo={todo} />)
    )}
  </ol>);
}

export function TodoItem({ todo }) {
  const { id, path, title, updatedAt, isComplete } = todo;
  
  return (<li>
    <input 
      type='checkbox' 
      checked={isComplete} 
      onChange={() => updateTodo({id, path, isComplete: !isComplete})}
    />
    <span>{title}</span>
    <span>{updatedAt}</span>
  </li>);
}
```

## Action Creator

Action Creators get data provided from React & can load and query Firestore.

```ts
export const updateTodo = createMutate({
  action: 'updateTodo',
  
  read: ({ id, path, title, isComplete }) => ({
    item: () => ({ id, path, title, isComplete })
  }),

  write: ({ item }) => ({
    ...item,
    updatedAt: ['::serverTimestamp'],
  })
});
```








## Setup

```javascript
import { createStore, combineReducers } from 'redux';
import { reduxFirestore, firestoreReducer } from 'redux-firestore';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const initialState = {};

// Initialize firebase & firestore
firebase.initializeApp({});
firebase.firestore();

// Create store with reducers and initial state
export const store = configureStore({
  // Add Firebase to reducers
  reducer: combineReducers({ 
    firebase: firebaseReducer,
    firestore: firestoreReducer,
  }),
  [],
  // add reduxFirestore store enhancer
  [reduxFirestore(firebase)], 
});
```

Then pass store to your component's context using [react-redux's `Provider`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store):

```js
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.querySelector('body'),
);
```

## Advanced

acid-compliant transaction writes
```ts
export const moveTask = createMutate({
  action: 'MoveTask',

  read: ({taskId, insertAfterId, newSprintId}, {orgId}) => {
    if (newSprintId === null) {
      return {
        task: { path: `orgs/${orgId}/tasks`, id: taskId }
      };
    }
    return {
      insertAfterId: () => insertAfterId,
      newSprint: { path: `orgs/${orgId}/sprints`, id: newSprintId },
      task: { path: `orgs/${orgId}/tasks`, id: taskId },
    };
  },

  writes: [

    // move task into new sprint or set null for backlog
    ({ task, uid, newSprint }) => ({
      id: task.id,
      path: task.path,
      updatedBy: uid,
      updatedAt: ['::serverTimestamp'],
      sprint: newSprint?.id ?? null
    }),

    // remove from old sprint (if set) and insert into priority order on new sprint
    ({ task, uid, newSprint, insertAfterId }) => {
      if (!newSprint) return null;

      const writes = [];
      const previousSprint = task.sprint;
      if (previousSprint) {
        writes.push({
          id: previousSprint,
          path: newSprint.path,
          orderedTaskIds: ['::arrayRemove', task.id],
        });
      }
      
      const orderedTaskIds = JSON.parse(JSON.stringify(tasks));
      const index = tasks.findIndex((taskId) => taskId === insertAfterId);
      orderedTaskIds.splice(index + 1, 0, task.id);

      writes.push({
        id: newSprint.id,
        path: newSprint.path,
        orderedTaskIds,
      });
      return writes;
    }
  ]
});
```

```ts
 // Simple Mutation

  const const archiveTask = createMutate({
   action: 'ArchiveTask',
   reads: ({ taskIds }) => ({
     taskIds,
   }),
   writes: ({ uid, org, taskId }) =>
       decode<UI.UITaskArchiveChangeset>({
         archived: true,
         updatedAt: ['::serverTimestamp'],
         updatedBy: uid,
         path: `orgs/${org}/tasks`,
         id: taskId,
       }, 'UITaskArchiveChangeset')),
 });


 // Batch Mutation

 const const archiveTask = createMutate({
   action: 'ArchiveTask',
   reads: ({ taskIds }) => ({
     taskIds,
   }),
   writes: [({ uid, org, taskIds }) =>
   (Array.isArray(taskIds) ? taskIds : [taskIds])
     .map((taskId) =>
       decode<UI.UITaskArchiveChangeset>({
         archived: true,
         updatedAt: ['::serverTimestamp'],
         updatedBy: uid,
         path: `orgs/${org}/tasks`,
         id: taskId,
       }, 'UITaskArchiveChangeset'))],
 });

 // Transaction Mutation

 const const archiveTask = createMutate({
   action: 'ArchiveTask',
   reads: ({ taskId }, { uid }) => ({
     task: { id: taskId, path: `orgs/${org}/tasks` },
   }),
   writes: ({ uid, org, task }) =>
   (Array.isArray(taskIds) ? taskIds : [taskIds])
     .map((taskId) =>
       decode<UI.UITaskArchiveChangeset>({
         archived: true,
         updatedAt: ['::serverTimestamp'],
         updatedBy: uid,
         path: task.path,
         id: task.id,
       }, 'UITaskArchiveChangeset')),
 });

 // Complex ACID-compliant Transaction Mutation

 const const archiveSprint = createMutate({
   action: 'ArchiveSprint',
   reads: ({ taskId, sprintId }, { uid }) => ({
     task: { id: taskId, path: `orgs/${org}/tasks` },
     sprint: { id: sprintId, path: `orgs/${org}/sprints` },
     sprintTasks: {
       path: `orgs/${org}/tasks`,
       where: ['sprint', '==', sprintId],
     },
   }),
   writes: [
     ({ uid, task }) =>
       decode<UI.UITaskArchiveChangeset>({
         archived: true,
         updatedAt: ['::serverTimestamp'],
         updatedBy: uid,
         path: task.path,
         id: task.id,
       }, 'UITaskArchiveChangeset'),
     ({ uid, sprint }) =>
       decode<UI.UISprintArchiveChangeset>({
         archived: true,
         updatedAt: ['::serverTimestamp'],
         updatedBy: uid,
         path: sprint.path,
         id: sprint.id,
       }, 'UISprintArchiveChangeset'),
     ({ uid, sprintTasks }) =>
       sprintTasks.map((task) =>
         decode<UI.UISprintArchiveChangeset>({
           archived: true,
           updatedAt: ['::serverTimestamp'],
           updatedBy: uid,
           path: task.path,
           id: task.id,
         }, 'UITaskArchiveChangeset'),
 });
```