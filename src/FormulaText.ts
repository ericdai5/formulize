export type FormulaLatexRangeNode = StyledRange | UnstyledRange;

export type ContentChange =
  | {
      type: "delete";
      from: number;
      to: number;
    }
  | {
      type: "insert";
      from: number;
      to: number;
      inserted: string;
    };

export class FormulaLatexRanges {
  constructor(public ranges: FormulaLatexRangeNode[]) {
    this.ranges = this.combineUnstyledRanges(ranges);
  }

  private combineUnstyledRanges(
    ranges: FormulaLatexRangeNode[]
  ): FormulaLatexRangeNode[] {
    // Combine adjacent UnstyledRanges
    return ranges.reduce((acc, range) => {
      if (range instanceof StyledRange) {
        // Recurse into StyledRange children
        acc.push(
          new StyledRange(
            range.id,
            range.left,
            this.combineUnstyledRanges(range.children),
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
    }, [] as FormulaLatexRangeNode[]);
  }

  public getPositionRanges(
    position: number,
    includeEdges: boolean = false
  ): FormulaLatexRangeNode[] {
    const containingRanges: FormulaLatexRangeNode[] = [];

    const findPosition = (
      range: FormulaLatexRangeNode,
      offset: number,
      position: number
    ): [boolean, number] => {
      if (range instanceof UnstyledRange) {
        /*
        `offset` and `position` are measured at the _left_ of a character
        e.g. a|b c
              ^
              1
        Including edges means that for a given range,
            _____
        a b c d e f g
        
        We include the cursor positions at both edges
            _____
        a b|c|d|e|f g
           ^ ^ ^ ^

        Excluding edges means that we don't;
            _____
        a b c|d|e f g
             ^ ^  

        A range covering n characters includes (n+1) positions
        when including edges, and (n-1 positions when not.
      */
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
        const baseOffset = offset;
        let inChildren = false;
        for (const child of range.children) {
          const [found, newOffset] = findPosition(child, offset, position);
          offset = newOffset;
          inChildren ||= found;
        }
        if (inChildren) {
          containingRanges.push(range);
          return [true, offset];
        }

        // When not including edges, we might have skipped the position because
        // it's at the edge of a child range
        if (
          (position > baseOffset && position < offset) ||
          (includeEdges && (position === baseOffset || position === offset))
        ) {
          containingRanges.push(range);
          return [true, offset];
        } else {
          return [false, offset];
        }
      }
    };

    let offset = 0;
    for (const range of this.ranges) {
      const [_, newOffset] = findPosition(range, offset, position);
      offset = newOffset;
    }

    return containingRanges.reverse();
  }

  public applyContentChange(change: ContentChange): FormulaLatexRanges {
    return this;
  }
}

export class StyledRange {
  constructor(
    public id: string,
    public left: string,
    public children: FormulaLatexRangeNode[],
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

  public equals(other: FormulaLatexRangeNode) {
    return other instanceof StyledRange && this.id === other.id;
  }

  public toLatex(): string {
    return (
      this.left +
      this.children.map((child) => child.toLatex()).join("") +
      this.right
    );
  }
}

export class UnstyledRange {
  constructor(public text: string) {}

  public get length(): number {
    return this.text.length;
  }

  public equals(other: FormulaLatexRangeNode) {
    return other instanceof UnstyledRange && this.text === other.text;
  }

  public toLatex(): string {
    return this.text;
  }
}
