export type FormulaLatexRange = StyledRange | UnstyledRange;

export class StyledRange {
  constructor(
    public left: string,
    public children: FormulaLatexRange[],
    public right: string,
    public hints?: {
      color?: string;
      tooltip?: string;
    }
  ) {}

  public get length(): number {
    return (
      this.left.length +
      this.children.reduce((acc, child) => acc + child.length, 0) +
      this.right.length
    );
  }
}

export class UnstyledRange {
  constructor(public text: string) {}

  public get length(): number {
    return this.text.length;
  }
}

export const combineUnstyledRanges = (
  ranges: FormulaLatexRange[]
): FormulaLatexRange[] => {
  // Combine adjacent UnstyledRanges
  return ranges.reduce((acc, range) => {
    if (acc.length === 0) {
      // Initialize reduction
      return [range];
    } else if (range instanceof StyledRange) {
      // Recurse into StyledRange children
      acc.push(
        new StyledRange(
          range.left,
          combineUnstyledRanges(range.children),
          range.right,
          range.hints
        )
      );
    } else if (
      acc[acc.length - 1] instanceof UnstyledRange &&
      range instanceof UnstyledRange
    ) {
      // Combine adjacent UnstyledRanges
      acc[acc.length - 1] = new UnstyledRange(
        (acc[acc.length - 1] as UnstyledRange).text + range.text
      );
    } else {
      // Append the next range without combining
      acc.push(range);
    }
    return acc;
  }, [] as FormulaLatexRange[]);
};
