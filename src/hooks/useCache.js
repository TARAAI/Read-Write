import { has, isEqual, isPlainObject, pick } from 'lodash';
import { useRef, useMemo, useEffect, useCallback } from 'react';
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

const selectList = (cache, result, fields = null) => {
  if (!result || !result.ordered) return undefined;
  const docs = result.ordered.reduce((arr, [path, id]) => {
    const doc = selectDocument(cache, id, path, fields);
    if (doc) {
      arr.push(doc);
    }
    return arr;
  }, []);

  return result.id && Array.isArray(docs) ? docs[0] : docs;
};

const selectAlias = (state, alias) =>
  (state &&
    state.firestore &&
    state.firestore.cache &&
    state.firestore.cache[alias]) ||
  undefined;

/**
 * set/uset listeners and return a selector to it.
 * Note: functions are supported but don't use them.
 * @param { PathId | PathIds[] | ReadQuery.alias } alias
 * @param { null | string } selection
 * @return Identifiables[]
 */
export default function useCache(alias, selection = null) {
  const value = typeof selection === 'string' ? selection : null;
  const fields = Array.isArray(selection) ? selection : value;
  const postFnc =
    typeof selection === 'function' ? useCallback(selection) : null;

  const aliasRef = useRef(alias);

  useEffect(() => {
    if (!alias) return;

    if (!isEqual(alias, aliasRef.current)) {
      console.log('alias change', alias, aliasRef.current);
      aliasRef.current = alias;
    }
  }, [alias]);

  const selector = useMemo(
    () =>
      function readSelector(state) {
        const { firestore: { cache } = {} } = state || {};
        if (!cache || !aliasRef.current) return undefined;

        const aliases = aliasRef.current;

        const isPathId = has(aliasRef.current, 'path');
        if (isPathId) {
          return selectDocument(
            cache,
            aliasRef.current.id,
            aliasRef.current.path,
            fields,
          );
        }

        const isMultiple = Array.isArray(aliases);
        const listsAndDocs = (isMultiple ? aliases : [aliases]).map((alias) => {
          const isAlias = typeof alias === 'string';
          if (isAlias) {
            const key = selectAlias(state, alias);
            if (!key) return undefined;
            return selectList(cache, key, fields);
          }

          return selectDocument(cache, alias.id, alias.path, fields);
        });

        if (isMultiple) {
          return postFnc ? postFnc(listsAndDocs) : listsAndDocs;
        }

        return (postFnc ? postFnc(listsAndDocs) : listsAndDocs)[0];
      },
    [aliasRef.current, postFnc, fields],
  );

  // All data from firestore is standard JSON except Timestamps
  return useSelector(selector, isEqual);
}
