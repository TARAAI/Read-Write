/* eslint-disable no-console */
import reducer from '..';
import { actionTypes } from '../../constants';
import { benchmark } from 'kelonio';
import { debug } from 'debug';
import largeAction from '../__stubs__/one_mb_action.json';
import appState from '../__stubs__/app_state.json';

const firestoreModule = require('../../firestore/extend/createFirestoreInstance');

jest.mock('../../firestore/extend/createFirestoreInstance');

firestoreModule.getFirestore.mockReturnValue({
  FieldValue: { serverTimestamp: () => 'serverTimestamp' },
});

const collection = 'testCollection';
const path = `${collection}`;

// --- data

const testDocId0 = {
  dateKey: { seconds: 0, nanoseconds: 0 },
  id: 'testDocId0',
  other: 'first',
  path,
};
const testDocId1 = {
  ...testDocId0,
  dateKey: { seconds: 1, nanoseconds: 1 },
  other: 'second',
  id: 'testDocId1',
};
const testDocId3 = {
  ...testDocId0,
  dateKey: { seconds: 3, nanoseconds: 3 },
  other: 'third',
  id: 'testDocId3',
};
const testDocId4 = {
  ...testDocId0,
  dateKey: { seconds: 4, nanoseconds: 4 },
  other: 'fourth',
  id: 'testDocId4',
};

// -- states

const primedState = {
  cache: {
    database: {
      [path]: { testDocId0, testDocId1, testDocId3, testDocId4 },
    },
  },
};

// -- queries

const whereKey1IsValue1 = {
  collection,
  storeAs: 'testStoreAs',
  where: [['key1', '==', 'value1']],
  orderBy: ['key1'],
};

// --- payload

const setPayload = (docs, fromCache = true) => ({
  data: docs.reduce((data, doc) => ({ ...data, [doc.id]: doc }), {}),
  ordered: docs,
  fromCache,
});

describe('cacheReducer', () => {
  describe('Speed test (on 2015 Dual-core 1.5Ghz i5 w/ 8GB 1600 DDR3)', () => {
    let namespaces;
    beforeEach(() => {
      namespaces = debug.disable();
    });
    afterEach(() => {
      if (namespaces) debug.enable(namespaces);
    });

    it('<42ms processing large action and large state', async () => {
      const manyActions = new Array(1).fill(null).map(() => largeAction);

      await benchmark.record(
        () => manyActions.forEach((action) => reducer(appState, action)),
        {
          iterations: 90,
          meanUnder: 42,
          standardDeviationUnder: 12,
        },
      );
    }, 5_000);

    it('<38ms to process stores 2,000 docs', async () => {
      const generate = (limit) =>
        new Array(limit).fill(null).map(() => ({
          path,
          id: `testDocId${Math.random()}`,
          key1: 'value1',
          number: 11,
          multipled: 3,
          dateKey: { seconds: 1, nanoseconds: 1 },
          array: [1, 2, 3, 4],
          obj: { a: 1, b: { x: 0 }, c: { z: 9 } },
        }));

      const action = {
        meta: whereKey1IsValue1,
        payload: setPayload(generate(2_000)),
        type: actionTypes.LISTENER_RESPONSE,
      };

      await benchmark.record(() => reducer(appState, action), {
        iterations: 50,
        meanUnder: 38,
      });
    }, 5_000);

    it('<24ms to process 100 mutates', async () => {
      const actions = {
        type: actionTypes.MUTATE_START,
        payload: {
          meta: { collection: testDocId0.path, doc: testDocId0.id },
          data: [
            {
              path: testDocId0.path,
              id: testDocId0.id,
              dateKey: { seconds: 99, nanoseconds: 99 },
            },
          ],
        },
      };

      const manyActions = new Array(100).fill(null).map(() => actions);

      await benchmark.record(
        () => manyActions.forEach((action) => reducer(appState, action)),
        {
          iterations: 125,
          meanUnder: 24,
        },
      );
    }, 5_000);

    it('<4ms to process 1MB action', async () => {
      await benchmark.record(() => reducer(primedState, largeAction), {
        iterations: 1_000,
        meanUnder: 4,
      });
    }, 5_000);
  });
});
