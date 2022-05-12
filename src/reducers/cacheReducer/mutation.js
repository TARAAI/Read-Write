/* eslint-disable jsdoc/require-param */
import isFunction from 'lodash/isFunction';
import isEmpty from 'lodash/isEmpty';
import {
  getRead,
  isDocRead,
  isProviderRead,
} from '../../firestore/extend/mutate';
import { toJSON } from '../../utils';

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
      ...toJSON(collection ? data : rest, (key) => {
        const database = Object.keys(db).length > 0 ? db : {};
        const location = database[coll] || {};
        return (location[docId] || {})[key];
      }),
    };
  });
}
