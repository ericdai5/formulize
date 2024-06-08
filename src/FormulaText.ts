type FormulaLatexRange = StyledRange | UnstyledRange;

class StyledRange {
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

class UnstyledRange {
  constructor(public text: string) {}

  public get length(): number {
    return this.text.length;
  }
}
