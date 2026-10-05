"use client";

import { useRef, useState, type ChangeEvent, type CompositionEvent } from "react";

type Options = {
  clean: (raw: string) => string;
  initial?: string;
  onTyped?: (cleaned: string) => void;
};

export function useSanitizedField({ clean, initial = "", onTyped }: Options) {
  const [raw, setRaw] = useState(initial);
  const composing = useRef(false);

  const accept = (typed: string, keepRaw: boolean) => {
    setRaw(keepRaw ? typed : clean(typed));
    onTyped?.(clean(typed));
  };

  return {
    value: clean(raw),
    setValue: (next: string) => setRaw(clean(next)),
    inputProps: {
      value: raw,
      onChange: (event: ChangeEvent<HTMLInputElement>) => accept(event.target.value, composing.current),
      onCompositionStart: () => {
        composing.current = true;
      },
      onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => {
        composing.current = false;
        accept(event.currentTarget.value, false);
      },
      onBlur: () => {
        composing.current = false;
        setRaw((current) => clean(current));
      },
    },
  };
}
