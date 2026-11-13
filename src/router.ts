import { useEffect, useState } from 'react';

const current = () => location.hash.slice(1) || '/';

export function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => setRoute(current());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (path: string) => {
  location.hash = path;
};
