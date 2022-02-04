import { createMutate } from 'read-write';

export const saveEditor = createMutate({
  action: 'saveEditor',

  read: (newEditorText: string) => ({
    text: () => newEditorText,
  }),

  write: ({ text }: { text: string }) => ({
    path: 'editor',
    id: 'global',
    text,
  }),
});
