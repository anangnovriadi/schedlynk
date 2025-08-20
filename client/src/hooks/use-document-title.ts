import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | Scheduler-Lite` : 'Scheduler-Lite | Multi-Team Scheduling Platform';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}