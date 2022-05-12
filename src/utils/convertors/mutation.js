/* eslint-disable jsdoc/require-param */
import isPlainObject from 'lodash/isPlainObject';
import {
  increment as incrementFS,
  arrayUnion as arrayUnionFS,
  arrayRemove as arrayRemoveFS,
  serverTimestamp as serverTimestampFS,
  deleteField as deleteFieldFS,
  Timestamp as TimestampFS,
} from 'firebase/firestore';

// value is a JS primitive
const primitiveValue = (arr) =>
  Array.isArray(arr) && typeof arr[0] === 'string' && arr[0].indexOf('::') === 0
    ? null
    : arr;

// array union
const arrayUnionRef = (key, ...val) =>
  key !== '::arrayUnion' ? null : arrayUnionFS(...val);

const arrayUnionJSON = (key, val, cached) =>
  key !== '::arrayUnion' ? null : (cached() || []).concat([val]);

// array remove
const arrayRemoveRef = (key, ...val) =>
  key !== '::arrayRemove' ? null : arrayRemoveFS(...val);

const arrayRemoveJSON = (key, val, cached) =>
  key === '::arrayRemove' && (cached() || []).filter((item) => item !== val);

// increment
const incrementRef = (key, val) =>
  key === '::increment' && typeof val === 'number' && incrementFS(val);

const incrementJSON = (key, val, cached) =>
  key === '::increment' && typeof val === 'number' && (cached() || 0) + val;

// server timestamp
const serverTimestampRef = (key) =>
  key === '::serverTimestamp' && serverTimestampFS();

const serverTimestampJSON = (key) =>
  key === '::serverTimestamp' && TimestampFS.now();

// delete field
const deleteFieldRef = (key) => key === '::delete' && deleteFieldFS();

const deleteFieldJSON = (key, cached) => {
  if (key === '::delete') {
    // eslint-disable-next-line no-param-reassign
    delete cached()[key];
  }
};

// nested update to json
const nestedMapJSON = (obj, key, val) => {
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

/**
 * Transform a Mutation to a Firestore Reference update
 * @param {object} firebase - firebase
 * @param {*} mutation - payload mutation
 * @returns Array<object, boolean> Firestore request & if firestore.update is required
 */
export function toFieldValues(mutation) {
  let requiresUpdate = false;
  return [
    Object.keys(mutation).reduce((data, key) => {
      const clone = { ...data };
      const val = clone[key];
      if (key.includes('.')) {
        requiresUpdate = true;
      }
      if (!val) return clone;

      const value =
        primitiveValue(val) ||
        serverTimestampRef(val[0]) ||
        arrayUnionRef(val[0], val[1]) ||
        arrayRemoveRef(val[0], val[1]) ||
        incrementRef(val[0], val[1]) ||
        deleteFieldRef(val[0], val[1]);

      if (Array.isArray(val) && val.length > 0 && isPlainObject(val[0])) {
        clone[key] = val.map((obj) => {
          const [object, update] = toFieldValues(obj);
          if (update) requiresUpdate = true;
          return object;
        });
      } else if (Array.isArray(val) && val.length > 0) {
        // eslint-disable-next-line no-param-reassign
        clone[key] = value;
      } else if (isPlainObject(val)) {
        const [object, update] = toFieldValues(val);
        clone[key] = object;
        if (update) requiresUpdate = true;
      }
      return clone;
    }, JSON.parse(JSON.stringify(mutation))),
    requiresUpdate,
  ];
}

/**
 * Transform a Mutation to vanilla JSON
 * @param {*} mutation - payload mutation
 * @param {Function} cached - function that returns in-memory cached instance
 * @returns object - JSON of document post-mutation
 */
export function toJSON(mutation, cached) {
  return Object.keys(mutation).reduce((data, key) => {
    const val = data[key];
    if (key.includes('.')) {
      nestedMapJSON(data, key, val);
    } else if (Array.isArray(val) && val.length > 0) {
      // eslint-disable-next-line no-param-reassign
      data[key] =
        primitiveValue(val) ||
        serverTimestampJSON(val[0]) ||
        arrayUnionJSON(val[0], val[1], () => cached(key)) ||
        arrayRemoveJSON(val[0], val[1], () => cached(key)) ||
        incrementJSON(val[0], val[1], () => cached(key)) ||
        deleteFieldJSON(val[0], val[1], () => cached(key));
    }

    return data;
  }, JSON.parse(JSON.stringify(mutation)));
}
