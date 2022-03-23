import { filter, isEqual, some } from 'lodash';
import { useRef, useEffect } from 'react';
import { useFirestore } from 'react-redux-firebase';
import { getQueryName } from '../utils/query';
import useCache from './useCache';

const getChanges = (data = [], prevData = []) => {
  const result = {};
  result.added = filter(data, (d) => !some(prevData, (p) => isEqual(d, p)));
  result.removed = filter(prevData, (p) => !some(data, (d) => isEqual(p, d)));
  return result;
};

export default function useRead(queries, selection = null) {
  const firestore = useFirestore();

  const firestoreIsEnabled = !!firestore;
  const queryRef = useRef();
  const aliasRef = useRef();

  useEffect(() => {
    const queryArray = Array.isArray(queries) ? queries : [queries];
    if (!firestoreIsEnabled || isEqual(queryArray, queryRef.current)) return;

    const changes = getChanges(queryArray, queryRef.current);

    queryRef.current = queryArray;
    aliasRef.current = queryRef.current.map(getQueryName);

    // Remove listeners for inactive subscriptions
    firestore.unsetListeners(changes.removed);

    // Add listeners for new subscriptions
    firestore.setListeners(changes.added);
  }, [aliasRef.current]);

  // clean up for hot-reloads and mount/unmount
  useEffect(
    () => () => {
      if (!firestoreIsEnabled || !queryRef.current) return;

      queryRef.current = [];
      aliasRef.current = undefined;
      firestore.unsetListeners(queryRef.current);
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
