/**
 * @jest-environment jsdom
 */

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
import { isEmpty, isFunction, merge, pick, kebabCase, startCase } from 'lodash';
import { Provider } from 'react-redux';
import React from 'react';
import { prettyDOM, render } from '@testing-library/react';
import { getQueryConfig, getQueryName } from '../utils/query';
import { actionTypes } from '../constants';
import { writeFile } from 'fs';
import { performance } from 'perf_hooks';

const __non_webpack_require__ = module[`require`].bind(module);

const removeColors =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

jest.mock('react-redux-firebase', () => ({
  ...jest.requireActual('react-redux-firebase'),
  useFirestore: jest.fn(),
}));
const { useFirestore } = require('react-redux-firebase');

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
          databaseOverrides: {},
        },
      },
    },
  });

  const app = firebase.initializeApp({
    databaseURL,
    authDomain: 'localhost:9099',
    projectId: 'demo-read-write',
  });

  const extendedFirestoreInstance = createFirestoreInstance(
    app,
    { userProfile: 'users', useFirestoreForProfile: true },
    store.dispatch,
  );

  // route useRead request to cache reducer bypassing firestore
  extendedFirestoreInstance.setListeners = (queryOpts) => {
    const unsubscribe = () => null;
    queryOpts.forEach((query) => {
      const meta = getQueryConfig(query);
      store.dispatch({
        type: actionTypes.SET_LISTENER,
        meta,
        payload: { name: getQueryName(meta) },
      });
    });

    return unsubscribe;
  };
  useFirestore.mockReturnValue(extendedFirestoreInstance);

  firebase.firestore().useEmulator('localhost', 8080);

  // spy on mutations
  wrapInDispatch.mockImplementation((dispatcher, action) => {
    // console.log('action', action);
    return sideEffects(dispatcher, store.getState, action);
  });

  return [extendedFirestoreInstance, store, app];
}

// send data to firestore directly
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
 * @param {Boolean} [useEmulator=false] run as integration test
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
 * @param {Boolean} [useEmulator=false] run as integration test
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
 *     setup:     [{ path: 'orgs/my-org/tasks', id: 'task-one', archived: false, title: 'sample' }],
 *     globals:    { orgId: () => 'my-org' },
 *     component:  './path/to/component.tsx or functionalComponent',
 *     payload:    { id: '999' },
 *     writes:     { path: 'orgs/my-org/tasks', id: 'task-one', archived: true },
 *     results:   [{ id: '999', path: 'tasks', archived: true }],
 *     returned: undefined,
 * }])(...shouldPass('Advanced integration test for archiving tasks', archiveTask, true));
 * ```
 */
function shouldPass(actionCreatorFn, useEmulator = false) {
  // useEmulator = false will run everything through redux-firestore but skip sending to the firestore DB
  const isIntegration =
    process.env.READWRITE_INTEGRATION ||
    (typeof useEmulator === 'boolean' ? useEmulator : arguments[2] || false);

  const type = isIntegration ? '[integration]' : '[unit]';
  const testSuiteName =
    typeof actionCreatorFn === 'string'
      ? `${type}: ${actionCreatorFn}`
      : `${type}: ${actionCreatorFn.typePrefix || ''} $payload should pass.`;

  const actionCreator = isFunction(useEmulator) ? useEmulator : actionCreatorFn;

  return [
    testSuiteName,
    async ({
      payload,
      writes: writesExpected,
      results: resultsExpected,
      returned: returnExpected,
      component,
      globals,
      setup,
      testname,
    }) => {
      const profiles = [
        {
          name: 'start',
          time: performance.now(),
          delta: 0,
        },
      ];
      if (
        setup &&
        !(
          Array.isArray(setup) &&
          setup.every(({ path, id }) => !isEmpty(path) && !isEmpty(id))
        )
      ) {
        throw new Error(
          `'setup' must be an { path:string; id: string; ...any}[] but received ${JSON.stringify(
            setup,
          )}.`,
        );
      }

      const databaseURL =
        typeof isIntegration === 'string'
          ? isIntegration
          : (isIntegration && 'localhost:8080') || null;

      const log = [];

      // wrap dispatch to spy on cache before mutation.
      let cache = {};
      let customDispatcher = (dispatcher, getState, action) => {
        const mutationPromise = dispatchActual(dispatcher, action, {
          extras: globals,
        });

        cache = getState().firestore.cache;

        log.push({ event: 'cache', data: getState().firestore.cache });

        return mutationPromise;
      };

      // connect real firestore server or jest in memory
      const [firestore, store, firebaseApp] = setupFirestore(
        databaseURL,
        globals,
        customDispatcher,
        setup,
      );
      profiles.push({
        name: 'firestore-init',
        time: performance.now(),
        delta: performance.now() - profiles[profiles.length - 1].time,
      });

      // --- preload data ---
      if (setup) {
        await mutate({ firestore: () => firestore }, setup);
      }

      profiles.push({
        name: 'firestore-preload',
        time: performance.now(),
        delta: performance.now() - profiles[profiles.length - 1].time,
      });

      // --- setup component ---
      let element;
      let elementName;
      let preComponent;
      if (component) {
        const UI =
          typeof component === 'string'
            ? __non_webpack_require__(component).default
            : component;
        elementName = component
          .split('/')
          .pop()
          .replace(/\.(tsx|jsx|js|ts)/, '');
        element = render(
          <Provider store={store}>
            <UI />
          </Provider>,
        );
        profiles.push({
          name: 'component-rendered',
          time: performance.now(),
          delta: performance.now() - profiles[profiles.length - 1].time,
        });

        preComponent = prettyDOM(element.container).replace(removeColors, '');
      }

      // spy on results returned from mutation
      let writeReceived;
      mutationWriteOutput.mockImplementation((writes, db) => {
        writeReceived = Array.isArray(writesExpected) ? writes : writes[0];
        return mutationWriteOutputActual(writes, db);
      });

      // send the test action
      const dispatched = store
        .dispatch(actionCreator(payload))
        .then(unwrapResult);

      // Action Creator should not throw errors
      const returnRevived = await expect(dispatched).resolves.not.toThrow();
      profiles.push({
        name: 'action-dispatched',
        time: performance.now(),
        delta: performance.now() - profiles[profiles.length - 1].time,
      });

      const postComponent = prettyDOM(element.container).replace(
        removeColors,
        '',
      );
      writeFile(
        `stories/${startCase(elementName)}_${kebabCase(testname)}.stories.tsx`,
        `import React from 'react';\nexport default {\n\t` +
          `title: '${startCase(elementName)}',\n};\n\n` +
          `export const Default = () => (${preComponent});\n\n` +
          `export const After = () => (${postComponent});`,
        (done, err) => null,
      );
      // console.log(
      //   `stories/${snakeCase(testname)}_mutation.stories.tsx`,
      //   `${prettyFormat.format(element.toJSON(), {
      //     plugins: [prettyFormat.plugins.ReactTestComponent],
      //     printFunctionName: false,
      //     highlight: false,
      //   })}`,
      //   (done, err) => null,
      // );
      // TODO: export visual check

      if (writesExpected !== undefined) {
        // Validates the expected results from the writes
        expect(writesExpected).toStrictEqual(writeReceived);
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
        profiles.push({
          name: 'cache-validated',
          time: performance.now(),
          delta: performance.now() - profiles[profiles.length - 1].time,
        });

        // when useEmulator = true, validate documents in firestore
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
        profiles.push({
          name: 'firestore-validated',
          time: performance.now(),
          delta: performance.now() - profiles[profiles.length - 1].time,
        });
      }

      if (returnExpected !== undefined) {
        // Validate the return from the async thunk payload
        expect(returnExpected).toStrictEqual(returnRevived);
      }

      await cleanFirestore(firestore, [
        ...(setup || []),
        ...(Array.isArray(writeReceived) ? writeReceived : [writeReceived]),
      ]);
      profiles.push({
        name: 'firestore-cleaned',
        time: performance.now(),
        delta: performance.now() - profiles[profiles.length - 1].time,
      });

      await firebaseApp.delete();
      for (var i in firestore) {
        firestore[i] = null;
      }

      console.log(
        profiles
          .map(({ name, delta }) => `${name}: ${delta.toFixed(2)}ms `)
          .join('\n'),
      );
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

/****************
 *   setCache
 ****************/

export default function setCache(
  {
    firebaseAuth = {
      isEmpty: true,
      isLoaded: false,
    },
    firebaseProfile = {
      isEmpty: true,
      isLoaded: false,
    },
    ...documents
  },
  middlewares = [],
) {
  // TODO: alias are dynamic coming from the useRead calls

  const keys = Object.keys(aliases);

  //--- can add all the docs but don't know the queries,
  //     need to let store getting intercept the useRead
  //     and return the preprocess results
  //  useRead's `setListeners` can be proxied over to get the query
  documents.map();

  const normalizedDocuments = keys.reduce((obj, key) => {
    const list = aliases[key];
    const { path } = list[0];

    list.forEach((item) => {
      obj[list[0].path] = { [item.id]: item };
    });

    return obj;
  }, {});

  const initialState = {
    firebase: {
      auth: firebaseAuth,
      profile: firebaseProfile,
    },
    firestore: {
      cache: {
        database: normalizedDocuments,
        databaseOverrides: {},
        ...keys.reduce(
          (obj, alias) => ({
            ...obj,
            [alias]: {
              ordered: aliases[alias].map(({ path, id }) => [path, id]),
              path:
                (aliases[alias] &&
                  aliases[alias][0] &&
                  aliases[alias][0].path) ||
                'unset',
              via: 'memory',
            },
          }),
          {},
        ),
      },
    },
  };

  // getQueryName;
  // initialState.firestore.cache;

  const store = configureStore(middlewares);

  return store(initialState);
}

export { shouldPass };
