/* eslint-disable require-jsdoc */
import mutate from 'utils/mutate';
import { getRead } from '../../../src/utils/mutate';

describe('firestore.mutate()', () => {
  it('getRead', async () => {
    expect(getRead({ '::w3Provider': 'val' })).toBe('val');
    expect(getRead(() => 'non-deterministic')).toBe('non-deterministic');
    expect(getRead({ some: 'map' })).toStrictEqual({ some: 'map' });
  });

  it('throws on async reads', async () => {
    const set = jest.fn();
    const doc = jest.fn(() => ({
      set,
      id: 'id',
      parent: { path: 'path' },
    }));
    const firestore = jest.fn(() => ({ doc }));

    expect(() =>
      mutate(
        { firestore },
        {
          reads: { badAsync: async () => 'never called' },
          writes: { path: 'collection', id: 'doc-id', value: 1 },
        },
      ),
    ).toThrowError('Read Providers must be synchronous, nullary functions.');
  });

  it('writes a single operation', async () => {
    const set = jest.fn();
    const doc = jest.fn(() => ({
      set,
      id: 'id',
      parent: { path: 'path' },
    }));
    const firestore = jest.fn(() => ({ doc }));

    await mutate(
      { firestore },
      {
        collection: 'orgs/tara-ai/teams',
        doc: 'team-bravo',
        data: {
          name: 'Bravo Team 🎄',
        },
      },
    );

    expect(doc).toHaveBeenCalledWith('orgs/tara-ai/teams/team-bravo');
    expect(set).toHaveBeenCalledWith(
      { name: 'Bravo Team 🎄' },
      { merge: true },
    );
  });

  it('writes operations in batch', async () => {
    const set = jest.fn(() => {});
    const commit = jest.fn((val) => Promise.resolve(val));
    const doc = jest.fn((val) => ({
      id: `mock-${val}`,
      parent: { path: 'path' },
    }));

    const batch = jest.fn(() => ({ set, commit }));
    const firestore = jest.fn(() => ({ batch, doc }));

    await mutate({ firestore }, [
      {
        path: 'orgs/tara-ai/teams',
        id: 'team-bravo',
        name: 'Bravo Team 🎄',
      },
      {
        path: 'orgs/tara-ai/teams',
        id: 'team-alpha',
        name: 'Alpha Team 🎅',
      },
    ]);

    expect(set).toHaveBeenCalledTimes(2);

    expect(set.mock.calls[0][0]).toStrictEqual({
      id: 'mock-orgs/tara-ai/teams/team-bravo',
      parent: { path: 'path' },
    });
    expect(set.mock.calls[0][1]).toStrictEqual({ name: 'Bravo Team 🎄' });
    expect(set.mock.calls[0][2]).toStrictEqual({ merge: true });

    expect(set.mock.calls[1][0]).toStrictEqual({
      id: 'mock-orgs/tara-ai/teams/team-alpha',
      parent: { path: 'path' },
    });
    expect(set.mock.calls[1][1]).toStrictEqual({ name: 'Alpha Team 🎅' });
    expect(set.mock.calls[1][2]).toStrictEqual({ merge: true });

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('writes operations in multiple batches when there are over 500 writes', async () => {
    const set = jest.fn(() => ({ set, commit }));
    const commit = jest.fn((val) => Promise.resolve(val));
    const doc = jest.fn((val) => ({
      doc: val,
      id: 'id',
      parent: { path: 'path' },
    }));

    const batch = jest.fn(() => ({ set, commit }));
    const firestore = jest.fn(() => ({ batch, doc }));

    const writes = Array.from(Array(501), (_el, index) => ({
      collection: 'orgs/tara-ai/teams',
      doc: `team-${index}`,
      data: {
        name: `Team ${index}`,
      },
    }));

    await mutate({ firestore }, writes);

    expect(batch.mock.calls.length).toBe(2);
    expect(set.mock.calls.length).toBe(501);
    expect(commit.mock.calls.length).toBe(2);
  });

  it('writes transaction w/ provider, query & doc', async () => {
    const firestoreGet = jest.fn(() =>
      Promise.resolve({
        docs: [
          { id: 'task-1', parent: { path: 'tasks' } },
          { id: 'task-2', parent: { path: 'tasks' } },
        ],
      }),
    );
    const withConverter = jest.fn(() => ({ get: firestoreGet }));
    const where = jest.fn(() => ({ get: firestoreGet }));
    const collection = jest.fn(() => ({ doc, where }));
    const update = jest.fn();
    function* mock() {
      yield Promise.resolve({
        ref: { id: 'sprint-1', parent: { path: 'sprints' } },
        data: () => ({
          sprintSettings: { moveRemainingTasksTo: 'NextSprint' },
        }),
      });

      yield Promise.resolve({
        ref: { id: 'task-id-1', parent: { path: 'tasks' } },
        data: () => ({ id: 'task-id-1' }),
      });

      yield Promise.resolve({
        ref: { id: 'task-id-2', parent: { path: 'tasks' } },
        data: () => ({ id: 'task-id-2' }),
      });
    }
    const mocked = mock();
    const transactionGet = () => mocked.next().value;
    const transaction = { update, get: transactionGet };
    const runTransaction = jest.fn((cb) => cb(transaction));
    const doc = jest.fn((val) => ({
      doc: val,
      withConverter,
      id: 'id',
      parent: { path: 'path' },
    }));

    const firestore = jest.fn(() => ({ collection, runTransaction, doc }));

    await mutate(
      { firestore },
      {
        reads: {
          org: () => `tara`,
          team: {
            collection: 'orgs/tara-ai/teams',
            doc: 'team-id-123',
          },
          unfinishedTasks: {
            collection: 'orgs/tara-ai/tasks',
            where: ['status', '<', 2],
          },
        },
        writes: [
          ({ org, unfinishedTasks, team }) =>
            unfinishedTasks.map((task) => ({
              collection: `orgs/${org}/tasks`,
              doc: task.id,
              data: {
                'nested.field': 'new-value',
                nextSprintId:
                  team && team.sprintSettings.moveRemainingTasksTo === 'Backlog'
                    ? null
                    : 'next-sprint-id-123',
              },
            })),
        ],
      },
    );

    expect(update.mock.calls.length).toBe(2);
    expect(update.mock.calls[0][0]).toHaveProperty(
      'doc',
      'orgs/tara/tasks/task-id-1',
    );
    expect(update.mock.calls[0][1]).toStrictEqual({
      nextSprintId: 'next-sprint-id-123',
      'nested.field': 'new-value',
    });
    expect(update.mock.calls[0][2]).toBeUndefined();

    expect(update.mock.calls[1][0]).toHaveProperty(
      'doc',
      'orgs/tara/tasks/task-id-2',
    );
    expect(update.mock.calls[1][1]).toStrictEqual({
      nextSprintId: 'next-sprint-id-123',
      'nested.field': 'new-value',
    });
    expect(update.mock.calls[1][2]).toBeUndefined();
  });

  it('writes transaction w/ single write', async () => {
    const firestoreGet = jest.fn(() =>
      Promise.resolve({
        docs: [
          { id: 'task-1', parent: { path: 'tasks' } },
          { id: 'task-2', parent: { path: 'tasks' } },
        ],
      }),
    );
    const withConverter = jest.fn(() => ({ get: firestoreGet }));
    const where = jest.fn(() => ({ get: firestoreGet, withConverter }));
    const collection = jest.fn(() => ({ doc, withConverter, where }));
    const set = jest.fn();
    // eslint-disable-next-line
    function* mock() {
      yield Promise.resolve({
        ref: { id: 'sprint-1', parent: { path: 'sprints' } },
        data: () => ({ teamCount: 9 }),
      });
    }
    const mocked = mock();
    const transactionGet = () => mocked.next().value;
    const transaction = { set, get: transactionGet };
    const runTransaction = jest.fn((cb) => cb(transaction));
    const doc = jest.fn((val) => ({
      withConverter,
      id: `mock-${val}`,
      parent: { path: 'path' },
    }));

    const firestore = jest.fn(() => ({ collection, runTransaction, doc }));

    await mutate(
      { firestore },
      {
        reads: {
          team: {
            collection: 'orgs/tara-ai/teams',
            doc: 'team-id-123',
            collectionName: 'teams',
          },
        },
        writes: [
          ({ team }) => ({
            collection: 'orgs/tara-ai/team',
            doc: team.id,
            data: { teamCount: team.teamCount + 1 },
          }),
        ],
      },
    );

    expect(set).toHaveBeenCalledTimes(1);

    expect(set.mock.calls[0][0]).toHaveProperty(
      'id',
      'mock-orgs/tara-ai/team/sprint-1',
    );
    expect(set.mock.calls[0][1]).toStrictEqual({
      teamCount: 10,
    });
    expect(set.mock.calls[0][2]).toStrictEqual({ merge: true });
  });

  it('handles empty read transaction', async () => {
    const firestoreGet = jest.fn(() => Promise.resolve());
    const withConverter = jest.fn(() => ({ get: firestoreGet }));
    const where = jest.fn(() => ({ get: firestoreGet, withConverter }));
    const collection = jest.fn(() => ({ doc, withConverter, where }));
    const set = jest.fn();
    // eslint-disable-next-line
    function* mock() {
      yield Promise.resolve({
        ref: { id: 'sprint-1', parent: { path: 'sprints' } },
        empty: () => true,
      });
    }
    const mocked = mock();
    const transactionGet = () => mocked.next().value;
    const transaction = { set, get: transactionGet };
    const runTransaction = jest.fn((cb) => cb(transaction));
    const doc = jest.fn((val) => ({
      withConverter,
      id: `mock-${val}`,
      parent: { path: 'path' },
    }));

    const firestore = jest.fn(() => ({ collection, runTransaction, doc }));

    expect(() =>
      mutate(
        { firestore },
        {
          reads: {
            team: {
              collection: 'orgs/tara-ai/teams',
              doc: 'team-id-123',
              collectionName: 'teams',
            },
          },
          writes: [
            ({ team }) => {
              if (!team) throw new Error("team wasn't loaded.");
            },
          ],
        },
      ),
    ).rejects.toThrowError("team wasn't loaded.");
  });

  it('handles Firebase 9 stringified Field Values', async () => {
    const set = jest.fn();
    const update = jest.fn();
    const doc = jest.fn(() => ({
      set,
      update,
      id: 'id',
      parent: { path: 'path' },
    }));
    const collection = jest.fn(() => ({ doc }));
    const firestore = jest.fn(() => ({ collection, doc }));
    firestore.firestore = {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'firestore.FieldValue.serverTimestamp'),
      },
    };

    await mutate(
      { firestore, firebase: firestore },
      {
        collection: 'orgs/tara-ai/teams',
        doc: 'team-bravo',
        data: {
          name: 'Bravo Team 🎄',
          updateAt: ['::serverTimestamp'],
        },
      },
    );

    expect(set.mock.calls[0][0]).toStrictEqual({
      name: 'Bravo Team 🎄',
      updateAt: 'firestore.FieldValue.serverTimestamp',
    });

    expect(doc).toHaveBeenCalledWith('orgs/tara-ai/teams/team-bravo');

    expect(update).not.toBeCalled(); // only nested changes require update

    expect(
      firestore.firestore.FieldValue.serverTimestamp,
    ).toHaveBeenCalledTimes(1);
  });

  it('handles stringified Field Values', async () => {
    const set = jest.fn();
    const update = jest.fn();
    const doc = jest.fn(() => ({
      set,
      update,
      id: 'id',
      parent: { path: 'path' },
    }));
    const collection = jest.fn(() => ({ doc }));
    const firestore = jest.fn(() => ({ collection, doc }));
    firestore.FieldValue = {
      serverTimestamp: jest.fn(() => 'firestore.FieldValue.serverTimestamp'),
      increment: jest.fn(() => 'firestore.FieldValue.increment'),
      arrayRemove: jest.fn(
        (values) =>
          `firestore.FieldValue.arrayRemove(${
            typeof values === 'string' ? values : JSON.stringify(values)
          })`,
      ),
      arrayUnion: jest.fn(
        (values) => `firestore.FieldValue.arrayUnion(${values.toString()})`,
      ),
    };

    await mutate(
      { firestore },
      {
        collection: 'orgs/tara-ai/teams',
        doc: 'team-bravo',
        data: {
          name: 'Bravo Team 🎄',
          'deeply.nested.map': 'value',
          'deeply.nested.array': ['::arrayUnion', ['first', 'second']],
          addArray: ['::arrayUnion', 'val'],
          removeArray: ['::arrayRemove', ['item1', 'item2']],
          removeArrayObjects: ['::arrayRemove', [{ type: 1 }, { type: 2 }]],
          updateAt: ['::serverTimestamp'],
          counter: ['::increment', 3],
          deepUnnested: {
            moreDeep: {
              removeArray: ['::arrayRemove', 'val'],
            },
            updateAt: ['::serverTimestamp'],
          },
          deepUnnestedArray: [
            {
              addArray: ['::arrayUnion', 'val'],
              updateAt: ['::serverTimestamp'],
            },
          ],
          null: null,
        },
      },
    );

    expect(update.mock.calls[0][0]).toStrictEqual({
      addArray: 'firestore.FieldValue.arrayUnion(val)',
      name: 'Bravo Team 🎄',
      'deeply.nested.map': 'value',
      'deeply.nested.array': 'firestore.FieldValue.arrayUnion(first,second)',
      removeArray: 'firestore.FieldValue.arrayRemove(["item1","item2"])',
      removeArrayObjects:
        'firestore.FieldValue.arrayRemove([{"type":1},{"type":2}])',
      updateAt: 'firestore.FieldValue.serverTimestamp',
      counter: 'firestore.FieldValue.increment',
      deepUnnested: {
        moreDeep: { removeArray: 'firestore.FieldValue.arrayRemove(val)' },
        updateAt: 'firestore.FieldValue.serverTimestamp',
      },
      deepUnnestedArray: [
        {
          addArray: 'firestore.FieldValue.arrayUnion(val)',
          updateAt: 'firestore.FieldValue.serverTimestamp',
        },
      ],
      null: null,
    });

    expect(doc).toHaveBeenCalledWith('orgs/tara-ai/teams/team-bravo');

    expect(set).not.toBeCalled(); // nested updates require using `update`

    expect(firestore.FieldValue.serverTimestamp).toHaveBeenCalledTimes(3);
    expect(firestore.FieldValue.increment).toHaveBeenCalledTimes(1);
    expect(firestore.FieldValue.arrayRemove).toHaveBeenCalledTimes(3);
    expect(firestore.FieldValue.arrayUnion).toHaveBeenCalledTimes(3);
  });
});
