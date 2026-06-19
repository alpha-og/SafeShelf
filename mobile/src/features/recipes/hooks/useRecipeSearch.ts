import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { clarifyRecipes, searchRecipes } from "../services/recipe";
import type { ClarificationField, RecipeItem } from "../services/recipe";

const DEBOUNCE_MS = 500;
const STORAGE_KEY = "recipe_search_state";

interface SearchState {
  searchText: string;
  selectedCategories: string[];
  selectedAreas: string[];
}

export type SearchStatus =
  | "idle"
  | "searching"
  | "clarifying"
  | "dismissed"
  | "error";

function loadSearchState(): SearchState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useRecipeSearch() {
  const queryClient = useQueryClient();
  const savedState = useRef<SearchState | null>(null);
  if (savedState.current === null) {
    savedState.current = loadSearchState();
  }

  const [searchText, _setSearchText] = useState(
    savedState.current?.searchText ?? "",
  );
  const [selectedCategories, _setSelectedCategories] = useState<string[]>(
    savedState.current?.selectedCategories ?? [],
  );
  const [selectedAreas, _setSelectedAreas] = useState<string[]>(
    savedState.current?.selectedAreas ?? [],
  );
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationField[]>(
    [],
  );
  const [clarifyError, setClarifyError] = useState<string | null>(null);
  const [clarifyResults, setClarifyResults] = useState<RecipeItem[] | null>(null);

  const searchedOnce = useRef(savedState.current !== null);

  const setSearchText = useCallback((value: string) => {
    searchedOnce.current = true;
    _setSearchText(value);
  }, []);

  const setSelectedCategories = useCallback((categories: string[]) => {
    searchedOnce.current = true;
    _setSelectedCategories(categories);
  }, []);

  const setSelectedAreas = useCallback((areas: string[]) => {
    searchedOnce.current = true;
    _setSelectedAreas(areas);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          searchText,
          selectedCategories,
          selectedAreas,
        } satisfies SearchState),
      );
    } catch {
      /* sessionStorage unavailable */
    }
  }, [searchText, selectedCategories, selectedAreas]);

  const debouncedSearchText = useDebounce(searchText, DEBOUNCE_MS);
  const debouncedCategories = useDebounce(selectedCategories, DEBOUNCE_MS);
  const debouncedAreas = useDebounce(selectedAreas, DEBOUNCE_MS);

  const hasFilters =
    debouncedSearchText.trim().length > 0 ||
    debouncedCategories.length > 0 ||
    debouncedAreas.length > 0;

  // Reset status and clear cached results when all filters are cleared
  useEffect(() => {
    if (!hasFilters) {
      setSearchStatus("idle");
      setClarifyError(null);
      queryClient.resetQueries({ queryKey: ["recipes"] });
    }
  }, [hasFilters, queryClient]);

  const query = useInfiniteQuery({
    queryKey: ["recipes", debouncedSearchText, debouncedCategories, debouncedAreas],
    queryFn: async ({ pageParam }) => {
      if (pageParam === 1) {
        setClarifyResults(null);
        setSearchStatus("searching");
      }
      const res = await searchRecipes(
        debouncedSearchText,
        debouncedCategories,
        debouncedAreas,
        pageParam,
      );

      if (res.status === "clarification_needed" && res.clarifications) {
        setSearchStatus("clarifying");
        setSessionId(res.session_id ?? null);
        setClarifications(res.clarifications);
      } else if (res.status === "rejected" || (!res.success && res.error)) {
        setSearchStatus("error");
      } else {
        setSearchStatus("idle");
      }

      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || lastPage.recipes.length === 0) return undefined;
      const loaded = lastPage.page * lastPage.page_size;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled:
      hasFilters && searchStatus !== "clarifying" && searchedOnce.current,
    staleTime: 30_000,
  });

  const clarifyMutation = useMutation({
    mutationFn: async (answers: Record<string, unknown>) => {
      if (!sessionId) throw new Error("No session");
      return clarifyRecipes(sessionId, answers);
    },
    onSuccess: (res) => {
      if (res.status === "clarification_needed" && res.clarifications) {
        setSessionId(res.session_id ?? null);
        setClarifications(res.clarifications);
      } else if (res.status === "results") {
        setClarifyResults(res.recipes);
        setSearchStatus("idle");
        setSessionId(null);
        setClarifications([]);
        setClarifyError(null);
      } else {
        setSearchStatus("error");
        setClarifyError(res.rejection_reason ?? res.error ?? "Search failed");
      }
    },
    onError: (err: Error) => {
      setSearchStatus("error");
      setClarifyError(err.message);
    },
  });

  const dismissClarifications = () => {
    setSearchStatus("dismissed");
    setClarifyResults(null);
    setSessionId(null);
    setClarifications([]);
  };

  const retrySearch = useCallback(() => {
    searchedOnce.current = true;
    setSearchStatus("idle");
    setClarifyError(null);
    if (hasFilters) {
      query.refetch();
    }
  }, [hasFilters, query]);

  const clearAll = useCallback(() => {
    _setSearchText("");
    _setSelectedCategories([]);
    _setSelectedAreas([]);
    setSearchStatus("idle");
    setClarifyResults(null);
    setSessionId(null);
    setClarifications([]);
    setClarifyError(null);
    queryClient.resetQueries({ queryKey: ["recipes"] });
  }, [queryClient]);

  const queryRecipes =
    query.data?.pages.flatMap((p) => {
      if (p.status === "clarification_needed" || p.status === "rejected")
        return [];
      return p.recipes;
    }) ?? [];
  const recipes = clarifyResults ?? queryRecipes;

  const result: RecipeSearchState = {
    searchText,
    setSearchText,
    selectedCategories,
    setSelectedCategories,
    selectedAreas,
    setSelectedAreas,
    recipes,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error:
      query.data?.pages[0]?.error ??
      (query.error ? (query.error as Error).message : null),
    rejected: query.data?.pages[0]?.rejected ?? false,
    rejectionReason: query.data?.pages[0]?.rejection_reason ?? null,
    hasFilters,
    clearAll,
    searchStatus,
    clarifications,
    clarifyLoading: clarifyMutation.isPending,
    clarifyError,
    submitClarification: clarifyMutation.mutate,
    dismissClarifications,
    retrySearch,
  };
  return result;
}

export interface RecipeSearchState {
  searchText: string;
  setSearchText: (value: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedAreas: string[];
  setSelectedAreas: (areas: string[]) => void;
  recipes: RecipeItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: string | null;
  rejected: boolean;
  rejectionReason: string | null;
  hasFilters: boolean;
  clearAll: () => void;
  searchStatus: SearchStatus;
  clarifications: ClarificationField[];
  clarifyLoading: boolean;
  clarifyError: string | null;
  submitClarification: (answers: Record<string, unknown>) => void;
  dismissClarifications: () => void;
  retrySearch: () => void;
}
