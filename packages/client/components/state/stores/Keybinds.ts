// import {
//   KeyCombo,
//   KeyComboSequence,
//   KeybindAction,
//   KeybindActions,
//   KeybindSequence,
// } from "@revolt/keybinds";
import { State } from "..";

import { AbstractStore } from ".";
import { KeybindAction } from "@revolt/keybinds";

// /** utility to make writing the default keybinds easier, requires all `KeybindAction` values to be filled out */
// function keybindMap(
//   obj: Record<KeybindAction, string[]>,
// ): Record<KeybindAction, KeyComboSequence[]> {
//   const entries = Object.entries(obj) as [KeybindAction, string[]][];
//   const parsed = entries.map(([act, seqs]) => [
//     act,
//     seqs.map((seq) => KeybindSequence.parse(seq)),
//   ]);
//   return Object.fromEntries(parsed);
// }

// export const DEFAULT_VALUES: KeybindActions = keybindMap({
//   [KeybindAction.NavigateChannelUp]: ["Alt+ArrowUp"],
//   [KeybindAction.NavigateChannelDown]: ["Alt+ArrowDown"],
//   // temporary, Control+Alt+ArrowUp does not seem to work on chrome or firefox at the moment
//   [KeybindAction.NavigateServerUp]: ["Control+ArrowUp"],
//   [KeybindAction.NavigateServerDown]: ["Control+ArrowDown"],

//   [KeybindAction.AutoCompleteUp]: ["ArrowUp"],
//   [KeybindAction.AutoCompleteDown]: ["ArrowDown"],
//   [KeybindAction.AutoCompleteSelect]: ["Enter", "Tab"],

//   [KeybindAction.NavigatePreviousContext]: [], //["Escape"],
//   [KeybindAction.NavigatePreviousContextModal]: [],
//   [KeybindAction.NavigatePreviousContextSettings]: [],

//   [KeybindAction.InputForceSubmit]: ["Control+Enter"],
//   [KeybindAction.InputSubmit]: ["Enter"],
//   [KeybindAction.InputCancel]: [], // ["Escape"],

//   [KeybindAction.MessagingMarkChannelRead]: [], // ["Escape"],
//   [KeybindAction.MessagingScrollToBottom]: ["Escape"],
//   [KeybindAction.MessagingEditPreviousMessage]: ["ArrowUp"],

//   [KeybindAction.DeveloperToggleAllExperiments]: [],
// });

const KEYBIND_ACTION_KEY_PREFIX = 'keybindAction:' as const;

export type TypeKeybinds = {
  _phantom?: never;
} & Partial<Record<`${typeof KEYBIND_ACTION_KEY_PREFIX}${KeybindAction}`, KeyboardEvent["key"]>>;

export class Keybinds extends AbstractStore<"keybinds", TypeKeybinds> {
  /**
   * Construct store
   * @param state State
   */
  constructor(state: State) {
    super(state, "keybinds");
  }

  /**
   * Hydrate external context
   */
  hydrate(): void {
    /** nothing needs to be done */
  }

  /**
   * Generate default values
   */
  default() {
    return {};
  }

  /**
   * Validate the given data to see if it is compliant and return a compliant object
   */
  clean(_input: Partial<TypeKeybinds>): TypeKeybinds {
    const validated: TypeKeybinds = {};

    for(const key in _input) {
      let valid = false;

      if(key.startsWith(KEYBIND_ACTION_KEY_PREFIX)) {
        const keybindActionEnumVal = key.slice(KEYBIND_ACTION_KEY_PREFIX.length);

        valid = !!(KeybindAction[keybindActionEnumVal as keyof typeof KeybindAction] && _input[key as keyof TypeKeybinds]);
      }

      if(valid) {
        // TS keeps complaining about trying to assign to `validated` so we're having to do it this way...
        Object.assign(validated, {[key]: _input[key as keyof TypeKeybinds]});
      }
    }

    return validated;
  }

  setKeybind(keybind: KeybindAction, key: KeyboardEvent["key"]) {
    this.set(`${KEYBIND_ACTION_KEY_PREFIX}${keybind}`, key);
  }

  clearKeybind(keybind: KeybindAction) {
    const store = this.get();
    const key = `${KEYBIND_ACTION_KEY_PREFIX}${keybind}` as const;
    if(key in store) {
      this.set(key, undefined);
    }
  }

  getKeybind(keybind: KeybindAction): KeyboardEvent["key"] | null {
    return this.get()[`${KEYBIND_ACTION_KEY_PREFIX}${keybind}`] ?? null;
  }
  
  getAllKeybinds() {
    const binds: Partial<Record<KeybindAction, KeyboardEvent["key"]>> = {};
    
    const current = this.get();
    
    for(const key in current) {
      if(key.startsWith(KEYBIND_ACTION_KEY_PREFIX) && current[key as keyof TypeKeybinds]) {
        binds[key.slice(KEYBIND_ACTION_KEY_PREFIX.length) as KeybindAction] = current[key as keyof TypeKeybinds];
      }
    }
    
    return binds;
  }
}
