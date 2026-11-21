"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

/** Run an async data call on mount. `retry()` runs it again. */
export function useAsync<T>(fn: () => Promise<T>, initial?: T): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>(initial !== undefined ? { status: "success", data: initial } : { status: "loading" });
  const [nonce, setNonce] = useState(0);
  const skip = initial !== undefined && nonce === 0;

  useEffect(() => {
    if (skip) return;
    let alive = true;
    fn().then(
      (data) => alive && setState({ status: "success", data }),
      (error: Error) => alive && setState({ status: "error", error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, skip]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  return { ...state, retry };
}
