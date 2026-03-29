import {
  type JSXElement,
  createContext,
  createEffect,
  onCleanup,
  useContext,
} from "solid-js";

import { ReactiveSet } from "@solid-primitives/set";

import {
  ACTION_PRIORITY,
  KeybindAction,
  keybindFilter,
} from "./keybindActions";
import { DEFAULT_MAC_SEQUENCES, DEFAULT_SEQUENCES } from "./keybindSequences";

type KeybindContext = {
  createKeybind: (keybind: KeybindAction, callback: () => void) => void;
};

const keybindContext = createContext<KeybindContext>(null! as KeybindContext);

export function KeybindContext(props: { children: JSXElement }) {
  /**
   * Last event target, used for filtering
   */
  let target: HTMLElement | null;

  /**
   * Keep track of pressed keys to match sequences
   */
  const activeKeys = new ReactiveSet<string>();

  /**
   * Keep track of which keybinds are currently bound
   * to filter the firing keybindings list
   */
  const currentlyBound = ACTION_PRIORITY.reduce(
    (d, k) => ({ ...d, [k]: 0 }),
    {} as Record<KeybindAction, number>,
  );

  /**
   * Sequences for use
   */
  const sequences = navigator.platform.startsWith("Mac")
    ? DEFAULT_MAC_SEQUENCES
    : DEFAULT_SEQUENCES;

  /**
   * Get the currently firing keybind
   */
  function firing() {
    return (
      ACTION_PRIORITY
        // filter to those keybinds that are bound
        .filter((keybind) => currentlyBound[keybind])
        // apply custom filtering logic
        .filter((keybind) =>
          keybindFilter(keybind, activeKeys, currentlyBound, target),
        )
        // check whether the keybind is being pressed
        .filter((keybind) =>
          sequences[keybind].every((key) =>
            key instanceof RegExp
              ? [...activeKeys].findIndex((item) => key.test(item)) !== -1
              : activeKeys.has(key),
          ),
        )
        // return the highest priority keybind
        .shift()
    );
  }

  /**
   * Debug currently pressed sequences
   */
  if (import.meta.env.DEV) {
    createEffect(() =>
      console.debug(
        "[keybinds] Currently pressing",
        [...activeKeys],
        "which selects",
        ACTION_PRIORITY
          // filter to those keybinds that are bound
          .filter((keybind) => currentlyBound[keybind])
          // apply custom filtering logic
          .filter((keybind) =>
            keybindFilter(keybind, activeKeys, currentlyBound, target),
          )
          // check whether the keybind is being pressed
          .reduce(
            (d, keybind) => ({
              ...d,
              [keybind]: sequences[keybind].every((key) =>
                key instanceof RegExp
                  ? [...activeKeys].findIndex((item) => key.test(item)) !== -1
                  : activeKeys.has(key),
              ),
            }),
            {},
          ),
      ),
    );
  }

  /**
   * Check whether a given keybind fired
   * @param keybind Keybind
   */
  function isFired(keybind: KeybindAction) {
    return firing() === keybind;
  }

  /**
   * Handle key down event by adding it to active keys
   */
  function onKeyDown(event: KeyboardEvent) {
    target = event.target as HTMLElement;
    activeKeys.add(event.key);
  }

  /**
   * Handle key up event by removing it from active keys
   */
  function onKeyUp(event: KeyboardEvent) {
    target = event.target as HTMLElement;
    activeKeys.delete(event.key);
  }

  document.body.addEventListener("keydown", onKeyDown);
  document.body.addEventListener("keyup", onKeyUp);

  const keybindCallbacks = new Map<KeybindAction, ReadonlyArray<() => void>>();

  onCleanup(() => {
    document.body.removeEventListener("keydown", onKeyDown);
    document.body.removeEventListener("keyup", onKeyUp);
    keybindCallbacks.clear();
  });

  if(window.native?.onKeyInput) {
    window.native.onKeyInput(({ key, vkCode }, state) => {
      console.log(`Got native key ${JSON.stringify(key)} with state ${JSON.stringify(state)}`);

      for (const keybind in sequences) {
        if (sequences[keybind as KeybindAction].some(s => s === key || (typeof s !== 'string' && s?.test(key)))) {
          for (const callback of keybindCallbacks.get(keybind as KeybindAction) ?? []) {
            callback();
          }
        }
      }
    });
  }

  return (
    <keybindContext.Provider
      value={{
        createKeybind(keybind, callback) {
          currentlyBound[keybind]++;
          onCleanup(() => currentlyBound[keybind]--);

          const otherCbs = keybindCallbacks.get(keybind) ?? [];
          keybindCallbacks.set(keybind, [...otherCbs, callback]);

          onCleanup(() => {
            const cbs = keybindCallbacks.get(keybind);
            if(cbs) {
              keybindCallbacks.set(keybind, cbs.filter((cb) => cb !== callback));
            }
          })

          createEffect(() => {
            const _ = [...activeKeys]; // track dependency
            if (isFired(keybind)) {
              callback();
            }
          });
        },
      }}
    >
      {props.children}
    </keybindContext.Provider>
  );
}

/**
 * Wrapper for contextual createKeybind function
 * @param keybind Keybind
 * @param callback Callback
 */
export function createKeybind(keybind: KeybindAction, callback: () => void) {
  const { createKeybind } = useContext(keybindContext);
  createKeybind(keybind, callback);
}

/**
 * Declarative keybind component
 */
export function Keybind(props: {
  keybind: KeybindAction;
  onPressed: () => void;
}) {
  createEffect(() => createKeybind(props.keybind, props.onPressed));
  return null;
}
