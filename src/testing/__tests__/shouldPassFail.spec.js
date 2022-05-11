import firebase from 'firebase/compat/app';

import { shouldPass } from '../shouldPassFail';
import createMutate from '../../mutate/createMutate';

const sampleAction = createMutate({
  action: 'sampleAction',

  read: (taskId, { orgId }) => ({
    myTask: { path: `orgs/${orgId}/tasks`, id: taskId },
    taskId: () => taskId,
  }),

  write: ({ myTask, taskId }) => ({
    id: (myTask && myTask.id) || taskId,
    path: (myTask && myTask.path) || 'orgs/my-org/tasks',
    archived: true,
  }),
});

it.each([
  {
    testname: '@scenario: Test Archived',

    setup: [
      {
        path: 'orgs/my-org/tasks',
        id: 'task-one',
        archived: false,
        title: 'Read/Write Task Title',
      },
    ],

    globals: { orgId: () => 'my-org' },

    payload: 'task-one',

    component: 'testing/__mocks__/MockComponent.tsx',

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
])(...shouldPass(sampleAction, false));

afterAll(async () => {
  await Promise.all(firebase.apps.map((app) => app.delete()));
});

// 12/30 - full cache works
// 12/31 - offline emulator fully works
// 12/31 - Next steps: clean up DB
// 03/24 - integrated storybook support
// Later - figure out improper tear down
// Icebox -  parallelize integration tests by randomly generating root collection
