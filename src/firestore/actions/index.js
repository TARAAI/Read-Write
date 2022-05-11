/* eslint-disable jsdoc/require-param */
import { firestoreRef } from '../../utils/convertors';
import { add } from './add';
import { deleteRef } from './del';
import { get } from './get';
import { mutate } from './mutate';
import { runTransaction } from './transaction';
import { update } from './update';
import { set } from './set';
import {
  setListener,
  setListeners,
  unsetListener,
  unsetListeners,
} from './snapshot-listener';

const firestoreActions = {
  get,
  firestoreRef,
  deleteRef,
  add,
  set,
  update,
  setListener,
  setListeners,
  unsetListener,
  unsetListeners,
  runTransaction,
  mutate,
};

export { firestoreActions };
export default { firestoreActions };
