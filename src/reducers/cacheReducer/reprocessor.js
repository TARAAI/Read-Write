/* eslint-disable jsdoc/require-param */
import debug from 'debug';
import set from 'lodash/set';
import filter from 'lodash/filter';
import flow from 'lodash/flow';
import orderBy from 'lodash/orderBy';
import take from 'lodash/take';
import map from 'lodash/map';
import partialRight from 'lodash/partialRight';
import zip from 'lodash/zip';
import takeRight from 'lodash/takeRight';
import isEmpty from 'lodash/isEmpty';
import identity from 'lodash/identity';

import { mark } from '../../utils';

const info = debug('readwrite:cache');
const verbose = debug('readwrite:verbose');

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
 * @typedef {{ id: FirestoreDocumentId, path: FirestorePath } & ?FirestoreDocument} PartialDoc
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

const isTimestamp = (a) => a instanceof Object && a.seconds !== undefined;
const formatTimestamp = ({ seconds } = {}) =>
  seconds &&
  new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(
    new Date(seconds * 1000),
  );

const PROCESSES = {
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '>=': (a, b) => a >= b,
  '>': (a, b) => a > b,
  'array-contains': (a, b) => a.includes(b),
  in: (a, b) => Array.isArray(b) && b.includes(a),
  'array-contains-any': (a, b) => b.some((b1) => a.includes(b1)),
  'not-in': (a, b) => !b.includes(a),
  '*': () => true,
};

const PROCESSES_TIMESTAMP = {
  '<': (a, b) =>
    a.seconds < b.seconds ||
    (a.seconds === b.seconds && a.nanoseconds < b.nanoseconds),
  '<=': (a, b) =>
    a.seconds < b.seconds ||
    (a.seconds === b.seconds && a.nanoseconds <= b.nanoseconds),
  '==': (a, b) => a.seconds === b.seconds && a.nanoseconds === b.nanoseconds,
  '!=': (a, b) => a.seconds !== b.seconds || a.nanoseconds !== b.nanoseconds,
  '>=': (a, b) =>
    a.seconds > b.seconds ||
    (a.seconds === b.seconds && a.nanoseconds >= b.nanoseconds),
  '>': (a, b) =>
    a.seconds > b.seconds ||
    (a.seconds === b.seconds && a.nanoseconds > b.nanoseconds),
  'array-contains': (a, b) => a.includes(b),
  in: (a, b) => Array.isArray(b) && b.includes(a),
  'array-contains-any': (a, b) => b.some((b1) => a.includes(b1)),
  'not-in': (a, b) => !b.includes(a),
  '*': () => true,
};

const xfVerbose = (title) =>
  partialRight(map, (data) => {
    if (verbose.enabled) {
      /* istanbul ignore next */
      verbose(title, JSON.parse(JSON.stringify(data)));
    }
    return data;
  });

/**
 * @name xfAllIds
 * @param {string} path - string of the full firestore path for the collection
 * @typedef xFormCollection - return a single collection from the fragment database
 * @returns {xFormCollection} - transducer
 */
const xfAllIds = ({ collection, path: rawPath }) =>
  function allIdsTransducer(state) {
    const path = rawPath || collection;
    const { database: db = {}, databaseOverrides: dbo = {} } = state;
    const allIds = new Set([
      ...Object.keys(db[path] || {}),
      ...Object.keys(dbo[path] || {}),
    ]);

    return [Array.from(allIds).map((id) => [path, id])];
  };

/**
 * @name xfWhere
 * @param getDoc.where
 * @param getDoc
 * @param {Array.<Array.<string>>} where - Firestore where clauses
 * @property {object.<FirestorePath, object<FirestoreDocumentId, Doc>>}  db
 * @property {object.<FirestorePath, object<FirestoreDocumentId, ParitalDoc>>}  dbo
 * @typedef {Function} xFormFilter - run the same where cause sent to
 * firestore for all the optimitic overrides
 * @returns {xFormFilter} - transducer
 */
const xfWhere = ({ where }, getDoc) => {
  if (!where) return [partialRight(map, identity)];

  const isFlat = typeof where[0] === 'string';
  const clauses = isFlat ? [where] : where;

  return clauses.map(([field, op, val]) => {
    const fnc = isTimestamp(val)
      ? PROCESSES_TIMESTAMP[op]
      : PROCESSES[op] || (() => true);

    return partialRight(map, (tuples) =>
      filter(tuples, ([path, id] = []) => {
        if (!path || !id) return false;
        let value;
        if (field === '__name__') {
          value = id;
        } else if (field.includes('.')) {
          value = field
            .split('.')
            .reduce((obj, subField) => obj && obj[subField], getDoc(path, id));
        } else {
          value = getDoc(path, id)[field];
        }

        if (value === undefined) value = null;

        return fnc(value, val);
      }),
    );
  });
};

/**
 * @name xfOrder
 * @param getDoc.orderBy
 * @param getDoc
 * @param {Array.<string>} order - Firestore order property
 * @property {object.<FirestorePath, object<FirestoreDocumentId, Doc>>}  db
 * @property {object.<FirestorePath, object<FirestoreDocumentId, ParitalDoc>>}  dbo
 * @typedef {Function} xFormOrdering - sort docs bases on criteria from the
 * firestore query
 * @returns {xFormOrdering} - transducer
 */
const xfOrder = ({ orderBy: order }, getDoc) => {
  if (!order) return identity;

  const isFlat = typeof order[0] === 'string';
  const orders = isFlat ? [order] : order;

  const [fields, direction] = zip(
    ...orders.map(([field, dir]) => [
      (data) => {
        if (typeof data[field] === 'string') return data[field].toLowerCase();
        if (isTimestamp(data[field])) return data[field].seconds;
        return data[field];
      },
      dir || 'asc',
    ]),
  );

  return partialRight(map, (tuples) => {
    // TODO: refactor to manually lookup and compare
    const docs = tuples.map(([path, id]) => getDoc(path, id));

    return orderBy(docs, fields, direction).map(
      ({ id, path } = {}) => path && id && [path, id],
    );
  });
};

/**
 * @name xfLimit
 * @param {number} limit - firestore limit number
 * @typedef {Function} xFormLimiter - limit the results to align with
 * limit from the firestore query
 * @returns {xFormLimiter} - transducer
 */
const xfLimit = ({ limit, endAt, endBefore }) => {
  if (!limit) return identity;
  const fromRight = (endAt || endBefore) !== undefined;
  return fromRight
    ? ([arr] = []) => [takeRight(arr, limit)]
    : ([arr] = []) => [take(arr, limit)];
};

/**
 * @name xfPaginate
 * @param {?CacheState.database} db -
 * @param {?CacheState.databaseOverrides} dbo -
 * @param {RRFQuery} query - Firestore query
 * @param getDoc
 * @param {boolean} isOptimisticWrite - includes optimistic data
 * @typedef {Function} xFormFilter - in optimistic reads and overrides
 * the reducer needs to take all documents and make a best effort to
 * filter down the document based on a cursor.
 * @returns {xFormFilter} - transducer
 */
const xfPaginate = (query, getDoc) => {
  const {
    orderBy: order,
    limit,
    startAt,
    startAfter,
    endAt,
    endBefore,
    via,
  } = query;

  const start = startAt || startAfter;
  const end = endAt || endBefore;
  const isAfter = startAfter !== undefined;
  const isBefore = endBefore !== undefined;
  const needsPagination = start || end || false;

  if (!needsPagination || !order) return identity;

  let prop = null;
  if (verbose.enabled) {
    if (startAt) prop = 'startAt';
    else if (startAfter) prop = 'startAfter';
    else if (endAt) prop = 'endAt';
    else if (endBefore) prop = 'endBefore';

    /* istanbul ignore next */
    verbose(
      `paginate ${prop}:${formatTimestamp(needsPagination)} ` +
        `order:[${query && query.orderBy && query.orderBy[0]}, ${
          query && query.orderBy && query.orderBy[1]
        }] ` +
        `via:${via}`,
    );
  }

  const isFlat = typeof order[0] === 'string';
  const orders = isFlat ? [order] : order;
  const isPaginateMatched = (document, at, before = false, after = false) =>
    orders.find(([field, sort = 'asc'], idx) => {
      const value = Array.isArray(at) ? at[idx] : at;
      if (value === undefined) return false;

      // TODO: add support for document refs
      const isTime = isTimestamp(document[field]);
      const proc = isTime ? PROCESSES_TIMESTAMP : PROCESSES;
      let compare = process['=='];
      if (startAt || endAt) compare = proc[sort === 'desc' ? '<=' : '>='];
      if (startAfter || endBefore) compare = proc[sort === 'desc' ? '<' : '>'];

      const isMatched = compare(document[field], value);
      if (isMatched) {
        if (verbose.enabled) {
          /* istanbul ignore next */
          const val = isTime
            ? formatTimestamp(document[field])
            : document[field];
          /* istanbul ignore next */
          verbose(`${prop}: ${document.id}.${field} = ${val}`);
        }
        return true;
      }
    }) !== undefined;

  return partialRight(map, (tuples) => {
    const results = [];
    let started = start === undefined;
    tuples.forEach(([path, id]) => {
      if (limit && results.length >= limit) return;

      if (!started && start) {
        if (isPaginateMatched(getDoc(path, id), start, undefined, isAfter)) {
          started = true;
        }
      }

      if (started && end) {
        if (isPaginateMatched(getDoc(path, id), end, isBefore, undefined)) {
          started = false;
        }
      }

      if (started) {
        results.push([path, id]);
      }
    });
    return results;
  });
};

/**
 * @name processOptimistic
 * Convert the query to a transducer for the query results
 * @param {?CacheState.database} database -
 * @param state
 * @param {?CacheState.databaseOverrides} overrides -
 * @param {RRFQuery} query - query used to get data from firestore
 * @returns {Function} - Transducer will return a modifed array of documents
 */
function processOptimistic(query, state) {
  const { database, databaseOverrides } = state;
  const { via = 'memory', collection } = query;
  const db = (database && database[collection]) || {};
  const dbo = databaseOverrides && databaseOverrides[collection];

  const getDoc = (path, id) => {
    const data = db[id] || {};
    const override = dbo && dbo[id];

    return override ? { ...data, ...override } : data;
  };

  if (verbose.enabled) {
    /* istanbul ignore next */
    verbose(JSON.parse(JSON.stringify(query)));
  }

  const process = flow([
    xfAllIds(query),

    xfVerbose('xfAllIds'),

    ...xfWhere(query, getDoc),

    xfVerbose('xfWhere'),

    xfOrder(query, getDoc),

    xfVerbose('xfOrder'),

    xfPaginate(query, getDoc),

    xfVerbose('xfPaginate'),

    xfLimit(query),

    xfVerbose('xfLimit'),
  ]);

  const ordered = process(state)[0];
  return via === 'memory' && ordered.length === 0 ? undefined : ordered;
}

const skipReprocessing = (query, { databaseOverrides = {} }) => {
  const { collection, via } = query;
  const fromFirestore = ['cache', 'server'].includes(via);
  const hasNoOverrides = isEmpty(databaseOverrides[collection]);

  if (fromFirestore && hasNoOverrides) return true;

  return false;
};

/**
 * @name reprocessQueries
 * Rerun all queries that contain the same collection
 * @param {object} draft - reducer state
 * @param {string} path - path to rerun queries for
 */
function reprocessQueries(draft, path) {
  // if (verbose.enable) {
  verbose(JSON.stringify(draft, null, 2));
  // }
  const done = mark(`reprocess.${path}`);
  const queries = [];

  const paths = Array.isArray(path) ? path : [path];
  const overrides = draft.databaseOverrides && draft.databaseOverrides[path];
  Object.keys(draft).forEach((key) => {
    if (['database', 'databaseOverrides'].includes(key)) return;
    if (!paths.includes(draft[key].collection)) return;
    if (skipReprocessing(draft[key], draft)) return;

    queries.push(key);

    // either was processed via reducer or had optimistic data
    const ordered = processOptimistic(draft[key], draft);

    if (
      !draft[key].ordered ||
      (ordered || []).toString() !== (draft[key].ordered || []).toString()
    ) {
      set(draft, [key, 'ordered'], ordered);
      set(draft, [key, 'via'], !isEmpty(overrides) ? 'optimistic' : 'memory');
    }
  });

  if (info.enabled) {
    /* istanbul ignore next */
    const override = JSON.parse(JSON.stringify(draft.databaseOverrides || {}));
    /* istanbul ignore next */
    info(
      `reprocess ${path} (${queries.length} queries) with overrides`,
      override,
    );
  }

  done();
}

export default { processOptimistic, reprocessQueries };
export { processOptimistic, reprocessQueries };
