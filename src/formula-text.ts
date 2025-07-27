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

  public toLatex() {
    return this.ranges.map((range) => range.toLatex()).join("");
  }

  public withContentChange(
    change: ContentChange,
    activeRanges: Set<string>
  ): FormulaLatexRanges {
    const newRanges: FormulaLatexRangeNode[] = [];

    const modifyRange = (
      range: FormulaLatexRangeNode,
      change: ContentChange | null,
      offset: number
    ): [FormulaLatexRangeNode[], ContentChange | null, number] => {
      if (change === null) {
        return [[range], null, offset + range.length];
      }

      if (range instanceof UnstyledRange) {
        if (change.to <= offset || offset + range.length <= change.from) {
          // Change is completely outside of this node's range
          return [[range], change, offset + range.length];
        }

        if (change.type === "delete") {
          console.log(
            "Deleting from",
            range.text,
            "at",
            change.from - offset,
            "to",
            change.to - offset
          );
          const left = range.text.substring(0, change.from - offset);
          const right = range.text.substring(change.to - offset);
          // TODO: Should check if the deletion is completely contained in this range
          return [
            [new UnstyledRange(left + right)],
            null,
            offset + range.length,
          ];
        } else {
          console.log("Inserting into", range.text, "at", change.from - offset);
          const left = range.text.substring(0, change.from - offset);
          const right = range.text.substring(change.from - offset);
          return [
            [new UnstyledRange(left + change.inserted + right)],
            null,
            offset + range.length,
          ];
        }
      } else {
        if (
          change.type === "insert" &&
          change.from === offset &&
          activeRanges.has(range.id) &&
          range.children.every(
            (child) =>
              child instanceof UnstyledRange || !activeRanges.has(child.id)
          )
        ) {
          console.log("Left edge of active range");
          // The change is an insert at the left edge of this styled range
          const leftChild = range.children[0];
          const endOffset =
            offset +
            range.children.reduce((acc, child) => acc + child.length, 0);
          if (leftChild instanceof UnstyledRange) {
            // If the left child is already an unstyled range, we can just modify it
            const newChild = new UnstyledRange(
              change.inserted + leftChild.text
            );
            return [
              [
                new StyledRange(
                  range.id,
                  range.left,
                  [newChild, ...range.children.slice(1)],
                  range.right,
                  range.hints
                ),
              ],
              null,
              endOffset,
            ];
          } else {
            // Otherwise, we need to add a new unstyled range to the left of the left child
            const newChild = new UnstyledRange(change.inserted);
            return [
              [
                new StyledRange(
                  range.id,
                  range.left,
                  [newChild, ...range.children],
                  range.right,
                  range.hints
                ),
              ],
              null,
              endOffset,
            ];
          }
        } else if (
          change.type === "insert" &&
          change.from === offset &&
          !activeRanges.has(range.id)
        ) {
          // Left edge of inactive range
          return [
            [new UnstyledRange(change.inserted), range],
            null,
            offset +
              range.children.reduce((acc, child) => acc + child.length, 0),
          ];
        }

        // Recurse into StyledRange children
        const newChildren: FormulaLatexRangeNode[] = [];
        for (const child of range.children) {
          const [newChild, newChange, newOffset] = modifyRange(
            child,
            change,
            offset
          );
          newChildren.push(...newChild);
          offset = newOffset;
          change = newChange;
        }

        if (
          change !== null &&
          change.type === "insert" &&
          change.from === offset &&
          activeRanges.has(range.id) &&
          range.children.every(
            (child) =>
              child instanceof UnstyledRange || !activeRanges.has(child.id)
          )
        ) {
          console.log("Right edge of active range");
          // The change is an insert at the right edge of this styled range
          const rightChild = range.children[range.children.length - 1];
          if (rightChild instanceof UnstyledRange) {
            // If the right child is already an unstyled range, we can just modify it
            const newChild = new UnstyledRange(
              rightChild.text + change.inserted
            );
            return [
              [
                new StyledRange(
                  range.id,
                  range.left,
                  [...range.children.slice(0, -1), newChild],
                  range.right,
                  range.hints
                ),
              ],
              null,
              offset,
            ];
          } else {
            // Otherwise, we need to add a new unstyled range to the right of the right child
            const newChild = new UnstyledRange(change.inserted);
            return [
              [
                new StyledRange(
                  range.id,
                  range.left,
                  [...range.children, newChild],
                  range.right,
                  range.hints
                ),
              ],
              null,
              offset,
            ];
          }
        }
        return [
          [
            new StyledRange(
              range.id,
              range.left,
              newChildren,
              range.right,
              range.hints
            ),
          ],
          updatedChange,
          offset,
        ];
      }
    };

    let offset = 0;
    let updatedChange: ContentChange | null = change;
    for (const range of this.ranges) {
      const [newRange, newChange, newOffset] = modifyRange(
        range,
        updatedChange,
        offset
      );
      offset = newOffset;
      updatedChange = newChange;
      newRanges.push(...newRange);
    }

    return new FormulaLatexRanges(newRanges);
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
      noMark?: boolean;
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
