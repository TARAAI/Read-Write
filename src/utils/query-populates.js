/* istanbul ignore file: Populates are non-performant. Serializing and chaining promises is a bad access pattern for the front-end.  */
import forEach from 'lodash/forEach';
import get from 'lodash/get';
import has from 'lodash/has';
import isObject from 'lodash/isObject';
import set from 'lodash/set';
import { dataByIdSnapshot, getPopulateChild } from './query';

/**
 * @private
 * @deprecated - populates is non-performant.
 * Populate list of data
 * @param {object} firebase - Internal firebase object
 * @param {object} originalObj - Object to have parameter populated
 * @param {object} p - Object containing populate information
 * @param {object} results - Object containing results of population from other populates
 * @returns {Promise} Resolves with populated list
 */
export function populateList(firebase, originalObj, p, results) {
  // Handle root not being defined
  if (!results[p.root]) {
    set(results, p.root, {});
  }
  return Promise.all(
    map(originalObj, (id, childKey) => {
      // handle list of keys
      const populateKey = id === true || p.populateByKey ? childKey : id;
      return getPopulateChild(firebase, p, populateKey).then((pc) => {
        if (pc) {
          // write child to result object under root name if it is found
          return set(results, `${p.root}.${populateKey}`, pc);
        }
        return results;
      });
    }),
  );
}

/**
 * @private
 * @deprecated - populates is non-performant. It serializes promise chains.
 * Create standardized populate object from strings or objects
 * @param {string|object} str - String or Object to standardize into populate object
 * @returns {object} Populate object
 */
function getPopulateObj(str) {
  if (typeof str === 'string' || str instanceof String) {
    return str;
  }
  const strArray = str.split(':');
  // TODO: Handle childParam
  return { child: strArray[0], root: strArray[1] };
}

/**
 * @private
 * @deprecated - populates is non-performant. It serializes promise chains.
 * Create standardized populate object from strings or objects
 * @param {Array} arr - Array of items to get populate objects for
 * @returns {Array} Array of populate objects
 */
function getPopulateObjs(arr) {
  if (!Array.isArray(arr)) {
    return arr;
  }
  return arr.map((o) => (isObject(o) ? o : getPopulateObj(o)));
}

/**
 * @private
 * @deprecated - populates is non-performant. It serializes promise chains.
 * Create an array of promises for population of an object or list
 * @param {object} firebase - Internal firebase object
 * @param {object} dataKey - Object to have parameter populated
 * @param {object} originalData - String containg population data
 * @param {object|Function} populatesIn - Populates setting
 * @returns {Promise} Resolves with results of population
 */
export function promisesForPopulate(
  firebase,
  dataKey,
  originalData,
  populatesIn,
) {
  const promisesArray = [];
  const results = {};

  // test if data is a single object, try generating populates and looking for the child
  const populatesForData = getPopulateObjs(
    typeof populatesIn === 'function'
      ? populatesIn(dataKey, originalData)
      : populatesIn,
  );

  const dataHasPopulateChilds = populatesForData.some((populate) =>
    has(originalData, populate.child),
  );
  if (dataHasPopulateChilds) {
    // Data is a single object, resolve populates directly
    populatesForData.forEach((p) => {
      const childDataVal = get(originalData, p.child);
      if (typeof childDataVal === 'string' || childDataVal instanceof String) {
        return promisesArray.push(
          getPopulateChild(firebase, p, childDataVal).then((v) => {
            // write child to result object under root name if it is found
            if (v) {
              set(
                results,
                `${p.storeAs ? p.storeAs : p.root}.${childDataVal}`,
                v,
              );
            }
          }),
        );
      }

      // Single Parameter is list
      return promisesArray.push(
        populateList(firebase, childDataVal, p, results),
      );
    });
  } else {
    // Data is a list of objects, each value has parameters to be populated
    // { '1': {someobject}, '2': {someobject} }
    forEach(originalData, (d, key) => {
      // generate populates for this data item if a fn was passed
      const populatesForDataItem = getPopulateObjs(
        typeof populatesIn === 'function' ? populatesIn(key, d) : populatesIn,
      );

      // resolve each populate for this data item
      forEach(populatesForDataItem, (p) => {
        // get value of parameter to be populated (key or list of keys)
        const idOrList = get(d, p.child);

        /* eslint-disable consistent-return */
        // Parameter/child of list item does not exist
        if (!idOrList) {
          return;
        }

        // Parameter of each list item is single ID
        if (typeof idOrList === 'string' || idOrList instanceof String) {
          return promisesArray.push(
            // eslint-disable-line
            getPopulateChild(firebase, p, idOrList).then((v) => {
              // write child to result object under root name if it is found
              if (v) {
                set(
                  results,
                  `${p.storeAs ? p.storeAs : p.root}.${idOrList}`,
                  v,
                );
              }
              return results;
            }),
          );
        }

        // Parameter of each list item is a list of ids
        if (Array.isArray(idOrList) || isObject(idOrList)) {
          // Create single promise that includes a promise for each child
          return promisesArray.push(
            // eslint-disable-line
            populateList(firebase, idOrList, p, results),
          );
        }
      });
    });
  }

  // Return original data after population promises run
  return Promise.all(promisesArray).then(() => results);
}

/**
 * Get list of actions for population queries
 * @private
 * @deprecated
 * @param {object} opts - Options object
 * @param {object} opts.firebase - Firebase instance
 * @param {object} opts.docData - Data object from document
 * @param {object} opts.meta - Meta data
 * @returns {Promise} Resolves with a list of populate actions containing data
 */
export function getPopulateActions({ firebase, docData, meta }) {
  // Run promises for population
  return promisesForPopulate(
    firebase,
    docData.id,
    dataByIdSnapshot(docData),
    meta.populates,
  )
    .then((populateResults) =>
      // Listener results for each child collection
      Object.keys(populateResults).map((resultKey) => ({
        // TODO: Handle population of subcollection queries
        meta: { collection: resultKey },
        payload: {
          data: populateResults[resultKey],
          // TODO: Write ordered here
        },
        requesting: false,
        requested: true,
      })),
    )
    .catch((populateErr) => {
      console.error('Error with populate:', populateErr, meta); // eslint-disable-line no-console
      return Promise.reject(populateErr);
    });
}
