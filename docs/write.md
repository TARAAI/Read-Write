# Write

## Basic Write
`createMutate({ action, read, write })` 

Create a Redux action creator to create, update & delete data. Mutations synchronously update the Redux store making React components feel instant. 

```ts
const archiveTask = createMutate({ 
  action: 'ArchiveTask', 

  read: (taskId) => ({ taskId: () => taskId }), 
  
  write: ({ taskId }) => ({ 
    path:'tasks', 
    id: taskId, 
    archived: true 
  }),
});
```

## Atomic Operations

Limitations. As of v1 atomicOperations are only provided at the top level. 
Deeply nested operations, like an array union that has a timestamp, would
require using the Google SDK's FieldValue, for now.

- `::serverTimestamp`
- `::arrayUnion`
- `::arrayRemove`
- `::increment`
- `::delete`
- Nested Updates

## Advanced Write

#### Default Globals

By default when a user is logged in their user
id will be provided in both the read and write functions. 

```ts
const archiveTask = createMutate({ 
  action: 'ArchiveTask', 

  read: (bgColor, { uid }) => ({ 
    userProfile: { path: 'users', id: uid },
    backgroundColor: () => bgColor
  }), 
  
  write: ({ userProfile, backgroundColor, uid }) => ({ 
    path: userProfile.path
    id: uid, 
    primaryBackgroundColor: backgroundColor,
  }),
});
```

#### Custom Globals

Both read and write functions allow the Redux
store to inject custom data. This helps make global-like state more accessible without having
React components send data in via the payload.

For `read` the data will be received in the
second argument. On `write` it will be included
in the object sent in the first argument.

To add custom data, add your function in the 
`thunk.withExtraArgument` when configuring your
store. 

```ts
// store.ts
const myCustomProfile = (state: RootState): UserProfile => 
  state.firebase.auth.profile;

export const store = configureStore({
  reducer: {
    firestore: firestoreReducer,
    firebase: firebaseReducer,
    ...myReducers,
  },
  middleware: [
    thunk.withExtraArgument({
      getFirestore,
      getFirebase,
      myCustomProfile,
    }),
  ],
});

// action/profile.ts
const updateProfile = createMutate({ 
  action: 'UpdateProfile', 

  read: ({ color }, { myCustomProfile, uid }) => {
    return { 
      color: () => color,
      profileDoc: { 
        path: 'users', 
        id: myCustomProfile.id 
      },
  }, 
  
  write: ({ color, profileDoc, myCustomProfile }) => {
    if (profileDoc.name === 'bobby') return null;
    return {
      path: 'users'
      id: myCustomProfile.id,
      backgroundColor: color,
    };
  }
});

```



- TODO: readwrite function


## Folder Structure

The recommendation is to have all the discrete
write functions in a separate folder. Write
functions are idempotent. Typescript will
warn if one of the writes does not accept the
right read keys.
```
- redux
  |- actions
    |- myAction1
    |- myAction2
  |- writes
    |- myCollection1Writes1
    |- myCollection1Writes2
```

## Mutation Promise

Action creators return a promise when Firestore accepts or rejects your mutation. 

```ts
useDispatch(archiveTask('task-one'))
  .then(() => alert('task archived.'));
```

## Playbooks & Limitations

A current limitation for transactions are serial reads.  

Read can not be dependant on each other yet. To solve this provide additional, 
local knowledge in the payload

**Example:** Moving and ordering tasks on a Sprint
**Problem:** The task document has the relational id for sprint. Moving a 
task should remove it from the ordered list on the old sprint and
insert it in the proper order on the new sprint. 
```ts
interface Sprint {
  id: Identifiable.Id;
  path: Identifiable.Path;
  taskOrder: Task.Id[];
}
interface Task {
  id: Identifiable.Id;
  path: Identifiable.Path;
  sprint: Sprint.Id;
}

createMutate({
  action: 'moveSprint',

  read: ({ taskId, source, destination, insertAfterId }, {org}) => ({
    task: { path:  `orgs/${org}/tasks`, id: taskId },
    insertAfterId: () => insertAfterId, 
    source: !source ? () => null : { path:  `orgs/${org}/sprints`, id: source },
    destination: { path:  `orgs/${org}/sprints`, id: destination },
  }),

  write: ({task, source, destination, insertAfterId}) => {
    const { taskOrder } = destination;
    const writes = [
      { id: task.id, path: task.path, sprint: source.id },
      { 
        id: destination.id, 
        path: destination.path, 
        tasks: taskOrder.splice(taskOrder.findIndex(insertAfterId), 0, task.id) 
      },
    ];
    // This is the wrong, naive way. 
    // Don't just check if React injected source (properly locking the doc in the transaction)
    // if (source ) {
    //   writes.push({ 
    //     id: source.id, 
    //     path: source.path, 
    //     tasks: ['::arrayRemove', task.id] 
    //   });
    // }
    //
    // Right way is to validate the task.sprint (which is locked as part of the transaction)
    if (task.sprint && task.sprint !== destination.id) {
      writes.push({ 
        id: task.sprint, 
        path: source.path, 
        tasks: ['::arrayRemove', task.id] 
      });
    }
    return writes;
  }
})
```