/* eslint-disable jsdoc/require-param */
import isObject from 'lodash/isObject';
import isNumber from 'lodash/isNumber';
import isEmpty from 'lodash/isEmpty';
import trim from 'lodash/trim';
import has from 'lodash/has';

const arrayify = (arr) => [].concat(arr);

/**
 * Add where clause to Cloud Firestore Reference handling invalid formats
 * and multiple where statements (array of arrays)
 * @param {firebase.firestore.Reference} ref - Reference which to add where to
 * @param {Array} where - Where statement to attach to reference
 * @returns {firebase.firestore.Reference} Reference with where statement attached
 */
function addWhereToRef(ref, where) {
  if (!Array.isArray(where)) {
    throw new Error('where parameter must be an array.');
  }

  if (Array.isArray(where[0])) {
    return where.reduce((acc, whereArgs) => addWhereToRef(acc, whereArgs), ref);
  }

  return ref.where(...where);
}

/**
 * Add attribute to Cloud Firestore Reference handling invalid formats
 * and multiple orderBy statements (array of arrays). Used for orderBy and where
 * @param {firebase.firestore.Reference} ref - Reference which to add where to
 * @param {Array} orderBy - Statement to attach to reference
 * @returns {firebase.firestore.Reference} Reference with where statement attached
 */
function addOrderByToRef(ref, orderBy) {
  if (
    !Array.isArray(orderBy) &&
    !(typeof orderBy === 'string' || orderBy instanceof String)
  ) {
    throw new Error('orderBy parameter must be an array or string.');
  }
  if (typeof orderBy === 'string' || orderBy instanceof String) {
    return ref.orderBy(orderBy);
  }
  if (typeof orderBy[0] === 'string' || orderBy[0] instanceof String) {
    return ref.orderBy(...orderBy);
  }
  return orderBy.reduce(
    (acc, orderByArgs) => addOrderByToRef(acc, orderByArgs),
    ref,
  );
}

/**
 * Call methods on ref object for provided subcollection list (from queryConfig
 * object)
 * @param {firebase.firestore.CollectionReference} ref - reference on which
 * to call methods to apply queryConfig
 * @param {Array} subcollectionList - List of subcollection settings from
 * queryConfig object
 * @returns {firebase.firestore.Query} Query object referencing path within
 * firestore
 */
function handleSubcollections(ref, subcollectionList) {
  if (Array.isArray(subcollectionList)) {
    subcollectionList.forEach((subcollection) => {
      /* eslint-disable no-param-reassign */
      if (subcollection.collection) {
        if (typeof ref.collection !== 'function') {
          throw new Error(
            `Collection can only be run on a document. Check that query config for subcollection: "${subcollection.collection}" contains a doc parameter.`,
          );
        }
        ref = ref.collection(subcollection.collection);
      }
      if (subcollection.id) ref = ref.doc(subcollection.id);
      if (subcollection.doc) ref = ref.doc(subcollection.doc);
      if (subcollection.where) ref = addWhereToRef(ref, subcollection.where);
      if (subcollection.orderBy) {
        ref = addOrderByToRef(ref, subcollection.orderBy);
      }
      if (subcollection.limit) ref = ref.limit(subcollection.limit);
      if (subcollection.startAt) {
        ref = ref.startAt(...arrayify(subcollection.startAt));
      }
      if (subcollection.startAfter) {
        ref = ref.startAfter(...arrayify(subcollection.startAfter));
      }
      if (subcollection.endAt) {
        ref = ref.endAt(...arrayify(subcollection.endAt));
      }
      if (subcollection.endBefore) {
        ref = ref.endBefore(...arrayify(subcollection.endBefore));
      }
      ref = handleSubcollections(ref, subcollection.subcollections);
      /* eslint-enable */
    });
  }
  return ref;
}

/**
 * Create a Cloud Firestore reference for a collection or document
 * @param {object} firebase - Internal firebase object
 * @param {object} meta - Metadata
 * @param {string} meta.path - Collection name
 * @param {string} meta.collectionGroup - Collection Group name
 * @param {string} meta.id - Document name
 * @param {Array} meta.where - List of argument arrays
 * @returns {firebase.firestore.Reference} Resolves with results of add call
 */
export function firestoreRef(firebase, meta) {
  if (!firebase.firestore) {
    /* istanbul ignore next */
    throw new Error('Firestore must be required and initialized.');
  }
  const {
    path,
    collection,
    collectionGroup,
    id,
    doc,
    subcollections,
    where,
    orderBy,
    limit,
    startAt,
    startAfter,
    endAt,
    endBefore,
  } = meta;
  let ref = firebase.firestore();
  // TODO: Compare other ways of building ref
  const isInvalidGroup = collectionGroup ? path || collection : false;
  const isInvalidQuery = !(doc || id) ? !path && !collection : false;

  if (isInvalidGroup) {
    throw new Error(
      `Reference cannot contain both Path and CollectionGroup.` +
        ` (received: ${JSON.stringify(meta)})`,
    );
  }

  if (!collectionGroup && isInvalidQuery) {
    throw new Error(
      `Query References must include a 'path' property.` +
        ` (received: ${JSON.stringify(meta)})`,
    );
  }

  const { globalDataConvertor } =
    (firebase && firebase._ && firebase._.config) || {};
  if (path || collection) ref = ref.collection(path || collection);
  if (collectionGroup) ref = ref.collectionGroup(collectionGroup);
  if (id || doc) ref = ref.doc(id || doc);

  ref = handleSubcollections(ref, subcollections);
  if (where) ref = addWhereToRef(ref, where);
  if (orderBy) ref = addOrderByToRef(ref, orderBy);
  if (limit) ref = ref.limit(limit);
  if (startAt) ref = ref.startAt(...arrayify(startAt));
  if (startAfter) ref = ref.startAfter(...arrayify(startAfter));
  if (endAt) ref = ref.endAt(...arrayify(endAt));
  if (endBefore) ref = ref.endBefore(...arrayify(endBefore));
  if (globalDataConvertor) ref = ref.withConverter(globalDataConvertor);

  return ref;
}

/**
 * Convert where parameter into a string notation for use in query name
 * @param {string} key - Key to use
 * @param {Array} value - Where config array
 * @returns {string} String representing where settings for use in query name
 */
function arrayToStr(key, value) {
  if (value instanceof Date || has(value, '_seconds')) {
    return `${key}=${new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
    }).format(has(value, '_seconds') ? new Date(value * 1000) : value)}`;
  }
  if (typeof value === 'string' || value instanceof String || isNumber(value)) {
    return `${key}=${value}`;
  }
  if (typeof value[0] === 'string' || value[0] instanceof String) {
    return `${key}=${value.join(':')}`;
  }
  if (value && !Array.isArray(value) && typeof value.toString === 'function') {
    return `${key}=${value.toString()}`;
  }

  return value.map((val) => arrayToStr(key, val));
}

/**
 * Pick query params from object
 * @param {object} obj - Object from which to pick query params
 * @returns {object} Object of query params by name
 */
function pickQueryParams(obj) {
  return [
    'where',
    'orderBy',
    'limit',
    'startAfter',
    'startAt',
    'endAt',
    'endBefore',
  ].reduce((acc, key) => (obj[key] ? { ...acc, [key]: obj[key] } : acc), {});
}

/**
 * Join/serialize query params
 * @param {object} queryParams - Query settings
 * @returns {string} Serialized string
 */
function serialize(queryParams) {
  return Object.keys(queryParams)
    .filter((key) => queryParams[key] !== undefined)
    .map((key) => arrayToStr(key, queryParams[key]))
    .join('&');
}

/**
 * Create query name based on query settings for use as object keys (used
 * in listener management and reducers).
 * @param {object} meta - Metadata object containing query settings
 * @param {string} meta.collection - Collection name of query
 * @param {string} meta.collectionGroup - Collection Group name of query
 * @param {string} meta.doc - Document id of query
 * @param {string} meta.storeAs - User-defined Redux store name of query
 * @param {Array} meta.subcollections - Subcollections of query
 * @returns {string} String representing query settings
 */
export function getQueryName(meta) {
  if (typeof meta === 'string' || meta instanceof String) {
    return meta;
  }
  const {
    path,
    collection,
    collectionGroup,
    id,
    doc,
    subcollections,
    storeAs,
    ...remainingMeta
  } = meta;
  if (!path && !collection && !collectionGroup) {
    throw new Error('Path or Collection Group is required to build query name');
  }

  if (storeAs) {
    return storeAs;
  }

  let basePath = path || collection || collectionGroup;
  if (id || doc) {
    basePath = basePath.concat(`/${id || doc}`);
  }
  if ((path || collection) && subcollections) {
    const mappedCollections = subcollections.map((subcollection) =>
      getQueryName(subcollection),
    );
    basePath = `${basePath}/${mappedCollections.join('/')}`;
  }

  const queryParams = pickQueryParams(remainingMeta);

  if (!isEmpty(queryParams)) {
    if (queryParams.where && !Array.isArray(queryParams.where)) {
      throw new Error('where parameter must be an array.');
    }
    basePath = basePath.concat('?', serialize(queryParams));
  }

  return basePath;
}

/**
 * Create query name based on query settings for use as object keys (used
 * in listener management and reducers).
 * @param {object} meta - Metadata object containing query settings
 * @param {string} meta.collection - Collection name of query
 * @param {string} meta.collectionGroup - Collection Group name of query
 * @param {string} meta.doc - Document id of query
 * @param {Array} meta.subcollections - Subcollections of query
 * @returns {string} String representing query settings
 */
export function getBaseQueryName(meta) {
  if (typeof meta === 'string' || meta instanceof String) {
    return meta;
  }
  const {
    path,
    collection,
    collectionGroup,
    subcollections,
    ...remainingMeta
  } = meta;
  if (!path && !collection && !collectionGroup) {
    throw new Error('Path or Collection Group is required to build query name');
  }
  let basePath = path || collection || collectionGroup;

  if ((path || collection) && subcollections) {
    const mappedCollections = subcollections.map((subcollection) =>
      getQueryName(subcollection),
    );
    basePath = `${basePath}/${mappedCollections.join('/')}`;
  }

  const queryParams = pickQueryParams(remainingMeta);

  if (!isEmpty(queryParams)) {
    if (queryParams.where && !Array.isArray(queryParams.where)) {
      throw new Error('where parameter must be an array.');
    }
    basePath = basePath.concat('?', serialize(queryParams));
  }

  return basePath;
}

/**
 * Turn query string into a query config object
 * @param {string} queryPathStr String to be converted
 * @param {string} parsedPath - Already parsed path (used instead of attempting parse)
 * @returns {object} Object containing collection, doc and subcollection
 */
function queryStrToObj(queryPathStr, parsedPath) {
  const pathArr = parsedPath || trim(queryPathStr, ['/']).split('/');
  const [collection, doc, ...subcollections] = pathArr;
  const queryObj = {};
  if (collection) queryObj.collection = collection;
  if (doc) queryObj.doc = doc;
  if (subcollections.length) {
    queryObj.subcollections = [queryStrToObj('', subcollections)];
  }
  return queryObj;
}

/**
 * Convert array of queries into an array of query config objects.
 * This normalizes things for later use.
 * @param {object|string} query - Query setups in the form of objects or strings
 * @returns {object} Query setup normalized into a queryConfig object
 */
export function getQueryConfig(query) {
  if (typeof query === 'string' || query instanceof String) {
    return queryStrToObj(query);
  }

  if (!isObject(query)) {
    /* istanbul ignore next */
    throw new Error(
      'Invalid Path Definition: Only Strings and Objects are accepted.',
    );
  }

  if (
    !query.path &&
    !query.id &&
    !query.collection &&
    !query.collectionGroup &&
    !query.doc
  ) {
    throw new Error(
      'Path, Collection Group and/or Id are required parameters within query definition object.',
    );
  }

  return query;
}

/**
 * Convert array of queries into an array of queryConfig objects
 * @param {Array} queries - Array of query strings/objects
 * @returns {Array} watchEvents - Array of watch events
 */
export function getQueryConfigs(queries) {
  if (Array.isArray(queries)) {
    return queries.map(getQueryConfig);
  }
  if (typeof queries === 'string' || queries instanceof String) {
    return queryStrToObj(queries);
  }
  if (isObject(queries)) {
    return [getQueryConfig(queries)];
  }
  throw new Error('Queries must be an Array or a string.');
}
