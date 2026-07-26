import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/scripts/store.js';
import { createState, claim, fail } from '../src/scripts/state.js';

describe('createStore', () => {
  it('exposes the initial state', () => {
    const store = createStore(createState());
    expect(store.getState()).toEqual(createState());
  });

  it('applies the dispatched transition', () => {
    const store = createStore(createState());
    store.dispatch(claim);
    expect(store.getState().screen).toBe('captcha');
  });

  it('fires subscribers on dispatch with the new state', () => {
    const store = createStore(createState());
    const seen = vi.fn();
    store.subscribe(seen);

    store.dispatch(claim);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenLastCalledWith(store.getState());
    expect(seen.mock.calls[0][0].screen).toBe('captcha');

    store.dispatch(fail);
    expect(seen).toHaveBeenCalledTimes(2);
    expect(seen.mock.calls[1][0].fails).toBe(1);
  });

  it('notifies every subscriber', () => {
    const store = createStore(createState());
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);

    store.dispatch(claim);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops delivery after unsubscribe', () => {
    const store = createStore(createState());
    const seen = vi.fn();
    const unsubscribe = store.subscribe(seen);

    store.dispatch(claim);
    unsubscribe();
    store.dispatch(fail);

    expect(seen).toHaveBeenCalledTimes(1);
    expect(store.getState().fails).toBe(1);
  });

  it('never mutates the state it holds', () => {
    const initial = createState();
    const store = createStore(initial);
    store.dispatch(claim);
    expect(initial).toEqual(createState());
    expect(store.getState()).not.toBe(initial);
  });
});
