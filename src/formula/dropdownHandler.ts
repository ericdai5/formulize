import { computationStore } from "../api/computation";
import { findVariableByElement } from "../api/variableProcessing";
import { getVariable } from "../util/computation-helpers";

export const dropdownHandler = (container: HTMLElement) => {
  if (!container) return;

  const dropdownElements = container.querySelectorAll(
    ".interactive-var-dropdown"
  );

  dropdownElements.forEach((element) => {
    // Find the variable using the improved matching function
    const variableMatch = findVariableByElement(element as HTMLElement);
    if (!variableMatch) {
      return;
    }

    const { varId } = variableMatch;
    const variable = getVariable(varId);
    if (!variable) {
      return;
    }

    // Get the available options from set, options, or map property
    let availableOptions: (string | number)[] = [];
    let isMapVariable = false;
    let keyVariable: string | null = null;

    if (variable.set) {
      availableOptions = variable.set;
    } else if (variable.options) {
      availableOptions = variable.options;
    } else if (variable.map) {
      // For map variables, the dropdown options are the values in the map
      availableOptions = Object.values(variable.map);
      isMapVariable = true;
      keyVariable = variable.key || null;
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
            if (isMapVariable && keyVariable && variable.map) {
              // For map variables, update the key variable first
              // This will automatically update the mapped variable via updateMappedVariables
              const mapEntry = Object.entries(variable.map).find(
                ([key, value]) => value === numericValue
              );
              if (mapEntry) {
                const keyValue =
                  typeof mapEntry[0] === "string"
                    ? parseFloat(mapEntry[0])
                    : mapEntry[0];
                if (!isNaN(keyValue)) {
                  computationStore.setValue(keyVariable, keyValue);
                  // The mapped variable (this variable) will be updated automatically
                }
              }
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
