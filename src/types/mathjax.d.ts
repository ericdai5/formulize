declare global {
  interface Window {
    MathJax: {
      tex2mmlPromise: (latex: string) => Promise<string>;
      tex2chtml: (latex: string) => any;
      startup: {
        pageReady: () => Promise<void>;
        defaultPageReady: () => Promise<void>;
        promise: Promise<unknown>;
        toMML: (node: any) => string;
      };
      loader: {
        load: string[];
      };
      tex: {
        packages: {
          "[+]": string[];
        };
      };
      typesetPromise?: () => Promise<void>;
      typeset?: (elements: HTMLElement[]) => void;
    };
  }
}

export {};
