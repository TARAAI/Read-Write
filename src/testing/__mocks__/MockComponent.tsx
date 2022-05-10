import React from 'react';
import useRead from '../../hooks/useRead';

export default function Task() {
  const tasks = useRead({ path: 'orgs/my-org/tasks' }) || [];

  return tasks.map(({ title, id, path, archived }) => (
    <section key={`${path}/${id}`} id={`${path}/${id}`}>
      <h1>{title}</h1>
      <span>{archived ? 'was archieved' : 'is active'}</span>
    </section>
  ));
}
