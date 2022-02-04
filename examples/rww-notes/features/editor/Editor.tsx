import React from 'react';

import { useAppDispatch } from '../../app/hooks';
import { useRead } from 'read-write';
import { unwrapResult } from '@reduxjs/toolkit';
import { saveEditor } from './editorMutates';

import {
  BoldExtension,
  ItalicExtension,
  MarkdownExtension,
  UnderlineExtension,
} from 'remirror/extensions';
import { Remirror, useRemirror, useHelpers } from '@remirror/react';

const extensions = () => [
  new BoldExtension({ weight: 400 }),
  new ItalicExtension(),
  new UnderlineExtension(),
  new MarkdownExtension({ copyAsMarkdown: true }),
];

interface EditorDoc {
  path: string;
  id: string;
  text: string
}

export const Editor = () => {
  const dispatch = useAppDispatch();

  const globalText = useRead<EditorDoc, 'text'>({ path: 'editor', id: 'global' }, 'text');

  const { manager, state, setState } = useRemirror({
    extensions,
    content: globalText ?? 'Hi **Friend**',
    stringHandler: 'markdown',
    selection: 'end',
  });

  if (globalText === undefined) {
    return null;
  }

  return (
    <Remirror
      onChange={(parameter) => {
        let nextState = parameter.state;

        if (parameter.tr?.docChanged) {
          const markdown = parameter.helpers.getMarkdown();
          dispatch(saveEditor(markdown)).then(unwrapResult).then(console.log);
        }

        setState(nextState);
      }}
      manager={manager}
      initialContent={state}
    />
  );
};
