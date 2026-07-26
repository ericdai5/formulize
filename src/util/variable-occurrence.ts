import { VAR_CLASSES } from "../internal/css-classes";
import type { IOccurence, IVariable } from "../types/variable";

export interface IVariableOccurrenceRef {
  varId: string;
  instance: number;
}

const matchesAnyRule = (
  rules: IOccurence[] | undefined,
  formulaId: string | undefined,
  instance: number
): boolean => {
  if (!rules || !formulaId) {
    return false;
  }
  return rules.some(
    (rule) =>
      rule.formula.includes(formulaId) && rule.instance.includes(instance)
  );
};

/**
 * Resolve the filter/denylist language for one variable occurrence.
 *
 * A missing filter preserves current all-occurrences behavior. A present
 * filter is an allowlist, and matching exclude rules always win.
 */
export const shouldAugmentVariableOccurrence = (
  variable: IVariable | undefined,
  formulaId: string | undefined,
  instance: number
): boolean => {
  if (!variable) {
    return false;
  }
  const passesFilter =
    variable.filter === undefined ||
    matchesAnyRule(variable.filter, formulaId, instance);
  const isExcluded = matchesAnyRule(variable.exclude, formulaId, instance);
  return passesFilter && !isExcluded;
};

export const getVariableInstanceClass = (instance: number): string =>
  `${VAR_CLASSES.INSTANCE}${instance}`;

export const getVariableOccurrenceInstance = (
  element: Element
): number | null => {
  for (const className of element.classList) {
    if (!className.startsWith(VAR_CLASSES.INSTANCE)) {
      continue;
    }
    const instance = Number(className.slice(VAR_CLASSES.INSTANCE.length));
    if (Number.isSafeInteger(instance) && instance > 0) {
      return instance;
    }
  }
  return null;
};

export const getVariableOccurrenceRef = (
  element: Element
): IVariableOccurrenceRef | null => {
  const varId = (element as HTMLElement).id;
  const instance = getVariableOccurrenceInstance(element);
  if (!varId || instance === null) {
    return null;
  }
  return { varId, instance };
};

export const getVariableOccurrenceElements = (
  container: ParentNode,
  varId: string
): HTMLElement[] => {
  const escapedId = CSS.escape(varId);
  return Array.from(container.querySelectorAll(`#${escapedId}`)).filter(
    (element) => getVariableOccurrenceInstance(element) !== null
  ) as HTMLElement[];
};

export const getVariableOccurrenceElement = (
  container: ParentNode,
  varId: string,
  instance: number
): HTMLElement | null => {
  const escapedId = CSS.escape(varId);
  const instanceClass = CSS.escape(getVariableInstanceClass(instance));
  return container.querySelector(
    `#${escapedId}.${instanceClass}`
  ) as HTMLElement | null;
};

export const getVariableElements = (
  container: ParentNode,
  varId: string
): HTMLElement[] =>
  getVariableOccurrenceElements(container, varId).filter((element) =>
    element.classList.contains(VAR_CLASSES.ALL)
  );

export const getVariableElement = (
  container: ParentNode,
  varId: string,
  instance: number
): HTMLElement | null => {
  const element = getVariableOccurrenceElement(container, varId, instance);
  return element?.classList.contains(VAR_CLASSES.ALL) ? element : null;
};

export const getVariableDimensionKey = (
  formulaId: string,
  varId: string,
  instance: number
): string => JSON.stringify([formulaId, varId, instance]);
