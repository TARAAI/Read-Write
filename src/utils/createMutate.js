/* eslint-disable no-unused-vars */
import isFunction from 'lodash/isFunction';
import { createAsyncThunk } from '@reduxjs/toolkit';

// eslint-disable-next-line require-jsdoc
function safeProvider(fnc, state) {
  try {
    return fnc(state);
  } catch (err) {
    return new Error(
      `Default Provider "${fnc.name}" doesn't accept redux state.`,
    );
  }
}

/**
 * createMutate
 * @param {{action: string, read: ReadFn, write: WriteFn}} mutation
 * @returns {Function} - AsyncActionCreator
 */
export default function createMutate({ action, ...mutation }) {
  if (!createAsyncThunk)
    throw new Error(
      "'createMutate' requires @reduxjs/toolkit. Run 'yarn add @reduxjs/toolkit'",
    );

  const { read, write, readwrite } = mutation;
  return createAsyncThunk(
    action,
    readwrite !== undefined
      ? readwrite
      : (payload, thunkAPI) => {
          try {
            const state = (thunkAPI.getState && thunkAPI.getState()) || {};
            const { getFirestore, getFirebase, ...extras } =
              thunkAPI.extra || {};
            const { mutate } = getFirestore();

            const globals = Object.keys(extras).reduce(
              (obj, extra) => ({
                ...obj,
                [extra]: safeProvider(extras[extra], state),
              }),
              {
                uid:
                  state.firebase &&
                  state.firebase.auth &&
                  state.firebase.auth.uid,
              },
            );

            const reads = read(payload, globals);
            const writes = Array.isArray(write) ? write : [write];

            const isTransaction =
              reads &&
              !Object.keys(reads).every((key) => isFunction(reads[key]));
            if (isTransaction) {
              return mutate({ reads, writes });
            }

            const values = Object.keys(reads).reduce((reader, key) => {
              if (reader[key]) return reader;
              return isFunction(reads[key])
                ? { ...reader, [key]: reads[key]() }
                : { ...reader, [key]: reads[key] };
            }, globals);

            const isBatch = Array.isArray(write);
            if (isBatch) {
              return mutate(write.map((writeFnc) => writeFnc(values)));
            }

            return mutate(write(values));
          } catch (error) {
            return error;
          }
        },
  );
}
