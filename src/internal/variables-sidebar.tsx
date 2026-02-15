import React, { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { Plus, Trash2, X } from "lucide-react";

import { useStore } from "../core/hooks";
import { debugStore } from "../store/debug";
import {
  IInput,
  INPUT_VARIABLE_DEFAULT,
  IVariable,
  IVariableUserInput,
} from "../types/variable";
import Modal from "../ui/modal";

/**
 * Serialize a single variable to user-facing format, omitting default values.
 * Returns the simplest representation: number for constants, object for complex variables.
 */
function serializeVariable(
  variable: IVariable
): number | IVariableUserInput | null {
  const hasInput = variable.input !== undefined;

  // Check if there are any non-default properties that require an object format
  const hasName = !!variable.name;
  const hasPrecision = variable.precision !== INPUT_VARIABLE_DEFAULT.PRECISION;
  const hasStep = variable.step !== undefined;
  const hasNonDefaultRange =
    variable.range &&
    (variable.range[0] !== INPUT_VARIABLE_DEFAULT.MIN_VALUE ||
      variable.range[1] !== INPUT_VARIABLE_DEFAULT.MAX_VALUE);

  // For non-input variables, check if we need an object format
  if (!hasInput) {
    // If no special properties, just return the number value
    if (!hasName && !hasPrecision && !hasStep) {
      if (typeof variable.value === "number") {
        return variable.value;
      }
      return null;
    }

    // Need object format for non-input variable with special properties
    const result: IVariableUserInput = {};
    if (typeof variable.value === "number") {
      result.default = variable.value;
    }
    if (hasName) result.name = variable.name;
    if (hasPrecision) result.precision = variable.precision;
    if (hasStep) result.step = variable.step;
    return result;
  }

  // For input variables, build a user-facing object
  const result: IVariableUserInput = {
    input: variable.input,
  };

  // Only include non-default values
  if (
    typeof variable.value === "number" &&
    variable.value !== INPUT_VARIABLE_DEFAULT.VALUE
  ) {
    result.default = variable.value;
  }
  if (hasName) {
    result.name = variable.name;
  }
  if (hasNonDefaultRange) {
    result.range = variable.range;
  }
  if (hasPrecision) {
    result.precision = variable.precision;
  }
  if (hasStep) {
    result.step = variable.step;
  }
  return result;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 text-[11px] tracking-wide text-slate-500 mb-1">
    {children}
  </div>
);

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-1.5"
  >
    {label && <span className="text-[11px] text-slate-500">{label}</span>}
    <div
      className={`relative w-7 h-4 rounded-full transition-colors ${
        checked ? "bg-blue-500" : "bg-slate-300"
      }`}
    >
      <div
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-3.5" : "translate-x-0.5"
        }`}
      />
    </div>
  </button>
);

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  integer?: boolean;
  defaultValue?: number;
  showDefault?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  className = "w-full",
  integer = false,
  defaultValue,
  showDefault = false,
}) => {
  const [text, setText] = useState(String(value));
  const pendingValueRef = useRef<number | null>(null);

  const isDefault = defaultValue !== undefined && value === defaultValue;
  const showResetButton = showDefault && defaultValue !== undefined;

  useEffect(() => {
    // If we have a pending value that we just submitted, don't overwrite with stale external value
    if (pendingValueRef.current !== null) {
      if (value === pendingValueRef.current) {
        // Parent acknowledged our change, clear pending
        pendingValueRef.current = null;
      }
      // Don't update text - either waiting for parent or already have correct text
      return;
    }
    setText(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleFocus = () => {
    // Clear pending value when user focuses again (in case parent rejected the change)
    pendingValueRef.current = null;
  };

  const handleBlur = () => {
    const parsed = integer ? parseInt(text, 10) : parseFloat(text);
    if (!isNaN(parsed) && isFinite(parsed)) {
      // Store the value we're submitting to ignore stale re-renders
      pendingValueRef.current = parsed;
      onChange(parsed);
      setText(String(parsed));
    } else {
      setText(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleReset = () => {
    if (defaultValue !== undefined) {
      pendingValueRef.current = defaultValue;
      onChange(defaultValue);
      setText(String(defaultValue));
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 text-[13px] bg-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${showResetButton ? "pr-14" : ""}`}
      />
      {showResetButton && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleReset}
          className={`absolute right-1 top-1/2 -translate-y-1/2 text-[10px] tracking-wide px-1.5 py-0.5 rounded transition-colors ${
            isDefault
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-200 text-slate-500 hover:bg-slate-300"
          }`}
          title={isDefault ? "Using default" : "Reset to default"}
        >
          Default
        </button>
      )}
    </div>
  );
};

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  className = "w-full",
}) => {
  const [text, setText] = useState(value);
  const pendingValueRef = useRef<string | null>(null);

  useEffect(() => {
    // If we have a pending value that we just submitted, don't overwrite with stale external value
    if (pendingValueRef.current !== null) {
      if (value === pendingValueRef.current) {
        // Parent acknowledged our change, clear pending
        pendingValueRef.current = null;
      }
      // Don't update text - either waiting for parent or already have correct text
      return;
    }
    setText(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleFocus = () => {
    // Clear pending value when user focuses again (in case parent rejected the change)
    pendingValueRef.current = null;
  };

  const handleBlur = () => {
    // Store the value we're submitting to ignore stale re-renders
    pendingValueRef.current = text;
    onChange(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`px-2 py-1 text-xs bg-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
    />
  );
};

interface VariablesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VariableCardProps {
  varId: string;
  variable: IVariable;
  onValueChange: (value: number) => void;
  onNameChange: (name: string) => void;
  onInputChange: (input: IInput | undefined) => void;
  onRangeChange: (range: [number, number]) => void;
  onPrecisionChange: (precision: number | undefined) => void;
  onStepChange: (step: number | undefined) => void;
  onDelete: () => void;
}

const VariableCard: React.FC<VariableCardProps> = observer(
  ({
    varId,
    variable,
    onValueChange,
    onNameChange,
    onInputChange,
    onRangeChange,
    onPrecisionChange,
    onStepChange,
    onDelete,
  }) => {
    const value = typeof variable.value === "number" ? variable.value : 0;
    const name = variable.name || "";
    const range = variable.range || [-10, 10];
    const input = variable.input;
    const precision = variable.precision;
    const step = variable.step;

    const handleMouseEnter = () => {
      debugStore.setHoveredVariable(varId);
    };

    const handleMouseLeave = () => {
      debugStore.setHoveredVariable(null);
    };

    return (
      <div
        className="px-3 py-3 border-b border-slate-200"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Variable ID header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-medium text-slate-800">
            {varId}
          </span>
          <div className="flex items-center gap-2">
            <Toggle
              checked={input === "drag"}
              onChange={(checked) =>
                onInputChange(checked ? "drag" : undefined)
              }
              label="drag"
            />
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete variable"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Value */}
        <div className="mb-2">
          <Label>Value</Label>
          <NumberInput
            value={value}
            onChange={onValueChange}
            defaultValue={INPUT_VARIABLE_DEFAULT.VALUE}
            showDefault={!!input}
          />
        </div>

        {/* Name */}
        <div className="mb-2">
          <Label>Display Name</Label>
          <TextInput value={name} onChange={onNameChange} placeholder={varId} />
        </div>

        {/* Range (only for drag inputs) */}
        {input === "drag" && (
          <div className="mb-2">
            <Label>Range</Label>
            <div className="flex gap-2">
              <NumberInput
                value={range[0]}
                onChange={(val) => onRangeChange([val, range[1]])}
                className="w-1/2"
                defaultValue={INPUT_VARIABLE_DEFAULT.MIN_VALUE}
                showDefault
              />
              <NumberInput
                value={range[1]}
                onChange={(val) => onRangeChange([range[0], val])}
                className="w-1/2"
                defaultValue={INPUT_VARIABLE_DEFAULT.MAX_VALUE}
                showDefault
              />
            </div>
          </div>
        )}

        {/* Precision and Step */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Precision</Label>
            <NumberInput
              value={precision ?? INPUT_VARIABLE_DEFAULT.PRECISION}
              onChange={(val) => onPrecisionChange(val)}
              integer
              defaultValue={INPUT_VARIABLE_DEFAULT.PRECISION}
              showDefault
            />
          </div>
          <div className="flex-1">
            <Label>Step</Label>
            <NumberInput
              value={step ?? INPUT_VARIABLE_DEFAULT.STEP_SIZE}
              onChange={(val) => onStepChange(val)}
              defaultValue={INPUT_VARIABLE_DEFAULT.STEP_SIZE}
              showDefault
            />
          </div>
        </div>
      </div>
    );
  }
);

interface AddVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (varId: string) => void;
  existingVarIds: string[];
}

const AddVariableModal: React.FC<AddVariableModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingVarIds,
}) => {
  const [varId, setVarId] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVarId("");
      setError("");
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = varId.trim();

    // Validation
    if (!trimmedId) {
      setError("Variable ID is required");
      return;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedId)) {
      setError(
        "Must start with letter or underscore, contain only letters, numbers, underscores"
      );
      return;
    }

    if (existingVarIds.includes(trimmedId)) {
      setError("Variable already exists");
      return;
    }

    onAdd(trimmedId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Variable"
      maxWidth="max-w-xs"
      noBackdrop
    >
      <form onSubmit={handleSubmit} className="p-4">
        <div className="text-xs font-medium text-slate-700 mb-2">
          Variable ID
        </div>
        <input
          ref={inputRef}
          type="text"
          value={varId}
          onChange={(e) => {
            setVarId(e.target.value);
            setError("");
          }}
          placeholder="Enter variable latex here"
          className="w-full px-2 py-1.5 text-sm bg-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {error && <div className="text-[11px] text-red-500 mt-1">{error}</div>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
};

const VariablesSidebar: React.FC<VariablesSidebarProps> = observer(
  ({ isOpen, onClose }) => {
    const context = useStore();
    const computationStore = context?.computationStore;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Debounce ref to prevent duplicate calls from blur + badge click race condition
    const lastUpdateRef = useRef<{
      varId: string;
      key: string;
      time: number;
    } | null>(null);

    // Helper to update a variable property and notify debugStore
    const updateVariable = useCallback(
      (varId: string, updates: Partial<IVariable>) => {
        // Debounce: ignore duplicate updates to the same property within 100ms
        const updateKey = Object.keys(updates)[0];
        const now = Date.now();
        if (
          lastUpdateRef.current &&
          lastUpdateRef.current.varId === varId &&
          lastUpdateRef.current.key === updateKey &&
          now - lastUpdateRef.current.time < 100
        ) {
          return;
        }
        lastUpdateRef.current = { varId, key: updateKey, time: now };

        if (computationStore) {
          const variable = computationStore.variables.get(varId);
          if (variable) {
            const merged = { ...variable, ...updates };
            const serialized = serializeVariable(merged);
            if (serialized !== null) {
              debugStore.updateVariable(varId, serialized);
            }
          }
        }
      },
      [computationStore]
    );

    const handleValueChange = (varId: string, value: number) => {
      updateVariable(varId, { value });
    };

    const handleNameChange = (varId: string, name: string) => {
      updateVariable(varId, { name: name || undefined });
    };

    const handleRangeChange = (varId: string, range: [number, number]) => {
      updateVariable(varId, { range });
    };

    const handlePrecisionChange = (
      varId: string,
      precision: number | undefined
    ) => {
      updateVariable(varId, { precision });
    };

    const handleStepChange = (varId: string, step: number | undefined) => {
      updateVariable(varId, { step });
    };

    const handleInputChange = (varId: string, input: IInput | undefined) => {
      updateVariable(varId, { input });
    };

    const handleDelete = (varId: string) => {
      debugStore.deleteVariable(varId);
    };

    const handleAddVariable = (varId: string) => {
      debugStore.addVariable(varId, 0);
    };

    const variables = computationStore
      ? Array.from(computationStore.variables.entries())
      : [];

    return (
      <div
        className={`h-full bg-white flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-64 border-l border-slate-200" : "w-0"
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 min-w-64">
          <h3 className="text-base font-medium text-slate-900">Variables</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Add variable"
            >
              <Plus className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <AddVariableModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddVariable}
          existingVarIds={variables.map(([varId]) => varId)}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto min-w-64">
          {variables.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              No variables defined
            </div>
          ) : (
            variables.map(([varId, variable]) => (
              <VariableCard
                key={varId}
                varId={varId}
                variable={variable}
                onValueChange={(value) => handleValueChange(varId, value)}
                onNameChange={(name) => handleNameChange(varId, name)}
                onInputChange={(input) => handleInputChange(varId, input)}
                onRangeChange={(range) => handleRangeChange(varId, range)}
                onPrecisionChange={(precision) =>
                  handlePrecisionChange(varId, precision)
                }
                onStepChange={(step) => handleStepChange(varId, step)}
                onDelete={() => handleDelete(varId)}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);

export default VariablesSidebar;
