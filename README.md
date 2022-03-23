# Read/Write

**[dark launch: pre-release]**

The fastest, production-ready DX & UX for NoSQL Firestore.

---
- **Instant UI.** All data mutations run synchronously with in-memory optimistic commits.
- **Zero Redux boilerplate.** No reducers, no slices, no selectors, no entity mappers, no normalization.
- **Data-driven testing.** No boilerplate, no mocks, no spys, seemlessly switch between unit & integation tests or generate Haskell-style check tests.
- **Offline-first NoSQL.** Firestore ACID-compliant transactions with live subscriptions.


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
[@see Advanced Write](./docs/write.md#advanced-write)

Action creators return a promise when Firestore accepts or rejects your mutation. 

```ts
useDispatch(archiveTask('task-one'))
  .then(() => alert('task archived.'));
```

## Test (Both Unit and Integration)

`it.each([{ payload, results }])(...shouldPass)`

`it.each([{ payload, returned }])(...shouldFail)`

Zero bolierplate testing. No mocks or spies; just data. Unit tests can instantly run as parallelized integration tests.

```ts
import { archiveTask } from '../mutations';

const RUN_AS_INTEGRATION = false; // 'true' runs loads/saves to Firestore in parallel

it.each({
  payload: { taskId: '99' },

  setup: [{ 
    id: '99', 
    path: 'tasks', 
    archived: false, 
    title: 'sample' 
  }],
  
  results: [{ 
    id: '99', 
    path: 'tasks', 
    archived: true, 
    title: 'sample' 
  }],
 })(...shouldPass(archiveTask, RUN_AS_INTEGRATION));
 

it.each([{
  payload: { taskId: 'not-valid-id' },

  returned: new Error('Document not found.'),
}])(...shouldFail(archiveTask, RUN_AS_INTEGRATION));
```
[@see Jest Test](./docs/test.md#jest)

## StoryBook
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
[@see Storybook Test](./docs/test.md#storybook)

# Alternate Firestore libraries

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
