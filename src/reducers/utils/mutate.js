import isFunction from 'lodash/isFunction';
import isEmpty from 'lodash/isEmpty';
import { getFirestore } from '../../createFirestoreInstance';
import { getRead, isDocRead, isProviderRead } from '../../utils/mutate';

/**
 * Not a Mutate, just an array
 * @param {Array} arr
 * @returns Null | Array
 */
const primaryValue = (arr) =>
  typeof arr[0] === 'string' && arr[0].indexOf('::') === 0 ? null : arr;

/**
 * Mutate Nested Object
 * @param {*} obj - data
 * @param {*} key - nested key path
 * @param {*} val - value to be set
 * @returns Null | object
 */
const nestedMap = (obj, key, val) => {
  // eslint-disable-next-line no-param-reassign
  delete obj[key];
  const fields = key.split('.');
  fields.reduce((deep, field, idx) => {
    // eslint-disable-next-line no-param-reassign
    if (deep[field] === undefined) deep[field] = {};
    // eslint-disable-next-line no-param-reassign
    if (idx === fields.length - 1) deep[field] = val;
    return deep[field];
  }, obj);
  return obj;
};

const arrayUnion = (key, val, cached) =>
  key !== '::arrayUnion' ? null : (cached() || []).concat([val]);

const arrayRemove = (key, val, cached) =>
  key === '::arrayRemove' && (cached() || []).filter((item) => item !== val);

const increment = (key, val, cached) =>
  key === '::increment' && typeof val === 'number' && (cached() || 0) + val;

const serverTimestamp = (key) =>
  key === '::serverTimestamp' && getFirestore().FieldValue.serverTimestamp();

/**
 * Process Mutation to a vanilla JSON
 * @param {*} mutation - payload mutation
 * @param {Function} cached - function that returns in-memory cached instance
 * @returns
 */
function atomize(mutation, cached) {
  return Object.keys(mutation).reduce((data, key) => {
    const val = data[key];
    if (key.includes('.')) {
      nestedMap(data, key, val);
    } else if (Array.isArray(val) && val.length > 0) {
      // eslint-disable-next-line no-param-reassign
      data[key] =
        primaryValue(val) ||
        serverTimestamp(val[0]) ||
        arrayUnion(val[0], val[1], () => cached(key)) ||
        arrayRemove(val[0], val[1], () => cached(key)) ||
        increment(val[0], val[1], () => cached(key));
    }

    return data;
  }, JSON.parse(JSON.stringify(mutation)));
}

/**
 * Translates mutation reads request into read results
 * @param {MutateAction.reads} reads
 * @returns
 */
export function mutationReadFromCache(reads, { db, dbo }) {
  if (isEmpty(reads)) return {};

  return Object.keys(reads).reduce((result, key) => {
    if (isProviderRead(reads[key])) {
      return { ...result, [key]: getRead(reads[key]) };
    }

    const path = (reads[key] && reads[key].path) || reads[key].collection;
    const id = (reads[key] && reads[key].id) || reads[key].doc;

    const collection = db[path] || {};
    const overrides = dbo[path] || {};

    // BROKE: TODO: need to support sync queries for reads
    const isQueryRead = !isDocRead(reads[key]);
    if (isQueryRead) {
      const pathIds = processOptimistic(reads[key], {
        database: db,
        databaseOverrides: dbo,
      });

      return {
        ...result,
        [key]: pathIds.reduce((docs, [path, id]) => {
          const document = { ...collection[id], ...(overrides[id] || {}) };
          if (isEmpty(document)) return docs;

          return [...docs, { id, path, ...document }];
        }, []),
      };
    }

    const document = { ...collection[id], ...(overrides[id] || {}) };
    if (isEmpty(document)) return result;

    return {
      ...result,
      [key]: { id, path, ...document },
    };
  }, {});
}

/**
 * Inject cache read data to generate write instructions
 * @param {MutateAction.reads} reads
 * @returns WriteInstructions
 */
export function mutationProduceWrites(readResults, writes) {
  return writes
    .map((writer) => (isFunction(writer) ? writer(readResults) : writer))
    .filter((data) => !data || !isEmpty(data))
    .reduce(
      (flat, result) => [
        ...flat,
        ...(Array.isArray(result) ? result : [result]),
      ],
      [],
    );
}

/**
 * Convert instructions into end results
 * @param {*} writeInstructions
 * @returns
 */
export function mutationWriteOutput(writeInstructions, { db }) {
  return writeInstructions.map((write) => {
    const { collection, path, doc, id, data, ...rest } = write;

    const coll = path || collection;
    const docId = id || doc;

    return {
      path: coll,
      id: docId,
      ...atomize(collection ? data : rest, (key) => {
        const database = Object.keys(db).length > 0 ? db : {};
        const location = database[coll] || {};
        return (location[docId] || {})[key];
      }),
    };
  });
}
