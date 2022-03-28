# Read/Write

**[dark launch: pre-release]**

## The fastest, production-ready DX & UX for NoSQL/Firestore.

- **[Instant UI.](#read)** Change data synchronously. No Thunks, no Sagas, no Axios, no GraphQL mutations/subscriptions. 
- **[Zero-Redux Redux.](#write)** Write Redux without Redux. No reducers, no slices, no selectors, no entity mappers, no normalization.
- **[The One Test.](#testing)** The One test rules them all. Why write seperate unit, integration, visual/storybook & property-based tests? _The One_ test validates each layer seperately & together. No boilerplate, no stubs, no mocks, no spys.
- **[Offline-first NoSQL.](#documentation)** Firestore ACID-compliant transactions with live subscriptions.


[![License][license-image]][license-url]

<!-- TODO: insert badges here 
[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![Code Style][code-style-image]][code-style-url]
[![Code Coverage][coverage-image]][coverage-url]
-->

# API Basics

## Read

`useRead({ path, ...query })` 

Query & load & subscribe to live updates from Firestore.

```ts
const tasks = useRead({ 
  path: 'tasks', 
  where: [
    ['status', '==', 'done'],
    ['assignee', '==', myUID]
  ],
  orderBy: ['createdAt', 'desc'],
});
```
[@see Advanced Read](./docs/read.md#advanced-read)


## Write

`createMutate({ action, read, write })` 

Create a Redux action creator to create, update & delete data. Mutations synchronously 
update the Redux store. This makes React components feel instant while data 
persistence are eventually consistent. 

```ts
const archiveAction = createMutate({ 
  action: 'ArchiveTask', 

  read: (taskId) => ({ taskId: () => taskId }), 
  
  write: ({ taskId }) => ({ 
    path:'tasks', 
    id: taskId, 
    archived: true 
  }),
});
```
[@see Advanced Write](./docs/write.md#advanced-write)

`createMutate` returns an Action Creator. When the action creator 
is dispatched it return a promise that will 
execute when Firestore accepts or rejects the mutation. 

```ts
import { archiveAction } from './mutations';

const ReactComponent = () => {
  return <div role="button" onClick={() => {
    useDispatch(archiveAction('task-one'))
      .then(() => alert('task archived.'));
  }} />
}
```

# Testing

## Unit Tests

`it.each([{ payload, results }])(...shouldPass)`

Zero bolierplate testing. No mocks or spies; just data. 

```ts
import { archiveAction } from '../mutations';

it.each({
  setup: [{ path: 'tasks', id: '99', archived: false, }],
  
  payload: { taskId: '99' },

  results: [{ path: 'tasks', id: '99', archived: true, }],

 })(...shouldPass(archiveAction));
``` 

`it.each([{ payload, returned }])(...shouldFail)`

Switch `results` for `returned` to run failure checks.

```ts
it.each([{
  payload: { taskId: 'not-valid-id' },

  returned: new Error('Document not found.'),

}])(...shouldFail(archiveAction));
```
[@see Jest Test](./docs/test.md#jest)


## Intergration Tests

Automatically upgrade unit tests to intergration with just a boolean. Integration tests loads setup data into the database, tests access rules then validates the final mutation in the database.  

_(Coming Soon): Parallelized intergation tests_

```ts
import { archiveAction } from '../mutations';

const RUN_AS_INTEGRATION = true; // or use the env var READWRITE_INTEGRATION=true

it.each({
  setup: [{ path: 'tasks', id: '99', archived: false, }],
  
  payload: { taskId: '99' },

  results: [{ path: 'tasks', id: '99', archived: true, }],

 })(...shouldPass(archiveAction, RUN_AS_INTEGRATION));
``` 
[@see Jest Test](./docs/test.md#jest)



## StoryBook Tests

`it.each([{ payload, component, results }])(...shouldPass)`

Unit tests can generate storybook tests with a pre and a post for
the mutation by adding a `component` property to the test.

```ts
import { archiveAction } from '../mutations';

it.each({
  setup: [{ path: 'tasks', id: '99', archived: false, }],
  
  payload: { taskId: '99' },

  component: 'path/to/component',

  results: [{ path: 'tasks', id: '99', archived: true, }],

 })(...shouldPass(archiveAction));
``` 
[@see Storybook Test](./docs/test.md#storybook)



## Typescript QuickCheck Tests

`it.each([{ payload, results }])(...shouldPass)`

Test for the unknown. Unit tests have one major flaw, they can only test the 
_known; not unknown_ cases. 

It's impossible for you to find the unknown. _But it is possible to let the unknowns find you._  

This is what Haskell-style QuickCheck does. QuickCheck systems are analogous 
to property-based testing or fuzzing. When data is generated on each run a single test can test and validate all possible permutations of pass/fail 
conditions for a mutation. When a test fails it will throw with the exact
data to expose new cases that the code didn't handle. 

```ts
import { generate } from 'TypescriptDecoder';
import { archiveAction } from '../mutations';

const task = generate('Task', { archived: false });

it.each({
  setup: [task],
  
  payload: { taskId: task.id },

  results: [{ ...task, archived: true, }],

 })(...shouldPass(archiveAction));
``` 
[@coming-soon: TypeCheck Tests]()
_Working to extract it from our codebase_


## The One Test (QuickType + Unit + Intergration + Storybook)

Why write multiple tests when you could write one?

```ts
import { generate } from 'TypescriptDecoder';
import { archiveAction } from '../mutations';

const task = generate('Task', { archived: false });

it.each({
  setup: [task],
  
  payload: { taskId: task.id },

  component: 'path/to/component',

  results: [{ ...task, archived: true, }],

 })(...shouldPass(archiveAction, true));
``` 
[@coming-soon: Docs for The One Tests]()

# Example Project

[Read/Write Notes](./examples/notes)

Run `yarn && yarn start`

# Alternatives

Looking for options to work with Firestore? Check out these other libraries:

- [Offical Google SDK](https://github.com/firebase/firebase-js-sdk)
- [ReactFire](https://github.com/FirebaseExtended/reactfire)
- [redux-firestore](https://github.com/prescottprue/redux-firestore)


# Documentation

**API Documentation**
- [Read](./docs/read.md)
- [Write](./docs/write.md)
- [Test](./docs/test.md)
- [Setup](./docs/getting-started.md)

**Code deep-dives**
- [Breaking down Optimistic Updates](./docs/cache-reducer.md)
- [Translating Firesore to Mutations](./docs/mutate.md)
- [No-Redux Redux](./docs/performance.md)

**Design Fundamentals**

- [What's DoD (Data Oriented Design)?](https://gamesfromwithin.com/data-oriented-design)  
- [Code Is Data; Data Is Code](https://medium.com/linebyline/choosing-clojure-part-1-code-is-data-8932f333e734)
- [Fact-based Queries](https://docs.datomic.com/on-prem/query/query.html)
- [Transducers](https://clojure.org/guides/faq#transducers_vs_seqs)


# Setup

1. Add the libraries to your project.
```
yarn add read-write firebase @reduxjs/toolkit redux
```

2. Include the firestore/firebase reducers and thunk middleware.
```javascript
import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import {
  getFirebase,
  getFirestore,
  firebaseReducer,
  firestoreReducer,
} from 'read-write';

import firebase from 'firebase/compat/app';

// Create store with reducers and initial state
export const store = configureStore({
  // Add Firebase to reducers
  reducer: combineReducers({ 
    firebase: firebaseReducer,
    firestore: firestoreReducer,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: {
        extraArgument: { getFirestore, getFirebase },
      },
    }),
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
`hooks.ts`
```ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

3. Initialize Firebase and pass store to your component's context using [react-redux's `Provider`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store):

```js
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import { store } from './app/store';
import { Provider } from 'react-redux';
import {
  ReactReduxFirebaseProvider,
  createFirestoreInstance,
} from 'read-write';

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

# Future Roadmap

**v1.0 - in progress**
- [x] lib: read & write data with optimistic commits
- [x] lib: 100% support for all Firestore features
- [x] lib: hooks return query results from firestore
- [x] lib: hooks return picks & partials of firestore data
- [x] lib: hooks alternative solution for createSelector
- [x] lib: hooks validatin of rendering performance
- [x] lib: cache reducer synchronous, optimistic reads
- [x] lib: cache reducer synchronous, optimistic database writes
- [x] lib: cache reducer synchronous updates all affected queries upon mutation
- [x] lib: cache reducer performance speed ups by minimizing Immer changes
- [x] lib: mutation support Redux enhancers for global data
- [x] lib: mutation support basic writes for Firestore
- [x] lib: mutation support nested field updates
- [x] lib: mutation force read providers to be idempotent
- [x] lib: mutation support for all FieldValue types (top-level only)
- [x] lib: mutation batches accept an infinite number of writes, chunk into 500 and fold in results
- [x] lib: mutation transactions run synchronous, optimistic and are ACID-compliant (online-only)
- [x] tests: support data-driven unit tests
- [x] tests: data-driven intergration tests with Firestore emulator
- [x] tests: data-driven storybook tests are written to disk
- [ ] **todo** tests: switch intergration tests to run parallelized 
- [x] DX: add _readwrite:cache_ profiling for Redux store changes
- [x] DX: add _readwrite:profile_ profiling for data load phases timings
- [ ] **in progress** docs: document public API layer
- [ ] **todo** testing: increase code coverage from 90% to 100%

**future**
- docs: document internal processes
- lib: remove redux-firebase, redux, redux-toolkit dependencies
- lib: create redux-compatable layer but don't use Redux
- lib: reduce lib deployment size
- lib: support CSP channel streaming reducers with max runtime buffer
- lib: support hard delete
- lib: remove deprecated populates
- lib: support custom returned results in dispatch promise
- lib: queries support Firestore Document Refs in pagination
- lib: allow custom config
- lib: cache reducer performance boost on reprocessing by exclude on where clauses
- lib: refactor cache reduce & mutation to be agnostic for any NoSQL
- tests: export Typescript Decoders from our interal project
- tests: move test cases to pure JSON
- tests: add auth into intergration tests for Firestore rules
- tests: create API to better integrate visual tests into storybook
- tests: setup support for standard redux reducers and selectors
- tests: QuickType support relational ids
- _add your feature request here_
