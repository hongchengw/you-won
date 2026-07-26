// Tiny observable holding the current state. SPEC.md section 3.
// dispatch takes a pure transition from state.js and applies it.

export function createStore(initial) {
  let current = initial;
  let listeners = [];

  const getState = () => current;

  const dispatch = (transition) => {
    current = transition(current);
    listeners.forEach((listener) => listener(current));
    return current;
  };

  const subscribe = (listener) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((entry) => entry !== listener);
    };
  };

  return { getState, dispatch, subscribe };
}
