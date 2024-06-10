export type FormulaLatexRange = StyledRange | UnstyledRange;

export class StyledRange {
  constructor(
    public id: string,
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

  public equals(other: FormulaLatexRange) {
    return other instanceof StyledRange && this.id === other.id;
  }
}

export class UnstyledRange {
  constructor(public text: string) {}

  public get length(): number {
    return this.text.length;
  }

  public equals(other: FormulaLatexRange) {
    return other instanceof UnstyledRange && this.text === other.text;
  }
}

export const combineUnstyledRanges = (
  ranges: FormulaLatexRange[]
): FormulaLatexRange[] => {
  // Combine adjacent UnstyledRanges
  return ranges.reduce((acc, range) => {
    if (range instanceof StyledRange) {
      // Recurse into StyledRange children
      acc.push(
        new StyledRange(
          range.id,
          range.left,
          combineUnstyledRanges(range.children),
          range.right,
          range.hints
        )
      );
    } else if (
      acc.length > 0 &&
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

export const getPositionRanges = (
  ranges: FormulaLatexRange[],
  position: number,
  includeEdges: boolean = false
): FormulaLatexRange[] => {
  const containingRanges: FormulaLatexRange[] = [];
  const findPosition = (
    range: FormulaLatexRange,
    offset: number,
    position: number
  ): [boolean, number] => {
    if (range instanceof UnstyledRange) {
      if (
        (position > offset && position < offset + range.length) ||
        (includeEdges &&
          (position === offset || position === offset + range.length))
      ) {
        containingRanges.push(range);
        return [true, offset + range.length];
      } else {
        return [false, offset + range.length];
      }
    } else {
      for (const child of range.children) {
        const [found, newOffset] = findPosition(child, offset, position);
        offset = newOffset;
        if (found) {
          containingRanges.push(range);
          return [true, offset];
        }
      }
      return [false, offset];
    }
  };

  let offset = 0;
  for (const range of ranges) {
    const [found, newOffset] = findPosition(range, offset, position);
    offset = newOffset;
  }

  return containingRanges.reverse();
};
