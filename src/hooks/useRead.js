import { filter, isEqual, some } from 'lodash';
import { useRef, useMemo, useEffect } from 'react';
import { useFirestore } from 'react-redux-firebase';
import { getQueryName } from '../utils/query';
import useCache from './useCache';

const getChanges = (data = [], prevData = []) => {
  const result = {};
  result.added = filter(data, (d) => !some(prevData, (p) => isEqual(d, p)));
  result.removed = filter(prevData, (p) => !some(data, (d) => isEqual(p, d)));
  return result;
};

/**
 * set/uset listeners and return a selector to it.
 *
 * @param {*} queries
 * @param {*} selection
 * @return Selector | string
 */
export default function useRead(queries, selection = null) {
  const firestore = useFirestore();

  const firestoreIsEnabled = !!firestore;
  const queryRef = useRef();
  const aliasRef = useRef();

  useEffect(() => {
    if (firestoreIsEnabled && queries && !isEqual(queries, queryRef.current)) {
      const queryArray = Array.isArray(queries) ? queries : [queries];
      const changes = getChanges(queryArray, queryRef.current);

      queryRef.current = queryArray;
      aliasRef.current = queryRef.current.map(getQueryName);

      // Remove listeners for inactive subscriptions
      firestore.unsetListeners(changes.removed);

      // Add listeners for new subscriptions
      firestore.setListeners(changes.added);
    }
  }, [aliasRef.current]);

  useEffect(
    () => () => {
      if (firestoreIsEnabled && queryRef.current) {
        firestore.unsetListeners(queryRef.current);
      }
    },
    [],
  );

  // All data from firestore is standard JSON except Timestamps
  if (selection === '::alias') {
    return Array.isArray(queries)
      ? queries.map(getQueryName)
      : getQueryName(queries);
  }

  return useCache(
    Array.isArray(queries) ? queries.map(getQueryName) : getQueryName(queries),
    selection,
  );
}
