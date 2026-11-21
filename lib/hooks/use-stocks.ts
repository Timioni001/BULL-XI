"use client";

import { useMemo } from "react";
import { getStocks, type Stock } from "@/lib/data";
import { useAsync } from "./use-async";

let cache: Stock[] | undefined;

async function load(): Promise<Stock[]> {
  const data = await getStocks();
  cache = data;
  return data;
}

/** All stocks, fetched once per session and shared. */
export function useStocks() {
  const state = useAsync(load, cache);
  const byId = useMemo(() => new Map((state.data ?? []).map((s) => [s.id, s])), [state.data]);
  return { ...state, byId };
}
