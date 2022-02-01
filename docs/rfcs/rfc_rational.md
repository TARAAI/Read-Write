# Firestore API Rational

The question to start is how can it go wrong?

1. Tight coupling to Firestore API.
2. Reading code is reading Firesotre methods, not business logic. 
3. Transactions disptach across multiple actions making code hard to grok.
4. Testing requires lots of bolierplater for mocking. 
5. Firestore API writes take >50ms to write to IndexDB before snapshot trigger. Transactions take multiple seconds to reconcile. 
6. 



Example: [delete task with Firestore API](https://github.com/TARAAI/tara-js/blob/be3b48d0cd2e06eff6621be7f599e8673501c2cb/microservices/app/src/reduxStore/tasks/actions/delete.ts)

```ts
// action
export const archiveTask = createAsyncThunk(
  'ArchiveTask',
  async ({ id: taskID }: Pick<UI.UITask, 'id'>, { extra, getState }) => {
    const state = getState() as RootState;
    const { getOrgID, getFirestore, getUserID } = extra as ExtraAPI;
    const orgID = getOrgID();
    const userID = getUserID(state);
    const firestore = getFirestore();
    const path = `orgs/${orgID}/tasks/${taskID}`;

    if (!isNonEmptyString(taskID)) throw strings.tasks.missingCredentials;

    const { id, ...changes } = decode<UI.UITaskDeleteChangeset>(
      {
        id: taskID,
        archive: true,
        updatedAt: firestore.Timestamp.now(),
        updatedBy: userID,
      },
      'UITaskDeleteChangeset'
    );

    await firestore.update(path, changes);

    return { id: taskID };
  }
);
```

new
```ts
import { UI } from '@taraai/types';
import { createMutate } from 'redux-firestore';

type ArchivePayload = Pick<UI.UITask, 'id'> | Pick<UI.UITask, 'id'>[];
type ArchiveReads = {
  uid: string;
  org: string;
  taskIds: ArchivePayload;
};

export const archiveTask = createMutate({
  action: 'ArchiveTask',

  read: (taskIds: ArchivePayload) => ({
    taskIds: () => taskIds,
  }),

  write: ({ uid, org, taskIds }: ArchiveReads): Write[] =>
  (Array.isArray(taskIds) ? taskIds : [taskIds]).map((task) =>
    decode<UI.UITaskArchiveChangeset>(
      {
        archived: true,
        updatedAt: ['::serverTimestamp'],
        updatedBy: uid,
        path: `orgs/${org}/tasks`,
        id: task.id,
      },
      'UITaskArchiveChangeset',
    ),
  );,
});
```

test
```ts
// test
import { noop } from '@taraai/utility';

import { archiveTask } from './delete';

const id = '999';
const now = { seconds: 1000, nanoseconds: 0 };
const PAYLOAD_STUB = { id };

const getOrgID = jest.fn();
const getUserID = jest.fn();
const getFirestore = jest.fn();
const update = jest.fn();

beforeEach(() => {
  getOrgID.mockReturnValue('mock-org-id');
  getUserID.mockReturnValue('mock-user-id');
  getFirestore.mockReturnValue({
    update,
    Timestamp: {
      now: jest.fn(() => now),
    },
  });
});

describe('delete task action', () => {
  it('updates task and sets deleted attribute to true', async () => {
    const dispatchFunc = archiveTask(PAYLOAD_STUB) as any;

    await expect(
      dispatchFunc(noop, noop, { getFirestore, getOrgID, getUserID })
    ).resolves.toHaveProperty(['meta', 'arg', 'id'], id);

    expect(update).toHaveBeenCalledWith(`orgs/mock-org-id/tasks/${id}`, {
      deleted: true,
      updatedAt: now,
      updatedBy: 'mock-user-id',
    });
  });

  it('throws error when task ID is missing', async () => {
    const dispatchFunc = archiveTask({ id: '' }) as any;

    await expect(
      dispatchFunc(noop, noop, { getFirestore, getOrgID, getUserID })
    ).resolves.toHaveProperty(['error', 'message'], 'Missing user credentials');

    expect(update).not.toHaveBeenCalled();
  });
});
```

```ts
describe('archive task action', () => {
  it.each([
    {
      payload: { id: '999' },
      mutation: [
        {
          id: '999',
          path: 'orgs/mock-org-id/tasks',
          archived: true,
          updatedAt: ['::serverTimestamp'],
          updatedBy: 'mock-user-id',
        },
      ],
      provider:{ 
        uid: () => 'mock-user-id', 
        org: () => 'mock-org-id' 
      },
    },
  ])(...shouldPass(archiveTask));

  it.each`
    payload
    ${{ id: '' }}
  `(...shouldFail(archiveTask));
});
```