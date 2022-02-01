import { createMutate } from 'read-write-web3';

type CounterDoc = { path: 'counter'; id: 'global'; amount: number };

type TransactionalRead = {
  counterDoc: CounterDoc;
  amount: number;
};

/**
 * A basic read. The first argument is always the payload
 * for the action creator.
 *
 * @param amount
 * @returns Reader
 */
const read = (amount: number) => ({
  amount: () => amount,
});

/**
 * A Basic writer is a unitry function where the
 * keys metch the values from the read. Write
 * functions can return nothing, a single Write
 * or an array of Writes.
 * @param reads
 * @returns Write | Write[] | undefined
 */
const write = ({ amount = 1 }) => ({
  path: 'counter',
  id: 'global',
  amount: ['::increment', amount],
});

/**
 * In a basic action creator the read is a function where
 * the first arguement is the payload for the action and it
 * returns a map of reads that will be injected into each
 * write function.
 * @param {
 *   action: string;
 *   read: (payload?:any) => Reads,
 *   write: (reads:Reads) => Write | Write[] | undefined;
 * }
 * @returns Write | Write[] | undefined
 */
export const decrement = createMutate({
  action: 'decrement',
  read: () => ({
    amount: () => -1,
  }),
  write,
});

export const increment = createMutate({
  action: 'increment',
  read: () => ({
    amount: () => 1,
  }),
  write,
});

export const incrementByAmount = createMutate({
  action: 'increment',
  read,
  write,
});

/**
 * Use an ACID transaction to read the document from
 * Firestore to ensure the amount is odd, then increment
 * if odd. Otherwise do nothing.
 */
export const incrementIfOdd = createMutate({
  action: 'incrementIfOdd',
  read: (amount: number) => ({
    counterDoc: { path: 'counter', id: 'global' },
    amount: () => amount,
  }),
  write: ({ counterDoc, amount }: TransactionalRead) => {
    if (counterDoc.amount % 2 === 1) {
      return { ...counterDoc, amount: ['::increment', amount] };
    }
  },
});

export const incrementAsync = createMutate({
  action: 'incrementAsync',
  read: (amount: number) => ({
    counterDoc: { path: 'counter', id: 'global' },
    amount: () => amount,
  }),
  write: ({ counterDoc, amount }: TransactionalRead) => {
    return { ...counterDoc, amount: ['::increment', amount] };
  },
});
