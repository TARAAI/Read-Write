# Read/Write

Read
```ts
const tasks = useRead({ 
  path: 'tasks', 
  where: [
    ['status', '==', 'done'],
    ['assignee', '==', myUID]
  ],
  orderBy: ['createdAt', 'desc'],
});
```

Write
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

# Firestore SDK

Read
```ts
let tasks = undefined;
const collectionReference = collection('tasks');
collectionReference.where('status', '==', 'done');
collectionReference.where('assignee', '==', myUID);
collectionReference.orderBy('createdAt', 'desc');
collectionReference.onSnapshot((docs) => {
  if (!docs.exists) {
    tasks = null;
    return;
  }
  tasks = docs.map(doc => doc.data());
}));
```

Write
```ts
const documentReference = doc(`tasks/${taskId}`);
const done = await documentReference.update(
  { archived: true }, 
  { merge: true }
);
```


# React Redux Firestore