import { findVariableByElement } from "../../parse/variable";
import { ComputationStore } from "../../store/computation";
import { getVariable } from "../../util/computation-helpers";
import { VAR_SELECTORS } from "../css-classes";

export const dropdownHandler = (
  container: HTMLElement,
  computationStore: ComputationStore
) => {
  if (!container) return;

  const dropdownElements = container.querySelectorAll(VAR_SELECTORS.INPUT);

  dropdownElements.forEach((element) => {
    // Find the variable using the improved matching function
    const variableMatch = findVariableByElement(element as HTMLElement);
    if (!variableMatch) {
      return;
    }

    const { varId } = variableMatch;
    const variable = getVariable(varId, computationStore);
    if (!variable) {
      return;
    }

    // Get the available options from set or options property
    let availableOptions: (string | number)[] = [];
    let isKeyVariable = false;

    if (Array.isArray(variable.value)) {
      availableOptions = variable.value;
    } else if (variable.options) {
      availableOptions = variable.options;
    } else if (variable.key) {
      // For variables with a key, show options from the key variable's value array
      const keyVar = getVariable(variable.key, computationStore);
      if (keyVar && Array.isArray(keyVar.value)) {
        availableOptions = keyVar.value;
        isKeyVariable = true;
      }
    }

    if (availableOptions.length === 0) {
      return;
    }

    let activeDropdown: HTMLElement | null = null;

    const createDropdownMenu = (options: (string | number)[]): HTMLElement => {
      const menu = document.createElement("div");
      menu.className = "dropdown-menu";

      options.forEach((option) => {
        const optionElement = document.createElement("div");
        optionElement.className = "dropdown-option";
        optionElement.textContent = String(option);

        optionElement.addEventListener("click", (e) => {
          e.stopPropagation();
          const numericValue =
            typeof option === "number" ? option : parseFloat(String(option));

          if (!isNaN(numericValue)) {
            if (isKeyVariable && variable.key) {
              // For variables with a key, update the key variable first
              // This will automatically update the computed variable via updateIndexBasedVariables
              computationStore.setValue(variable.key, numericValue);
              // The computed variable (this variable) will be updated automatically
            } else {
              // For regular set/options variables, update directly
              computationStore.setValue(varId, numericValue);
            }
          }
          closeDropdown();
        });

        menu.appendChild(optionElement);
      });

      return menu;
    };

    const closeDropdown = () => {
      if (activeDropdown) {
        activeDropdown.remove();
        activeDropdown = null;
      }
    };

    const openDropdown = () => {
      // Close any existing dropdown first
      closeDropdown();

      const menu = createDropdownMenu(availableOptions);
      activeDropdown = menu;

      // Position the dropdown relative to the clicked element
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      menu.style.position = "absolute";
      menu.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
      menu.style.top = `${rect.bottom - containerRect.top + 20}px`;
      menu.style.minWidth = `${rect.width}px`;

      container.appendChild(menu);

      // Close dropdown when clicking outside
      const handleClickOutside = (e: Event) => {
        if (!menu.contains(e.target as Node) && e.target !== element) {
          closeDropdown();
          document.removeEventListener("click", handleClickOutside);
        }
      };

      document.addEventListener("click", handleClickOutside);
    };

    element.addEventListener("click", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      if (activeDropdown) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });
  });
};
