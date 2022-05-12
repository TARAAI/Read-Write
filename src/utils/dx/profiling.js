/* eslint-disable prefer-template */
/* istanbul ignore file */

import noop from 'lodash/noop';
import debug from 'debug';

const info = debug('readwrite:profile');
if (info.enabled && debug.enabled('readwrite:cache')) {
  info(
    `Capturing Reducer & Firestore load times. 
See results with 'readwrite()'.`,
  );
}
let win;

try {
  // eslint-disable-next-line dot-notation
  const nodeRequire = module[`require`].bind(module);
  win = nodeRequire('perf_hooks');
} catch (e) {}

try {
  win = window;
} catch (e) {}

const perf = win && win.performance;
/**
 *
 * @param {*} marker
 * @param {*} isDone
 * @param context
 * @returns {Function}
 */
export function mark(marker, context = '') {
  if (
    !debug.enabled('readwrite:cache') ||
    !debug.enabled('readwrite:profile') ||
    !perf
  ) {
    return noop;
  }

  /* istanbul ignore next */
  try {
    const now = perf.now();
    const start = `::readwrite/${marker}-${now}`;
    perf.mark(start);
    if (context) {
      info(`${marker}.${context}`);
    }
    return () => {
      perf.measure(`::readwrite/${marker}`, start);
    };
  } catch (err) {
    // ensure timings never impact the user
    return noop;
  }
}
export default mark;
/**
 *
 * @param {*} marker
 * @returns
 */
export function resource(meta, stringify) {
  if (
    !debug.enabled('readwrite:cache') ||
    !debug.enabled('readwrite:profile') ||
    !perf
  ) {
    return noop;
  }

  /* istanbul ignore next */
  try {
    const now = perf.now();
    const marker = stringify(meta);
    let start = `::readwrite.load/${marker}-${now}`;
    perf.mark(start);
    return (count = '') => {
      if (!start) return;
      perf.measure(`::readwrite.load/${marker}.|${count}|`, start);
      start = null; // ensure only first load for each query
    };
  } catch (err) {
    // ensure timings never impact the user
    return noop;
  }
}

/* istanbul ignore next */
if (win) {
  win.readwriteStats = (force = false) => {
    if (
      !debug.enabled('readwrite:cache') ||
      !debug.enabled('readwrite:profile') ||
      !perf
    ) {
      if (force)
        debug.enable(typeof force === 'string' ? force : 'readwrite:*');
      return;
    }
    const getMarks = ({ name }) => name.indexOf('::readwrite/') === 0;
    const getLoads = ({ name }) => name.indexOf('::readwrite.load/') === 0;
    const duration = (stats, { duration, name }) => {
      if (stats[name]) {
        stats[name].push(duration);
      } else {
        // eslint-disable-next-line no-param-reassign
        stats[name] = [duration];
      }
      return stats;
    };
    const formatTime = (seconds) => {
      if (seconds < 1000) return seconds + 'ms';
      if (seconds < 1000 * 60) return (seconds / 1000).toFixed(3) + 's';
      return (seconds / (1000 * 60)).toFixed(3) + ' minutes';
    };

    const logStats = (grouped) => {
      console.group(`Read Write Profiling`);
      console.table(
        Object.keys(grouped)
          .map((name) => {
            const arr = grouped[name];
            const sum = arr.reduce((a, b) => a + b, 0);
            return {
              [name]: {
                mean: parseFloat((sum / arr.length).toFixed(2)),
                samples: arr.length,
                min: parseFloat(
                  arr.reduce((a, b) => (a < b ? a : b), arr[0]).toFixed(2),
                ),
                max: parseFloat(
                  arr.reduce((a, b) => (a > b ? a : b), arr[0]).toFixed(2),
                ),
                sum: parseFloat(sum.toFixed(2)),
              },
            };
          })
          .reduce((result, item) => ({ ...result, ...item })),
      );
      console.groupEnd();
    };

    const marks = performance
      .getEntriesByType('measure')
      .filter(getMarks)
      .reduce(duration, {});

    logStats(marks);

    const phases = (
      (last, phase) =>
      ({ startTime, duration, name }) => {
        if (last + 16 <= startTime) {
          phase++;
        }
        const item = {
          name,
          start: parseFloat(startTime.toFixed(2)),
          phase,
          duration: formatTime(parseFloat(duration.toFixed(2))),
          loaded: (/\|(\d+)\|/g.exec(name) || [0, 0])[1],
        };
        // eslint-disable-next-line no-param-reassign
        last = startTime;
        return item;
      }
    )(false, 0);

    const group = (arr, prop) =>
      arr.reduce((stats, { phase, name, start, duration, loaded }) => {
        if (!stats[phase]) {
          stats[phase] = {};
        }

        stats[phase][name] = { start, duration, loaded };
        return stats;
      }, {});

    const logPhases = (phases) => {
      let last = 0;
      console.group(`Firestore Collection Loads`);
      Object.keys(phases).forEach((key) => {
        const start = Object.values(phases[key]).reduce(
          (num, { start }) => Math.min(num, start),
          Number.MAX_VALUE,
        );

        console.group(`Phase ${key} +${Math.floor(start - last)}ms`);
        console.table(phases[key]);
        console.groupEnd();
        last = start;
      });
      console.groupEnd();
    };

    const loads = performance
      .getEntriesByType('measure')
      .filter(getLoads)
      .map(phases);

    logPhases(group(loads, 'phase'));
  };
}

if (!Object.size) {
  Object.size = (obj) => {
    let bytes = 0;

    const sizeOf = (obj) => {
      if (obj !== null && obj !== undefined) {
        // eslint-disable-next-line default-case
        switch (typeof obj) {
          case 'number':
            bytes += 8;
            break;
          case 'string':
            bytes += obj.length * 2;
            break;
          case 'boolean':
            bytes += 4;
            break;
          case 'object':
            const objClass = Object.prototype.toString.call(obj).slice(8, -1);
            if (objClass === 'Object' || objClass === 'Array') {
              // eslint-disable-next-line no-restricted-syntax
              for (const key in obj) {
                // eslint-disable-next-line no-continue,no-prototype-builtins
                if (!obj.hasOwnProperty(key)) continue;
                sizeOf(obj[key]);
              }
            } else bytes += obj.toString().length * 2;
            break;
        }
      }
      return bytes;
    };

    const formatByteSize = (total) => {
      if (total < 1024) return total + ' bytes';
      if (total < 1048576) return (total / 1024).toFixed(3) + ' KiB';
      if (total < 1073741824) return (total / 1048576).toFixed(3) + ' MiB';
      return (total / 1073741824).toFixed(3) + ' GiB';
    };

    return formatByteSize(sizeOf(obj));
  };
}
