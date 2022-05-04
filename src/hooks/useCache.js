import has from 'lodash/has';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';

const document = ({ databaseOverrides = {}, database = {} }, [path, id]) => {
  const override = databaseOverrides[path] && databaseOverrides[path][id];
  const doc = database[path] && database[path][id];
  if (override) return { ...doc, ...override };
  return doc;
};

const selectDocument = (cache, id, path, fields = null) => {
  if (id === undefined || path === undefined) return undefined;
  const doc = document(cache, [path, id]);
  if (!doc) return doc;
  if (typeof fields === 'string') {
    return doc[fields];
  }
  if (doc && fields) {
    return pick(doc, ['id', 'path', ...fields]);
  }
  return doc;
};

const selectList = (cache, { id, path, ordered, via } = {}, fields = null) => {
  if (!ordered) return ordered;
  if (ordered.length === 0 && selectDocument(cache, id, path, fields) === null)
    return null; // Query finished but no documents exist in Firestore

  const docs = ordered.reduce((arr, [path, id]) => {
    const doc = selectDocument(cache, id, path, fields);
    if (doc) {
      arr.push(doc);
    }
    return arr;
  }, []);

  return id && Array.isArray(docs) ? docs[0] : docs;
};

const selectAlias = (state, alias) =>
  (state &&
    state.firestore &&
    state.firestore.cache &&
    state.firestore.cache[alias]) ||
  undefined;

/**
 * set/unset listeners and return a selector to it.
 * Note: functions are supported but don't use them.
 * @param { PathId | PathIds[] | ReadQuery.alias } alias
 * @param { null | string } selection
 * @return Identifiables[]
 */
export default function useCache(alias, selection = null) {
  const value = typeof selection === 'string' ? selection : null;
  const [fields, setFields] = useState(
    Array.isArray(selection) ? selection : value,
  );
  const postFnc =
    typeof selection === 'function' ? useCallback(selection) : null;

  const [localAlias, setAlias] = useState(alias);

  useEffect(() => {
    if (!isEqual(alias, localAlias)) {
      setAlias(alias);
    }
    if (!isEqual(fields, Array.isArray(selection) ? selection : value)) {
      setFields(Array.isArray(selection) ? selection : value);
    }
  }, [alias, selection, value]);

  // Standard (& Typed) Redux selector. Will recreate if alias or filtering changes
  const selector = useMemo(
    () =>
      function readSelector(state) {
        const { firestore: { cache } = {} } = state || {};
        if (!cache || !localAlias) return undefined;

        const aliases = localAlias;

        const isPathId = has(localAlias, 'path');
        if (isPathId) {
          return selectDocument(cache, localAlias.id, localAlias.path, fields);
        }

        const isMultiple = Array.isArray(aliases);
        const listsAndDocs = (isMultiple ? aliases : [aliases]).map((alias) => {
          const isAlias = typeof alias === 'string';
          if (isAlias) {
            const queryResults = selectAlias(state, alias);
            if (!queryResults) return undefined;
            return selectList(cache, queryResults, fields);
          }

          return selectDocument(cache, alias.id, alias.path, fields);
        });

        if (isMultiple) {
          return postFnc ? postFnc(listsAndDocs) : listsAndDocs;
        }

        return (postFnc ? postFnc(listsAndDocs) : listsAndDocs)[0];
      },
    [localAlias, postFnc, fields],
  );

  // All data from firestore is standard JSON except Timestamps
  return useSelector(selector, isEqual);
}
