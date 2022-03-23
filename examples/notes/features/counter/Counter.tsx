import React, { useState } from 'react';

import { useAppDispatch } from '../../app/hooks';
import {
  decrement,
  increment,
  incrementByAmount,
  incrementAsync,
  incrementIfOdd,
} from './counterMutates';
import styles from './Counter.module.css';
import { useRead } from 'read-write';
import { unwrapResult } from '@reduxjs/toolkit';

type Counter = {
  id: string;
  path: string;
  amount: number;
};

function Count(): JSX.Element {

  const counter = useRead<Counter, 'amount'>({
    path: 'counter',
    id: 'global'
  }, 'amount');

  return <span className={styles.value}>{counter ?? 0}</span>
}

export function Counter() {
  const dispatch = useAppDispatch();
  const [incrementAmount, setIncrementAmount] = useState('2');
  const [transactionStatus, setTransactionStatus] = useState('Add Async');

  const incrementValue = Number(incrementAmount) || 0;

  return (
    <div>
      <div className={styles.row}>
        <button
          className={styles.button}
          aria-label="Decrement value"
          onClick={() => dispatch(decrement(null)).then(unwrapResult).catch(console.error)}
        >
          -
        </button>

        <Count />

        <button
          className={styles.button}
          aria-label="Increment value"
          onClick={() => dispatch(increment(null)).then(unwrapResult).catch(console.error)}
        >
          +
        </button>
      </div>
      <div className={styles.row}>
        <input
          className={styles.textbox}
          aria-label="Set increment amount"
          value={incrementAmount}
          onChange={(e) => setIncrementAmount(e.target.value)}
        />
        <button
          className={styles.button}
          onClick={() =>
            dispatch(incrementByAmount(incrementValue)).then(unwrapResult).catch(console.error)
          }
        >
          Add Amount
        </button>
        <button
          className={styles.asyncButton}
          onClick={() => {
            setTransactionStatus('Sending');
            dispatch(incrementAsync(incrementValue))
              .then(unwrapResult)
              .then(() => {
                setTransactionStatus('Saved');
                setTimeout(() => setTransactionStatus('Add Async'), 1000);
              })
              .catch(() => setTransactionStatus('error'));
          }}
        >
          {transactionStatus}
        </button>
        <button
          className={styles.button}
          onClick={() => dispatch(incrementIfOdd(incrementValue)).then(unwrapResult).catch(console.error)}
        >
          Add If Odd
        </button>
      </div>
    </div>
  );
}
