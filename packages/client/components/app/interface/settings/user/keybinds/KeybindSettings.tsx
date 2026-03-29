import { KeybindAction } from "@revolt/keybinds";
import { useState } from "@revolt/state";
import { Button, Column, Row, TextField } from "@revolt/ui";
import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  onCleanup,
} from "solid-js";
import { styled } from "styled-system/jsx";

export function KeybindSettings() {
  const state = useState();
  const currentKeybinds = createMemo(
    () => state && state.keybinds.getAllKeybinds(),
  );

  const [currentlyEditedKeybind, setCurrentlyEditedKeybind] =
    createSignal<KeybindAction | null>(null);

  createEffect(() => {
    const action = currentlyEditedKeybind();

    const listener =
      action &&
      ((e: KeyboardEvent) => {
        state.keybinds.setKeybind(action, e.key);
        setCurrentlyEditedKeybind(null);
      });
    if (listener) {
      document.addEventListener("keydown", listener);
    }

    onCleanup(() => {
      if (listener) {
        document.removeEventListener("keydown", listener);
      }
    });
  });

  function handleStartEdit(ev: MouseEvent, action: KeybindAction) {
    setCurrentlyEditedKeybind(action);

    const target = ev.target as HTMLElement;
    if (target) {
      target.focus();
    }

    const listener = () => {
      target?.blur?.();
      document.removeEventListener("keydown", listener);
    };
    document.addEventListener("keydown", listener);

    ev.preventDefault();
    ev.stopPropagation();
  }

  return (
    <Column>
      <Index each={Object.values(KeybindAction)}>
        {(keybindAction) => (
          <Row>
            <Column>
              <TextField
                label={"Action"}
                disabled={true}
                value={keybindAction()}
              />
            </Column>
            <Column>
              <KeyBindingContainer>
                <TextField
                  readonly
                  onBlur={() => setCurrentlyEditedKeybind(null)}
                  onClick={(ev) => handleStartEdit(ev, keybindAction())}
                  type={"text"}
                  label={"Binding"}
                  value={currentKeybinds()[keybindAction()] ?? ""}
                />
                <div style={state.keybinds.getKeybind(keybindAction()) ? {} : {visibility: "hidden", "pointer-events": "none"}}>
                  <Button
                    isDisabled={!state.keybinds.getKeybind(keybindAction())}
                    onPress={() => state.keybinds.clearKeybind(keybindAction())}
                    variant={"_error"}
                  >
                    Clear
                  </Button>
                </div>
              </KeyBindingContainer>
            </Column>
          </Row>
        )}
      </Index>
    </Column>
  );
}

const KeyBindingContainer = styled("div", {
  base: {
    display: "grid",
    gridTemplate: `"input delete" auto / minmax(auto, 100%) auto`,
    alignItems: "center",
    gap: "0.5em",
  },
});
