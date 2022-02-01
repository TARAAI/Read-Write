/* istanbul ignore file */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/auth';
import createFirestoreInstance, {
  getFirestore,
} from '../createFirestoreInstance';
import firestoreReducer from '../reducer';
import mutate from '../utils/mutate';
import thunk from 'redux-thunk';
import { configureStore, unwrapResult } from '@reduxjs/toolkit';
import { isEmpty, isFunction, merge, pick } from 'lodash';

jest.mock('../utils/actions', () => ({
  ...jest.requireActual('../utils/actions'),
  wrapInDispatch: jest.fn(),
}));
const { wrapInDispatch } = require('../utils/actions');
const { wrapInDispatch: dispatchActual } =
  jest.requireActual('../utils/actions');

jest.mock('../reducers/utils/mutate', () => ({
  ...jest.requireActual('../reducers/utils/mutate'),
  mutationWriteOutput: jest.fn(),
}));
const { mutationWriteOutput } = require('../reducers/utils/mutate');
const { mutationWriteOutput: mutationWriteOutputActual } = jest.requireActual(
  '../reducers/utils/mutate',
);

const noop = () => null;

function setupFirestore(databaseURL, enhancers, sideEffects, preload = []) {
  const store = configureStore({
    reducer: {
      firestore: firestoreReducer,
    },
    middleware: [
      thunk.withExtraArgument({
        getFirestore,
        ...enhancers,
      }),
    ],
    preloadedState: {
      firestore: {
        cache: {
          database: preload.reduce(
            (normalized, data) =>
              merge(normalized, { [data.path]: { [data.id]: data } }),
            {},
          ),
        },
      },
    },
  });

  const app = firebase.initializeApp({
    databaseURL,
    authDomain: 'localhost:9099',
    projectId: 'demo-read-write-web3',
  });
  const extendedFirestoreInstance = createFirestoreInstance(
    app,
    { userProfile: 'users', useFirestoreForProfile: true },
    store.dispatch,
  );

  firebase.firestore().useEmulator('localhost', 8080);

  wrapInDispatch.mockImplementation((dispatcher, action) =>
    sideEffects(dispatcher, store.getState, action),
  );

  return [extendedFirestoreInstance, store, app];
}

async function loadCollection(firestore, messages) {
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

async function cleanFirestore(firestore, messages) {
  const batch = firestore.batch();
  messages.forEach(({ path, id }) => {
    batch.delete(firestore.doc(`${path}/${id}`));
  });

  return batch.commit();
}

/**
 */

/**
 * Autotest unit + integration
 *
 * @param {Function} actionCreatorFn The createMutate action
 * @param {Boolean} [useEmulator=false] run as intergration test
 * @returns {Function} Jest Test
 *
 * ## Basic Example Usage:
 * #### Action Creator
 * ```js
 * const archiveTask = createMutate({
 *    action: 'archiveTask',
 *    read: ({ id: taskId }) => ({ myTaskId: () => taskId }),
 *    write: ({ myTaskId }) => ({ id: myTaskId, path: 'tasks', archived: true }),
 * });
 * ```
 * #### Action Creator Test
 * ```js
 * it.each([{
 *     payload: { id: '999' },
 *     results: [{ id: '999', path: 'tasks', archived: true }],
 * }])(...shouldPass(archiveTask));
 * ```
 *
 * //**
 * Autotest unit+integration
 *
 * @param {string} testName Custom test suite name
 * @param {Function} actionCreatorFn  The createMutate action
 * @param {Boolean} [useEmulator=false] run as intergration test
 * @returns {Function} Jest Test
 *
 * ## Advanced Example Usage:
 * #### Action Creator
 * ```js
 * const archiveTask = createMutate({
 *    action: 'archiveTask',
 *    read: ({ id: taskId }, { orgId }) => ({
 *        myTask: { path: `orgs/${orgId}/tasks`, id: taskId },
 *        taskId: () => taskId,
 *    }),
 *    write: ({ myTask, taskId }) => ({
 *       id: myTask?.id || taskId,
 *       path: myTask?.path || 'orgs/my-org/tasks',
 *       archived: true,
 *   }),
 * });
 * ```
 * #### Action Creator Test
 * ```js
 * it.each([{
 *     setup:    [{ path: 'orgs/my-org/tasks', id: 'task-one', archived: false, title: 'sample' }],
 *     globals:   { orgId: () => 'my-org' },
 *     payload:   { id: '999' },
 *     writes:    { path: 'orgs/my-org/tasks', id: 'task-one', archived: true },
 *     results:  [{ id: '999', path: 'tasks', archived: true }],
 *     returned: undefined,
 * }])(...shouldPass('Advanced integration test for archiving tasks', archiveTask, true));
 * ```
 */
function shouldPass(actionCreatorFn, useEmulator = false) {
  const isIntegration =
    typeof useEmulator === 'boolean' ? useEmulator : arguments[2] || false;

  const type = isIntegration ? '[intergration]' : '[unit]';
  const testname =
    typeof actionCreatorFn === 'string'
      ? `${type}: ${actionCreatorFn}`
      : `${type}: ${actionCreatorFn.typePrefix || ''} $payload should pass.`;

  const actionCreator = isFunction(useEmulator) ? useEmulator : actionCreatorFn;

  return [
    testname,
    async ({
      payload,
      writes: writesExpected,
      results: resultsExpected,
      returned: returnExpected,
      globals,
      setup,
    }) => {
      if (
        setup &&
        !(
          Array.isArray(setup) &&
          setup.every(({ path, id }) => !isEmpty(path) && !isEmpty(id))
        )
      ) {
        throw new Error(
          `'setup' must be an { path:string; id: string; ...any}[] but recieved ${JSON.stringify(
            setup,
          )}.`,
        );
      }

      const databaseURL =
        typeof isIntegration === 'string'
          ? isIntegration
          : (isIntegration && 'localhost:8080') || null;

      const log = [];

      let cache = {};
      let customDispatcher = (dispatcher, getState, action) => {
        const mutationPromise = dispatchActual(dispatcher, action, {
          extras: globals,
        });

        cache = getState().firestore.cache;

        log.push({ event: 'cache', data: getState().firestore.cache });

        return mutationPromise;
      };

      const [firestore, store, firebaseApp] = setupFirestore(
        databaseURL,
        globals,
        customDispatcher,
        setup,
      );

      if (setup) {
        await mutate({ firestore: () => firestore }, setup);
      }

      let writeRecieved;
      mutationWriteOutput.mockImplementation((writes, db) => {
        writeRecieved = Array.isArray(writesExpected) ? writes : writes[0];
        return mutationWriteOutputActual(writes, db);
      });

      const dispatched = store
        .dispatch(actionCreator(payload))
        .then(unwrapResult);

      // Action Creator should not throw errors
      const returnRevieved = await expect(dispatched).resolves.not.toThrow();

      if (writesExpected !== undefined) {
        // Validates the expected results from the writes
        expect(writesExpected).toStrictEqual(writeRecieved);
      }

      // validate outputs in redux store & firestore
      if (resultsExpected !== undefined) {
        const {
          firestore: diskExpected = resultsExpected,
          cache: memoryExpected = resultsExpected,
        } = resultsExpected;

        Object.keys(memoryExpected).forEach((path) =>
          Object.keys(memoryExpected[path]).forEach((id) => {
            const documentExpected = memoryExpected[path][id];
            const keys = Object.keys(documentExpected);
            const optimistic = {
              ...((cache.database && cache.database[path][id]) || {}),
              ...((cache.databaseOverrides &&
                cache.databaseOverrides[path][id]) ||
                {}),
            };
            const documentCached = pick(optimistic, keys);

            // Validates each document's synchronous, optimistic results in Redux
            expect(documentExpected).toStrictEqual(documentCached);
          }),
        );

        if (databaseURL) {
          const queries = [];
          Object.keys(diskExpected).forEach((path) => {
            const collection = diskExpected[path];
            Object.keys(collection).forEach((id) => {
              queries.push({ path, id });
            });
          });

          // load the actual document from the firestore emulator
          const database = await loadCollection(firestore, queries);

          Object.keys(diskExpected).forEach((path) =>
            Object.keys(diskExpected[path]).forEach((id) => {
              const keys = Object.keys(diskExpected[path][id]);
              const documentSavedToFirestore = pick(
                database[path][id] || {},
                keys,
              );
              const documentExpected = pick(diskExpected[path][id] || {}, keys);

              // Validates each final document saved to firestore
              expect(documentExpected).toStrictEqual(documentSavedToFirestore);
            }),
          );
        }
      }

      if (returnExpected !== undefined) {
        // Validate the return from the async thunk payload
        expect(returnExpected).toStrictEqual(returnRevieved);
      }

      await cleanFirestore(firestore, [
        ...(setup || []),
        ...(Array.isArray(writeRecieved) ? writeRecieved : [writeRecieved]),
      ]);

      await firebaseApp.delete();
      for (var i in firestore) {
        firestore[i] = null;
      }

      console.log(firebase.app);
    },
  ];
}

/**
 * shouldFail
 *
 * it.each([{
 *   payload: { id: '' },
 *   returned: new Error('`id` is empty string.'),
 * }])(...shouldFail(archiveTask));
 *
 * @param {Function} actionCreator
 * @returns {Array<string, Function>} - Test Name and Test Function
 */
// const shouldFail = (...actionCreator) => {
//   const [testname, actionCreatorFnc] =
//     actionCreator.length === 1
//       ? [
//           `${actionCreator[0].typePrefix || ''} $payload fails properly.`,
//           actionCreator[0],
//         ]
//       : [actionCreator[0], actionCreator[1]];
//   return [
//     testname,
//     async ({ payload, mutation, returned, globals }) => {
//       const mutate = jest.fn();
//       const getFirestore = jest.fn().mockReturnValue({
//         mutate,
//       });
//       const thunk = [noop, noop, { ...globals, getFirestore }];
//       const dispatched = actionCreatorFnc(payload)(...thunk).then(unwrapResult);
//       await expect(dispatched).rejects.not.toBeUndefined();

//       if (mutation !== undefined) {
//         expect(mutate).toHaveBeenCalledWith(mutation);
//       }

//       try {
//         await dispatched;
//       } catch (error) {
//         if (returned === undefined) {
//           if (!(error instanceof Error) && error.stack) {
//             return expect(error).not.toBeNull();
//           }
//           return expect(error).toBeInstanceOf(Error);
//         }

//         if (returned instanceof Error) {
//           return expect(error).toStrictEqual(returned);
//         }

//         Object.keys(returned).map((key) => {
//           expect(error[key]).toStrictEqual(returned[key]);
//         });
//       }
//     },
//   ];
// };
//
// export { shouldFail, shouldPass };

export { shouldPass };
