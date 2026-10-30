/**
 * MiseEnPlace (frontend) — Hook useApi : appelle une fonction de api.js avec
 * useEffect et garde `data`, `error` et `loading` dans des états (useState).
 */

import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from './api.js';

export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false; // ignore une réponse arrivée après un changement de filtre
    setLoading(true);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  return { data, error, loading, reload };
}

// Valeur « retardée » : évite un appel au serveur à chaque lettre tapée.
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Vrai quand la fenêtre correspond à la requête CSS (ex. « (min-width: 768px) »).
export function useMediaQuery(query) {
  const getMatch = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Devient vrai seulement si `flag` reste vrai plus de `delay` ms : évite qu'un indicateur
// « chargement » clignote quand la réponse du serveur arrive tout de suite.
export function useDelayedFlag(flag, delay = 350) {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!flag) {
      setDelayed(false);
      return undefined;
    }
    const timer = setTimeout(() => setDelayed(true), delay);
    return () => clearTimeout(timer);
  }, [flag, delay]);
  return delayed;
}
