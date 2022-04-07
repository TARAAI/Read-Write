# Read/Write for GraphQL developers

Strategies for using Read/Write coming from a GraphQL background.

### What is Read/Write? 

Read/Write is a javascript library for interacting with 
self-replicating NoSQL databases. Initially version 1 has full 
support for Firestore. 

Version 2 will allow for LevelDB as well. LevelDB powers many apps 
including VSCode & Slack. LevelDB or forks of LevelDB powers much of
Web3 & blockchain. Most mining/validator clients including Bitcoin,
Ether, Solana, Avalanche and Near use store and read blocks using 
LevelDB.

### Does NoSQL mean NoRelationships?

No. All data has relationships. NoSQL models data relationships differently. 
The real different is 
**NoSQL scales with GigaBytes. MySQL scales with GigaHertz**.

_RDBMSs_ (MySQL being the most prominent) were built in an era of
Morse's Law. CPU doubled every 18 months. Data was _normalized_ with 
hard-coded relationships. When the database was put on a machine with 
more GigaHertz, the queries got faster. You just waited 18 months for a 
new CPU and bought a beefier machine. Upgrading the machine is called 
`vertical scaling`. 

_NoSQL_ allows relationships to be fluid instead of fixed.
_Demoralization_ of data allows data to be spread over multiple storage 
locations. As the amount of data grows, data is sharded across 
more machines to increase query speed. Adding more machines to 
speed up queries is called `horizontal scaling`.


---

- [At a glance](#at-a-glance)
- [Sample Code](#sample-code)
  - [Reads / Queries](#reads)
  - [Writes / Mutations](#writes)
  - [Subscriptions](#subscriptions)
- [Further Details](#further-details)
- [Modeling Relationships in NoSQL (coming soon)](./modeling-nosql.md)
---

## At a glance

Read/Write and Apollo's GraphQL client both supports the same feature
set. Read/Write attempts to do the really hard work of simplifying 
through multiple design reduction passes to come out with a power 
API that robust for real-world code but easy to use. This is an 
at a glance comparison of how to implement a feature is both libraries.

| Feature | GraphQL w/ Apollo client | Read/Write |
| -- | -- | -- |
| Reads: Load data | Pass a template string into `useQuery` | Pass a json into `useRead` |
| Reads: NetworkStates | `useQuery` add in `notifyOnNetworkStatusChange` variable | None. Data is synchronous once loaded from local IndexDb, IndexDB replicates from global NoSQL. |
| Reads: Error States | use error state from the `useQuery` | use a normal Error Boundary |
| Reads: Loading State | `useQuery` returns a `{loading}` object  | `useRead` returns undefined |
| Writes: Update data | Pass a template string into `useMutation` which returns a function to trigger | `createMutate` returns a Redux action function  |
| Writes: Optimistically update cache | `useMutation` use the `update` function to modify the cache | **Free**. `createMutate` synchronously updates data optimistically |
| Writes: Optimistically update UI | `useMutation` use the `update` function to modify the cache then create temporary UI | **Free**. `createMutate` synchronously updates data optimistically  |
| Writes: Persistence confirmation | `useMutation` return `{onCompleted}` variable with the results of the last mutation | `createMutate` action creator returns a promise. |
| Reads: Refetch queries after update | `useMutation` add `refetchQueries` as which queries need to be updated | **Free**. `createMutate` synchronously updates data optimistically |
| Reads: Polling | `useQuery` add the `pollInterval` property  | **Free**. `useRead` automatically subscribes for global changes. |
| Reads: Refetching | `useQuery` pull out the `{refetch}` function to call manually. | **Free**. `useRead` rerenders when data changes. |
| Reads: Subscriptions | install `graphql-ws` library, create `GraphQLWsLink` client, provide link chain (and auth) to server, write subscription query, use the `useSubscription` hook to start subscribing, write manual code to subscribe for new updates. | **Free**. `useRead` automatically subscribes for global changes. |

---

## Sample Code

## Reads

**GraphQL**: `useQuery` Reads in GraphQL requires template string on 
what data to fetch. Then catch any error and loading states.

**Read/Write**: `useRead` Reads fetch single documents or queries a 
single document type using vanilla JSON (w/ Typescript definition hints in the IDE). Error states use a normal Error Boundary component. 
Loading as well is a high order component to show loading, if needed.
For details read the [useRead docs](./read.md) or the 
[deep-dive docs(coming soon)](./deep-dive.md).

<table>
  <tr>
    <td>GraphQL</td>
    <td>Read/Write</td>
  </tr>
  <tr><td>
    
```ts
import { gql, useQuery } from '@apollo/client';

const GET_DOGS = gql`
  query GetDogs {
    dogs {
      id
      breed
    }
  }
`;

function Dogs() {
  const { loading, error, data } = useQuery(GET_DOGS);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <select name="dog">
      {data.dogs.map(dog => (
        <option key={dog.id} value={dog.breed}>
          {dog.breed}
        </option>
      ))}
    </select>
  );
}
```

  </td>
  <td>
  
```ts
import { useRead } from 'read-write';

function Dogs() {
  const dogs = useRead({path: 'dogs'});
  if (dogs === undefined) return null; // is loading
  // errors will throw to be caught in an error boundary

  return (
    <select name="dog">
      {dogs.map(dog => (
        <option key={dog.id} value={dog.breed}>
          {dog.breed}
        </option>
      ))}
    </select>
  );
}
```
    
</td>
</tr>
</table>

---

## Writes

**GraphQL**: `useMutation` Creating a mutation is a multi-step process.
It includes a mutation query, specifying any affected queries, manually
updating any caches and creating temporary UI element for the mutation
in flight. 

**Read/Write**: `createMutate` Creates a standard Redux action. When
action dispatches any affected useRead app-wide renders synchronously.

Writing a mutation requires the name of the action, what data to read 
(either the payload or docs from the database) and a write
function that will change data in the database. Results are 
optimistically updated and the dispatch returns a promise when the
results are finally persisted, or rejected, in the database.
For details read the [createMutate docs](./write.md) or the 
[deep-dive docs(coming soon)](./deep-dive.md).


<table>
  <tr>
    <td>GraphQL</td>
    <td>Read/Write</td>
  </tr>
  
<tr>
<td>

```ts
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_DOGS = gql`
  query GetDogs {
    dogs {
      id
      breed
    }
  }
`;

const ADD_DOG = gql`
  mutation AddDog($breed: String!) {
    addDog(breed: $text) {
      id
      breed
    }
  }
`;

function AddDog() {
  let input;
  const [addDog] = useMutation(ADD_TODO, {
    // Refetches two queries after mutation completes
    refetchQueries: [
      GET_DOGS, // DocumentNode object parsed with gql
      'GetDogs' // Query name
    ],
    onQueryUpdated(observableQuery) {
      // Define any custom logic for determining whether to refetch
      if (shouldRefetchQuery(observableQuery)) {
        return observableQuery.refetch();
      }
    },
    update(cache, { data: { addDog } }) {
      cache.modify({
        fields: {
          dogs(existingDogs = []) {
            const newDogRef = cache.writeFragment({
              data: addDog,
              fragment: gql`
                fragment NewDog on Dog {
                  id
                  breed
                }
              `
            });
            return [...existingDogs, newDogRef];
          }
        }
      });
    }
  });

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          addDog(
            { variables: { type: input.value } },
            onQueryUpdated(observableQuery) {
              // Define any custom logic for determining whether to refetch
              if (shouldRefetchQuery(observableQuery)) {
                return observableQuery.refetch();
              }
            });
          input.value = "";
        }}
      >
        <input
          ref={node => {
            input = node;
          }}
        />
        <button type="submit">Add Dog</button>
      </form>
    </div>
  );
}

function Dogs() {
  const { loading, error, data } = useQuery(GET_DOGS);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <select name="dog">
      {data.dogs.map(dog => (
        <option key={dog.id} value={dog.breed}>
          {dog.breed}
        </option>
      ))}
    </select>
  );
}
```
    
</td>

<td>
    
```ts
import { useRead, createMutate } from 'read-write';

const addDog = createMutate({
  name: 'addDog',
  read: ({breed}) => ({
    id: uuid(), 
    breed: () => breed
  }),
  write: ({id, breed}) => ({id, breed, path: 'dogs'})
});

function AddDog() {
  let input;
  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          addDog({ breed: input.value });
          input.value = "";
        }}
      >
        <input ref={node => { input = node; }} />
        <button type="submit">Add Dog</button>
      </form>
    </div>
  );
}

function Dogs() {
  // useRead hook synchronously triggers when new dog is added
  const dogs = useRead({path: 'dogs'});
  if (dogs === undefined) return null;

  return (
    <select name="dog">
      {dogs.map(dog => (
        <option key={dog.id} value={dog.breed}>
          {dog.breed}
        </option>
      ))}
    </select>
  );
}
```

  </td>

</tr>
  
</table>

---

## Subscriptions

**GraphQL**: `useSubscription` Reads with a subscription in GraphQL requires explicitly 
registering for each event and adding a special handler when the 
subscription triggers.

**Read/Write**: Nothing, useRead automatically subscribes to 
global changes. For details read the 
[deep-dive docs(coming soon)](./deep-dive.md)

<table>
  <tr>
    <td>GraphQL</td>
    <td>Read/Write</td>
  </tr>
  <tr>
    <td>

```ts
const GET_DOGS = gql`
  query GetDogs {
    dogs {
      id
      breed
    }
  }
`;

const DOGS_SUBSCRIPTION = gql`
  subscription OnDogAdded($dogID: ID!) {
    dogAdded(dogID: $dogID) {
      id
      breed
    }
  }
`;

function LatestDog({ dogID }) {
  const { data, loading } = useSubscription(
    DOGS_SUBSCRIPTION,
    { variables: { postID } }
  );
  return <h4>New dog: {!loading && data.dogAdded.content}</h4>;
}
function Dogs({ onDogSelected }) {
  const { subscribeToMore, loading, error, data } = useQuery(
    GET_DOGS,
    { variables: { dogID: params.dogID } }
  );

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <select 
      name="dog" 
      onChange={onDogSelected}>
        {data.dogs.map(dog => (
          <option key={dog.id} value={dog.breed}>
            {dog.breed}
          </option>
        ))}
      subscribeToNewComments={() =>
        subscribeToMore({
          document: COMMENTS_SUBSCRIPTION,
          variables: { dogID: params.dogID },
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev;
            const newDog = subscriptionData.data.dogAdded;

            return Object.assign({}, prev, {
              dog: {
                comments: [newFeedItem, ...prev.dog.breed]
              }
            });
          }
        })
      }
    </select>
  );
}
```
      
</td>

<td>
    
```ts
import { useRead } from 'read-write';

function Dogs({ onDogSelected }) {
  const dogs = useRead({path: 'dogs'});
  if (dogs === undefined) return null;

  return (
    <select name="dog" onChange={onDogSelected}>
      {dogs.map(dog => (
        <option key={dog.id} value={dog.breed}>
          {dog.breed}
        </option>
      ))}
    </select>
  );
}
```

</td>
</tr>
</table>

## Further Details

- [Apollo Client](https://www.apollographql.com/docs)
- [GraphQL](http://graphql.org/)
- [Firestore](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Read/Write](https://github.com/TARAAI/Read-Write/blob/main/docs/getting-started.md)

