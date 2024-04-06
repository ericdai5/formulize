import { toJS } from "mobx";

import {
  FormulaNode,
  formulaStore,
  IFormulaNode,
  ITransform,
  Transform,
} from "./store";

const getAttributeOrThrow = (node: Element, attribute: string) => {
  const value = node.getAttribute(attribute);
  if (value === null) {
    throw new Error(`Attribute ${attribute} not found on ${node.nodeName}`);
  }
  return value;
};

export const populateFormulaStore = (formula: string) => {
  const svg: SVGElement = MathJax.tex2svg(formula).querySelector("svg");
  console.log(svg);
  const defs = Array.from(svg.querySelectorAll("defs > *")).map((def) => ({
    id: def.id,
    d: getAttributeOrThrow(def, "d"),
  }));

  const viewBox = parseViewBox(getAttributeOrThrow(svg, "viewBox"));

  const contentNodes = svg.querySelectorAll(":scope > :not(defs)");
  if (contentNodes.length !== 1) {
    throw new Error("Expected exactly one non-defs child of the root svg");
  }
  const root = buildFormulaNode(contentNodes[0], "0");
  console.log(toJS(root));

  formulaStore.setDefs(defs);
  formulaStore.setRoot(root);
  formulaStore.viewBox.setViewBox(viewBox);
  formulaStore.dimensions.setDimensions(extractSVGSize(svg));
  // document.body.appendChild(svg);
};

const buildFormulaNode = (node: Element, id: string): IFormulaNode => {
  if (node instanceof SVGGElement) {
    const _children = Array.from(node.childNodes).map((child, i) =>
      buildFormulaNode(child as Element, `${id}.${i}`),
    );
    return FormulaNode.create({
      id: id,
      nodeType: node.nodeName,
      mmlNode: node.getAttribute("data-mml-node") ?? undefined,
      transform: extractTransform(node.transform.baseVal),
      _children,
    });
  } else if (node.nodeName === "use") {
    return FormulaNode.create({
      id: id,
      nodeType: node.nodeName,
      linkHref: getAttributeOrThrow(node, "xlink:href"),
    });
  }
  throw new Error("Unknown node type");
};

const extractTransform = (transformList: SVGTransformList) => {
  const transform: Partial<ITransform> = {};
  for (let i = 0; i < transformList.numberOfItems; i++) {
    const item = transformList.getItem(i);
    switch (item.type) {
      case SVGTransform.SVG_TRANSFORM_TRANSLATE:
        transform.translate = {
          x: item.matrix.e,
          y: item.matrix.f,
        };
        break;
      case SVGTransform.SVG_TRANSFORM_SCALE:
        transform.scale = {
          x: item.matrix.a,
          y: item.matrix.d,
        };
        break;
      default:
        throw new Error("Unknown transform type");
    }
  }
  return Transform.create(transform);
};

const parseViewBox = (viewBox: string) => {
  const [x, y, width, height] = viewBox.split(" ").map(parseFloat);
  return { x, y, width, height };
};

const extractSVGSize = (svg: SVGElement) => {
  const width = svg.width.baseVal.valueInSpecifiedUnits;
  const height = svg.height.baseVal.valueInSpecifiedUnits;
  const unit = SVGLengthUnit(svg.width.baseVal);
  return { width, height, unit };
};

const SVGLengthUnit = (length: SVGLength) => {
  switch (length.unitType) {
    case SVGLength.SVG_LENGTHTYPE_NUMBER:
      return "";
    case SVGLength.SVG_LENGTHTYPE_PERCENTAGE:
      return "%";
    case SVGLength.SVG_LENGTHTYPE_EMS:
      return "em";
    case SVGLength.SVG_LENGTHTYPE_EXS:
      return "ex";
    case SVGLength.SVG_LENGTHTYPE_PX:
      return "px";
    case SVGLength.SVG_LENGTHTYPE_CM:
      return "cm";
    case SVGLength.SVG_LENGTHTYPE_MM:
      return "mm";
    case SVGLength.SVG_LENGTHTYPE_IN:
      return "in";
    case SVGLength.SVG_LENGTHTYPE_PT:
      return "pt";
    case SVGLength.SVG_LENGTHTYPE_PC:
      return "pc";
    default:
      throw new Error("Unknown SVGLength unit type");
  }
};
