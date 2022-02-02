# Test

Testing uses data-driven design. This lets your 
code clearly describe the inputs and outputs 
you wish to see, not all the mocks and other 
boilerplate.

The added benefit is being able to on the fly switch between a discrete, parallelized unit tests and a full integration test that runs against the Firestore Emulator (coming soon). 

Be advised that if your tests are run as an integration test and running parallelized they will corrupt the results of other tests. To start ensure integration tests are run one at a time. In order to properly be parallelized it's recommend to use TypescriptDecoders `generate` function to generate valid data from your Typescript definitions. 

# Jest

#### shouldPass

`it.each([{ payload, setup, globals, writes, results, returned }])(...shouldPass)`

```ts
import { shouldPass } from 'read-write-firestore';

const USE_EMULATOR = false;

it.each([{
  setup:    [{ path: 'orgs/my-org/tasks', id: 'task-one', archived: false, title: 'sample' }],
  globals:   { orgId: () => 'my-org' },
  payload:   { taskId: '999' },
  writes:    { path: 'orgs/my-org/tasks', id: 'task-one', archived: true },
  results:  [{ id: '999', path: 'orgs/my-org/tasks', archived: true, title: 'sample' }],
  returned: undefined,
 }])(...shouldPass(archiveTask, USE_EMULATOR));
 
it.each([{
    setup: [generate('Task', {archived: false})], // cache & firestore setup
    payload: 'task-one', // createMutate payload
    mutation: { // firestore result
      'tasks': {
        'task-one': {
          path:'tasks',
          id: 'task-one',
          archived: true
        }
      }
    }
  },
  {
    setup: {
      cache: [generate('Task', {archived: false})],
      firestore: []
    },
    payload: ['task-one', 'task-two'],
    mutation: [
      { 
        path:'tasks', 
        id: 'task-one', 
        archived: true 
      },
      { 
        path:'tasks', 
        id: 'task-two', 
        archived: true 
      },
    }
  ]
])(...shouldPass(archiveTask));
```

#### shouldFail

`it.each([{ payload, setup, globals, returned }])(...shouldFail)`

Testing for failure cases are similar to passing tests. Use the
`shouldFail` function. To test a specific error add the 'returned' key.
```ts
import { shouldFail } from 'read-write-firestore';

it.each([{
  payload: 'task-one',
  returned: new Error('Document not found.'),
}])(...shouldFail(archiveTask));
```

##### Providing globals

When the mutation requires any default or custom
globals, just add it to each test set. 

```ts
import { shouldPass } from 'read-write-firestore';

it.each([{
  payload: 'task-one',
  globals: { 
    uid: () => 'mock-user-id', 
    org: () => 'mock-org-id' 
  },
  mutation: { 
    path:'tasks', 
    id: 'task-one', 
    archived: true 
  }
  ]
}])(...shouldPass(archiveTask));
```

##### Generating Data

The `TypescriptDecoders` library is recommend to generate valid
data from a Typescript definition. Generating data is highly recommended
when running integration tests allow tests to run in parallel without
having race conditions in the database. 

```ts
import { shouldPass } from 'read-write-firestore';
import { generate } from 'typescript-decoders';

const TASK = generate('Task');

it.each([{
  payload: TASK.id,
  globals: { 
    uid: () => 'mock-user-id', 
    org: () => 'mock-org-id' 
  },
  mutation: { 
    path: 'org/mock-org-id/tasks',
    id: TASK.id,
    archived: true 
  }
  ]
}])(...shouldPass(archiveTask));
```

##### Integation Tests

(Coming Soon)

```ts
import { shouldPass } from 'read-write-firestore';

it.each([{
  payload: 'task-one',
  globals: { 
    uid: () => 'mock-user-id', 
    org: () => 'mock-org-id' 
  },
  mutation: { 
    path:'tasks', 
    id: 'task-one', 
    archived: true 
  },
}])(...shouldPass(archiveTask, true));
```

# Storybook
`setCache({[alias]: [DocumentOne, DocumentTwo]});`

Storybook tests are as simple as providing the data that should return to the useRead & useCache calls. 

```tsx
const cache = setCache({
  myAlias: [
    { path:'tasks', id:'task-one', title: 'test task' }
  ],
});

export const Default = (): JSX.Element => (
  <Provider store={cache}>
    <TaskList />
  </Provider>
);
```

[TODO: What if ppl don't know what alias will be geneated from there useRead call?]