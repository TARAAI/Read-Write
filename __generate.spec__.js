// mock wrapInDispatch to record inputs - writeFnc won't serialize
// need to record the cache reducer
// need to record the db before & after

// how to track multi-stage events like mutation -> fail rollback or mutate -> mutate -> fail -> pass?
// [{event: action}, {event: cache-mutation}, {event: side-effect}, {event: error}]
// on each step pause, display data and allow dev to confirm

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/auth';
import createFirestoreInstance, {
  getFirestore,
} from '../src/createFirestoreInstance';
import firestoreReducer from '../src/reducer';
import thunk from '../examples/read-write-notes/node_modules/redux-thunk';
import fs from 'fs';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../src/utils/actions', () => ({
  ...jest.requireActual('../src/utils/actions'),
  wrapInDispatch: jest.fn(),
}));

const { wrapInDispatch } = require('./src/utils/actions');

const { wrapInDispatch: dispatchActual } = jest.requireActual(
  '../src/utils/actions',
);

const config = { userProfile: 'users', useFirestoreForProfile: true };

function setup(databaseURL, sideEffects) {
  // create redux store
  const store = configureStore({
    reducer: {
      firestore: firestoreReducer,
    },
    middleware: [
      thunk.withExtraArgument({
        getFirestore,
      }),
    ],
  });

  // setup firebase & state
  const app = firebase.initializeApp({
    databaseURL,
    authDomain: 'localhost:9099',
    projectId: 'demo-read-write',
  });

  firebase.firestore().useEmulator('localhost', 8080);

  const extendedFirestoreInstance = createFirestoreInstance(
    app,
    config,
    store.dispatch,
  );

  wrapInDispatch.mockImplementation((dispatcher, action) =>
    sideEffects(dispatcher, store.getState, action),
  );

  return [extendedFirestoreInstance, store];
}

async function load(firestore, messages) {
  let fragment = {};
  await Promise.all(
    messages.map(({ path }) => firestore.collection(path).get()),
  ).then((collection) => {
    const frag = collection.map((snap) => {
      return snap.docs.reduce(
        (db, doc) => ({
          ...db,
          [doc.ref.parent.path]: {
            [doc.id]: {
              id: doc.id,
              path: doc.ref.parent.path,
              ...doc.data(),
            },
          },
        }),
        {},
      );
    });
    fragment = { ...fragment, ...frag[0] };
  });
  return fragment;
}

async function clean(firestore, messages) {
  const batch = firestore.batch();
  messages.forEach(({ path, id }) => {
    batch.delete(firestore.doc(`${path}/${id}`));
  });

  return batch.commit();
}

export async function record(
  fileName,
  method,
  actions,
  databaseURL = 'localhost:8080',
) {
  if (!Array.isArray(actions)) actions = [actions];
  actions.forEach((action) => {
    action.path = `check-test/${fileName}/${action.path}`;
  });

  const log = [{ event: 'action', data: actions }];

  const [firestore, store] = setup(
    databaseURL,
    (dispatcher, getState, action) => {
      log.push({ event: 'cache', data: getState().firestore.cache });

      const { ref, ...message } = action;
      log.push({ event: 'dispatch', data: message });

      const mutatePromise = dispatchActual(dispatcher, action);

      log.push({ event: 'cache', data: getState().firestore.cache });

      mutatePromise.then((firestoreResult) => {
        if (firestoreResult)
          log.push({ event: 'mutate', data: firestoreResult });
      });

      return mutatePromise;
    },
  );
  console.log('firestore', firestore);
  // snapshot-pre
  if (databaseURL)
    log.push({
      event: 'firestore',
      data: await load(firestore, actions),
    });

  // run
  const dispatchThunkPromise = firestore[method](actions[0]);

  // snapshot-post
  if (databaseURL)
    await dispatchThunkPromise.then(async (result) =>
      log.push({
        event: 'firestore',
        data: await load(firestore, actions),
      }),
    );

  const output = JSON.stringify(log, null, 2);

  // all recordings done
  await clean(firestore, actions);

  if (typeof fileName === 'string') {
    if (!fs.existsSync('./check-test')) fs.mkdirSync('./check-test');
    fs.writeFileSync(`./check-test/${fileName}.json`, output);
  } else {
    fileName(output);
  }

  return log[log.length - 1];
}

export async function play(fileName, databaseURL = 'localhost:8080') {
  const results = require(`./check-test/${fileName}.json`);
  const validation = (log) => {
    // TODO: validate played === recorded
    console.log('recorded', log);
  };
  await record(validation, 'mutate', results[0].data);
}

it('test', async () => {
  const output = await record('first-test', 'mutate', {
    path: 'counters',
    id: 'global',
    value: 1,
  });
  console.warn(
    JSON.stringify(
      {
        mutate: 'myMutation',
        payload: {
          path: 'counters',
          id: 'global',
          value: 1,
        },
        output: output.data,
      },
      null,
      2,
    ),
  );
}, 50_000);

/*
// sample run.

record(
  'first-test',
  [generate('Requirement', { path: '/orgs/my-org/requirements' })], 
  myCustomMutation,
  payload
);
 

// snapshot firestore
// snapshot cache reducer

// -- run my custom mutation (while recording)

// validate outputs
*/
