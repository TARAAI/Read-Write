/* eslint-disable jsdoc/require-param */
import produce from 'immer';
import debug from 'debug';
import set from 'lodash/set';
import unset from 'lodash/unset';
import setWith from 'lodash/setWith';
import findIndex from 'lodash/findIndex';
import isMatch from 'lodash/isMatch';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';

import { actionTypes } from '../../constants';
import { getQueryName } from '../../utils';
import { getRead } from '../../firestore/extend/mutate';
import {
  mutationWriteOutput,
  mutationProduceWrites,
  mutationReadFromCache,
} from './mutation';
import { mark } from '../../utils';
import { processOptimistic, reprocessQueries } from './reprocessor';

const info = debug('readwrite:cache');

/**
 * @typedef {object & Object.<string, RRFQuery>} CacheState
 * Cache state is a synchronous, in-memory fragment of Firestore. The primary
 * goal is to provide instant, synchronous data mutations. The key use case to consider
 * is when React has a drag and drop interface but the data change requires a
 * transaction which must round-trip to the server before it's reflected in Redux.
 * @property {object.<FirestorePath, object<FirestoreDocumentId, Doc>>}  database
 * Store in-memory documents returned from firestore, with no modifications.
 * @property {object.<FirestorePath, object<FirestoreDocumentId, PartialDoc>>}  databaseOverrides
 * Store document fragments that are in-flight to be persisted to firestore.
 */

/**
 * @typedef {string} FirestorePath
 * @typedef {string} FirestoreDocumentId
 * @typedef {object} FirestoreDocument
 * @typedef {{ id: FirestoreDocumentId, path: FirestorePath } & FirestoreDocument} Doc
 * @typedef {{ id: FirestoreDocumentId, path: FirestorePath } & ?FirestoreDocument} ParitalDoc
 * @typedef {Array.<string>} Populates - [field_name, firestore_path_to_collection, new_field_name]
 * @typedef {Array.<string>} Fields - document fields to include for the result
 * @typedef {Array<*> & { 0: FirestorePath, 1: FirestoreDocumentId, length: 2 }} OrderedTuple
 * @property
 */

/**
 * @typedef {object & {fields: Fields, populates: Populates, docs: Doc[], ordered: OrderedTuple}} RRFQuery
 * @property {string|object} collection - React Redux Firestore collection path
 * @property {?string} storeAs - alias to store the query results
 * @property {?Array.<string>} where - Firestore Query tuple
 * @property {?Array.<string>} orderBy - Firestore Query orderBy
 * @property {?Fields} fields - Optional fields to pick for each document
 * @property {?Populates} populates - Optional related docs to include
 * @property {Doc[]} docs - Array of documents that includes the overrides,
 * field picks and populate merges
 * @property {OrderedTuple} ordered - Tuple of [path, doc_id] results returned
 * from firestore. Overrides do NOT mutate this field. All reordering
 * comes from running the filter & orderBy xForms.
 */

/**
 * @typedef {object} Mutation_v1
 * @property {string} collection - firestore path into the parent collection
 * @property {string} doc - firestore document id
 * @property {object} data - document to be saved
 */

/**
 * @typedef {object} Mutation_v2
 * The full document to be saved in firestore with 2 additional properties
 * @property {string} path - firestore path into the parent collection
 * @property {string} id - firestore document id
 * ...rest - the rest of the data will be saved to as the firestore doc
 */

/**
 * @typedef {Mutation_v1 | Mutation_v2} Write
 * @typedef {Array<Mutation_v1 | Mutation_v2>} Batch
 */

/**
 * @typedef {object} Transaction
 * @property {object.<ReadKey, RRFQuery>} reads - Object of read keys and queries
 * @property {Function[]} writes - Array of function that take rekyKey results and return writes
 */

/**
 * @typedef MutateAction_v1
 * @property {Write | Batch | Transaction} payload - mutation payload
 * @property {object} meta
 */

/**
 * Translate mutation to a set of database overrides
 * @param {MutateAction} action - Standard Redux action
 * @param {object.<FirestorePath, object<FirestoreDocumentId, Doc>>} db - in-memory database
 * @param {object.<FirestorePath, object<FirestoreDocumentId, Doc>>} dbo - in-memory database overrides
 * @returns Array<object<FirestoreDocumentId, Doc>>
 */
function translateMutationToOverrides({ payload }, db = {}, dbo = {}) {
  // turn everything to a write
  let { reads, writes } = payload.data || {};
  if (!writes) {
    writes = Array.isArray(payload.data) ? payload.data : [payload.data];
  } else if (!Array.isArray(writes)) {
    writes = [writes];
  }

  const optimisticRead = mutationReadFromCache(reads, { db, dbo });

  const instructions = mutationProduceWrites(optimisticRead, writes);

  const overrides = mutationWriteOutput(instructions, { db, dbo });

  if (debug.enabled('readwrite:mutate')) {
    /* istanbul ignore next */
    debug('readwrite:mutate')(
      'Optimistic Cache',
      JSON.stringify(
        {
          'input-read':
            reads &&
            Object.keys(reads).reduce(
              (clone, key) => (
                {
                  ...clone,
                  [key]: getRead(reads[key]),
                },
                JSON.parse(JSON.stringify(reads))
              ),
            ),
          'input-write-args': optimistic,
          'output-writes': overrides,
        },
        null,
        2,
      ),
    );
  }

  return overrides;
}

/**
 * @param {object} draft - reduce state
 * @param {string} action.path - path of the parent collection
 * @param {string} action.id - document id
 * @param {object} action.data - data in the payload
 */
function cleanOverride(draft, { path, id, data }) {
  if (!path || !id) return;

  const override = get(draft, ['databaseOverrides', path, id], false);

  if (!override || (data && !isMatch(data, override))) return;

  const keys = Object.keys(override);
  const props = !data
    ? keys
    : keys.filter((key) => {
        // manually check draft proxy values
        const current = get(data, key);
        const optimistic = override[key];

        if (current === null || current === undefined) {
          return current === optimistic;
        }
        if (Array.isArray(current)) {
          return current.every((val, idx) => val === optimistic[idx]);
        }
        if (typeof current === 'object') {
          return Object.keys(current).every(
            (key) => current[key] === optimistic[key],
          );
        }
        return isEqual(data[key], override[key]);
      });

  const isDone = props.length === Object.keys(override).length;
  const isEmpty =
    isDone && Object.keys(draft.databaseOverrides[path] || {}).length === 1;

  if (isEmpty) {
    unset(draft, ['databaseOverrides', path]);
  } else if (isDone) {
    unset(draft, ['databaseOverrides', path, id]);
  } else {
    props.forEach((prop) => {
      unset(draft, ['databaseOverrides', path, id, prop]);
    });
  }
}

// --- action type handlers ---

const initialize = (state, { action, key, path }) =>
  produce(state, (draft) => {
    const done = mark(`cache.${action.type.replace(/(@@.+\/)/, '')}`, key);
    if (!draft.database) {
      set(draft, ['database'], {});
      set(draft, ['databaseOverrides'], {});
    }
    const hasOptimistic = !isEmpty(
      draft.databaseOverrides && draft.databaseOverrides[path],
    );

    const via = {
      undefined: hasOptimistic ? 'optimistic' : 'memory',
      true: 'cache',
      false: 'server',
    }[action.payload.fromCache];

    // 35% of the CPU time
    if (action.payload.data) {
      Object.keys(action.payload.data).forEach((id) => {
        setWith(draft, ['database', path, id], action.payload.data[id], Object);

        cleanOverride(draft, { path, id, data: action.payload.data[id] });
      });
    }

    // set the query
    const ordered = action.payload.ordered
      ? action.payload.ordered.map(({ path: _path, id }) => [_path, id])
      : processOptimistic(action.meta, draft);

    // 20% of the CPU time
    set(draft, [action.meta.storeAs || getQueryName(action.meta)], {
      ordered,
      ...action.meta,
      via,
    });

    // 15% of the CPU time
    reprocessQueries(draft, path);

    done();
    return draft;
  });

const conclude = (state, { action, key, path }) =>
  produce(state, (draft) => {
    const done = mark(`cache.UNSET_LISTENER`, key);
    if (draft[key]) {
      if (!action.payload.preserveCache) {
        // remove query
        unset(draft, [key]);
      }

      reprocessQueries(draft, path);
    }

    done();
    return draft;
  });

const modify = (state, { action, key, path }) =>
  produce(state, (draft) => {
    const done = mark(`cache.DOCUMENT_MODIFIED`, key);
    setWith(
      draft,
      ['database', path, action.meta.doc],
      action.payload.data,
      Object,
    );

    cleanOverride(draft, {
      path,
      id: action.meta.doc,
      data: action.payload.data,
    });

    const { payload } = action;
    const { oldIndex = 0, newIndex = 0 } = payload.ordered || {};

    if (newIndex !== oldIndex) {
      const tuple =
        (payload.data && [payload.data.path, payload.data.id]) ||
        draft[key].ordered[oldIndex];

      const { ordered } = draft[key] || { ordered: [] };
      const idx = findIndex(ordered, [1, action.meta.doc]);

      const isIndexChange = idx !== -1;
      const isAddition = oldIndex === -1 || isIndexChange;
      const isRemoval = newIndex === -1 || isIndexChange;

      if (isRemoval && idx > -1) {
        ordered.splice(idx, 0);
      } else if (isAddition) {
        ordered.splice(newIndex, 0, tuple);
      }

      set(draft, [key, 'ordered'], ordered);
    }

    // reprocessing unifies any order changes from firestore
    if (action.meta.reprocess !== false) {
      reprocessQueries(draft, path);
    }

    done();
    return draft;
  });

const failure = (state, { action, key, path }) =>
  produce(state, (draft) => {
    const done = mark(`cache.MUTATE_FAILURE`, key);
    // All failures remove overrides
    if (action.payload.data || action.payload.args) {
      const write = action.payload.data
        ? [{ writes: [action.payload.data] }]
        : action.payload.args;
      const allPaths = write.reduce(
        (results, { writes }) => [
          ...results,
          ...writes.map(({ collection, path: _path, doc, id }) => {
            info('remove override', `${collection}/${doc}`);

            // don't send data to ensure document override is deleted
            cleanOverride(draft, { path: _path || collection, id: id || doc });

            return path || collection;
          }),
        ],
        [],
      );

      const uniquePaths = Array.from(new Set(allPaths));
      if (uniquePaths.length > 0) {
        reprocessQueries(draft, uniquePaths);
      }
    }

    done();
    return draft;
  });

const deletion = (state, { action, key, path }) =>
  produce(state, (draft) => {
    const done = mark(`cache.DELETE_SUCCESS`, key);
    if (draft.database && draft.database[path]) {
      unset(draft, ['database', path, action.meta.doc]);
    }

    cleanOverride(draft, { path, id: action.meta.doc });

    // remove document id from ordered index
    if (draft[key] && draft[key].ordered) {
      const idx = findIndex(draft[key].ordered, [1, action.meta.doc]);
      draft[key].ordered.splice(idx, 1);
    }

    // reprocess
    reprocessQueries(draft, path);

    done();
    return draft;
  });

const remove = (state, { action, key, path }) =>
  produce(state, (draft) => {
    const done = mark(`cache.DOCUMENT_REMOVED`, key);
    cleanOverride(draft, {
      path,
      id: action.meta.doc,
      data: action.payload.data,
    });

    // remove document id from ordered index
    if (draft[key] && draft[key].ordered) {
      const idx = findIndex(draft[key].ordered, [1, action.meta.doc]);
      const wasNotAlreadyRemoved = idx !== -1;
      if (wasNotAlreadyRemoved) {
        draft[key].ordered.splice(idx, 1);
      }
    }

    // reprocess
    reprocessQueries(draft, path);

    done();
    return draft;
  });

const optimistic = (state, { action, key, path }) =>
  produce(state, (draft) => {
    setWith(
      draft,
      ['databaseOverrides', path, action.meta.doc],
      action.payload.data,
      Object,
    );

    reprocessQueries(draft, path);
    return draft;
  });

const reset = (state, { action, key, path }) =>
  produce(state, (draft) => {
    cleanOverride(draft, { path, id: action.meta.doc });

    reprocessQueries(draft, path);
    return draft;
  });

const mutation = (state, { action, key, path }) => {
  const { _promise } = action;
  try {
    const result = produce(state, (draft) => {
      const done = mark(`cache.MUTATE_START`, key);
      const {
        meta: { timestamp },
      } = action;
      if (action.payload && action.payload.data) {
        const optimisticUpdates =
          translateMutationToOverrides(action, draft.database) || [];

        optimisticUpdates.forEach((data) => {
          info('overriding', `${data.path}/${data.id}`, data);
          setWith(
            draft,
            ['databaseOverrides', data.path, data.id],
            data,
            Object,
          );
        });

        const updatePaths = [
          ...new Set(optimisticUpdates.map(({ path: _path }) => _path)),
        ];

        updatePaths.forEach((_path) => {
          reprocessQueries(draft, _path);
        });
      }

      done();
      if (_promise && _promise.resolve) {
        _promise.resolve();
      }

      return draft;
    });

    return result;
  } catch (error) {
    if (_promise && _promise.reject) {
      _promise.reject(error);
    }
    return state;
  }
};

const HANDLERS = {
  [actionTypes.SET_LISTENER]: initialize,
  [actionTypes.LISTENER_RESPONSE]: initialize,
  [actionTypes.GET_SUCCESS]: initialize,
  [actionTypes.UNSET_LISTENER]: conclude,
  [actionTypes.DOCUMENT_ADDED]: modify,
  [actionTypes.DOCUMENT_MODIFIED]: modify,
  [actionTypes.DELETE_SUCCESS]: deletion,
  [actionTypes.DOCUMENT_REMOVED]: remove,
  [actionTypes.OPTIMISTIC_ADDED]: optimistic,
  [actionTypes.OPTIMISTIC_MODIFIED]: optimistic,
  [actionTypes.OPTIMISTIC_REMOVED]: reset,
  [actionTypes.MUTATE_FAILURE]: failure,
  [actionTypes.DELETE_FAILURE]: failure,
  [actionTypes.UPDATE_FAILURE]: failure,
  [actionTypes.SET_FAILURE]: failure,
  [actionTypes.ADD_FAILURE]: failure,
  [actionTypes.MUTATE_START]: mutation,
};

export default HANDLERS;
