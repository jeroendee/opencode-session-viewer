import { createContext, useContext, type ReactNode } from 'react';

interface SearchContextValue {
  searchQuery: string;
}

const SearchContext = createContext<SearchContextValue | null>(null);

interface SearchProviderProps {
  children: ReactNode;
  searchQuery: string;
}

export function SearchProvider({ children, searchQuery }: SearchProviderProps) {
  return (
    <SearchContext.Provider value={{ searchQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
}

/**
 * Safe version that returns empty search query when used outside provider.
 * Use this for components that may be rendered both inside and outside search context.
 */
export function useSearchContextSafe(): SearchContextValue {
  const context = useContext(SearchContext);
  return context ?? { searchQuery: '' };
}
