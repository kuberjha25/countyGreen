import { useCallback, useState } from "react";

import { useAppDispatch } from "@/src/store";

// Runs a thunk and tracks its pending state for a button:
//   const [save, saving] = useRun();  await save(createLead(body))  → payload, or throws the API error.
export function useRun() {
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async <R>(action: any): Promise<R> => {
      setPending(true);
      try {
        return (await dispatch(action).unwrap()) as R;
      } finally {
        setPending(false);
      }
    },
    [dispatch],
  );
  return [run, pending] as const;
}
