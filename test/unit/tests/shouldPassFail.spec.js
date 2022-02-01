import firebase from 'firebase/compat/app';

import { shouldPass } from '../../../src/tests/shouldPassFail';
import createMutate from '../../../src/utils/createMutate';

const sampleAction = createMutate({
  action: 'sampleAction',

  read: (taskId, { orgId }) => ({
    myTask: { path: `orgs/${orgId}/tasks`, id: taskId },
    taskId: () => taskId,
  }),

  write: ({ myTask, taskId }) => ({
    id: myTask?.id || taskId,
    path: myTask?.path || 'orgs/my-org/tasks',
    archived: true,
  }),
});

it.each([
  {
    setup: [
      {
        path: 'orgs/my-org/tasks',
        id: 'task-one',
        archived: false,
        title: 'sample',
      },
    ],

    globals: { orgId: () => 'my-org' },

    payload: 'task-one',

    writes: {
      path: 'orgs/my-org/tasks',
      id: 'task-one',
      archived: true,
    },

    results: {
      'orgs/my-org/tasks': {
        'task-one': { archived: true },
      },
    },
  },
])(...shouldPass(sampleAction, true));

afterAll(async () => {
  await Promise.all(firebase.apps.map((app) => app.delete()));
});

// 12/30 - full cache works
// 12/31 - offline emulator fully works
// TODO: 12/31 - Next steps: clean up DB
// Later - figure out improper tear down
// Icebox -  parallelize integration tests by randomly generating root collection
