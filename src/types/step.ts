export interface IHighlight {
  start: number;
  end: number;
}

export interface IStep {
  step: number;
  highlight: IHighlight;
  variables: Record<string, unknown>;
  stackTrace: string[];
  timestamp: number;
  viewVariables: Record<string, unknown>;
}
