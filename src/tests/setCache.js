// import configureStore from 'redux-mock-store';

// export default setCache = (
//   {
//     firebaseAuth = {
//       isEmpty: true,
//       isLoaded: false,
//     },
//     firebaseProfile = {
//       isEmpty: true,
//       isLoaded: false,
//     },
//     ...aliases
//   },
//   middlewares = [],
// ) => {
//   const keys = Object.keys(aliases);

//   const normalizedDocuments = keys.reduce((obj, key) => {
//     const list = aliases[key];
//     const { path } = list[0];

//     list.forEach((item) => {
//       obj[list[0].path] = { [item.id]: item };
//     });

//     return obj;
//   }, {});

//   const initialState = {
//     firebase: {
//       auth: firebaseAuth,
//       profile: firebaseProfile,
//     },
//     firestore: {
//       cache: {
//         database: normalizedDocuments,
//         databaseOverrides: {},
//         ...keys.reduce(
//           (obj, alias) => ({
//             ...obj,
//             [alias]: {
//               ordered: aliases[alias].map(({ path, id }) => [path, id]),
//               path:
//                 (aliases[alias] &&
//                   aliases[alias][0] &&
//                   aliases[alias][0].path) ||
//                 'unset',
//               via: 'memory',
//             },
//           }),
//           {},
//         ),
//       },
//     },
//   };

//   const store = configureStore(middlewares);

//   return store(initialState);
// };
