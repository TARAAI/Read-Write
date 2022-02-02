# Migrating from redux-firestore to read-write

```ts
// Sprint.tsx
import { useFirestoreConnect } from 'react-redux-firebase';

export const SprintPage = function SprintPage(): JSX.Element {
  // ...
  useFirestoreConnect(getSprint(orgId, initialSelectedSprintId).query);
  useFirestoreConnect(selectedSlice.query);
  useFirestoreConnect(selectedTaskSlice.query);

}

```

```ts
// Sprint.tsx
import { useRead } from 'read-write-firebase';

export const SprintPage = function SprintPage(): JSX.Element {
  // ...
  const initialSprintAlias = useRead(getSprint(orgId, initialSelectedSprintId).query, '::alias');
  const selectedSprintAlias = useRead(getSprint(orgId, selectedSprint?.sprintId), '::alias');
  const selectedTaskAlias = useRead(getTask(orgId, selectedTaskId), '::alias');

}

```
