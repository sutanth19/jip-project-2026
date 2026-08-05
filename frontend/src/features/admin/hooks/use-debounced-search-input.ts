import * as React from "react";

import type { AdminListQuery } from "@/features/admin/types/admin.types";
import {
  ADMIN_SEARCH_DEBOUNCE_MS,
  createDebouncedSearchApplier,
} from "@/features/admin/utils/debounced-search";

type UseDebouncedSearchInputOptions = {
  value: string | undefined;
  onChange: (patch: AdminListQuery) => void;
  debounceMs?: number;
};

export function useDebouncedSearchInput({
  value,
  onChange,
  debounceMs = ADMIN_SEARCH_DEBOUNCE_MS,
}: UseDebouncedSearchInputOptions) {
  const externalValue = value ?? "";
  const [searchState, setSearchState] = React.useState({
    externalValue,
    inputValue: externalValue,
  });
  const onChangeRef = React.useRef(onChange);
  const cancelPendingSearchRef = React.useRef<() => void>(() => undefined);

  if (searchState.externalValue !== externalValue) {
    setSearchState({
      externalValue,
      inputValue: externalValue,
    });
  }

  const searchInput = searchState.externalValue === externalValue ? searchState.inputValue : externalValue;

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    if (searchInput === externalValue) {
      return undefined;
    }

    const debouncer = createDebouncedSearchApplier((patch) => onChangeRef.current(patch), debounceMs);
    cancelPendingSearchRef.current = debouncer.cancel;
    debouncer.schedule(searchInput);

    return () => {
      debouncer.cancel();
      cancelPendingSearchRef.current = () => undefined;
    };
  }, [debounceMs, externalValue, searchInput]);

  const handleSearchInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setSearchState((current) => ({
      externalValue: current.externalValue,
      inputValue: nextValue,
    }));
  }, []);

  const resetSearchInput = React.useCallback(() => {
    cancelPendingSearchRef.current();
    setSearchState((current) => ({
      externalValue: current.externalValue,
      inputValue: "",
    }));
  }, []);

  return {
    searchInput,
    handleSearchInputChange,
    resetSearchInput,
  };
}
