declare global {
  interface Window {
    fetch: {
      __modified?: boolean;
    } & typeof fetch;
  }
}

export {};