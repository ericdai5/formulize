declare module "js-interpreter" {
  // Type for interpreter values (pseudo-objects)
  type InterpreterValue = unknown;

  // Type for interpreter object
  interface InterpreterObject {
    properties?: Record<string, InterpreterValue>;
    proto?: InterpreterObject;
    data?: any;
    class?: string;
  }

  // Type for stack frame
  interface StackFrame {
    node?: {
      type: string;
      start: number;
      end: number;
      name?: string;
      declarations?: Array<{ id?: { name: string } }>;
      operator?: string;
      left?: { name?: string; type?: string };
      right?: { type?: string };
      callee?: { name?: string; type?: string };
      arguments?: Array<unknown>;
      expression?: {
        type?: string;
        callee?: { name?: string; type?: string };
      };
    };
    scope?: {
      object: InterpreterObject;
      constructor: { name: string };
    };
    func?: {
      node?: {
        id?: { name: string };
      };
    };
    // Interpreter state properties
    doneCallee_?: boolean;
    func_?: unknown;
  }

  // Status enum for interpreter state
  enum Status {
    DONE = 0,
    STEP = 1,
    TASK = 2,
    ASYNC = 3,
  }

  // Main Interpreter class
  export default class Interpreter {
    // Constructor
    constructor(
      code: string | object,
      initFunc?: (
        interpreter: Interpreter,
        globalObject: InterpreterObject
      ) => void
    );

    // Core execution methods
    run(): boolean;
    step(): boolean;
    appendCode(code: string | object): void;

    // Status and state
    getStatus(): Status;
    value: InterpreterValue;

    // Stack manipulation
    getStateStack(): StackFrame[];
    getGlobalScope(): InterpreterObject;
    stateStack: StackFrame[];

    // Property manipulation
    getProperty(
      obj: InterpreterValue,
      name: InterpreterValue
    ): InterpreterValue;
    setProperty(
      obj: InterpreterValue,
      name: InterpreterValue,
      value: InterpreterValue,
      opt_descriptor?: object
    ): InterpreterObject | undefined;
    deleteProperty(obj: InterpreterValue, name: InterpreterValue): boolean;
    hasProperty(obj: InterpreterValue, name: InterpreterValue): boolean;

    // Object creation
    createObject(proto: InterpreterObject | null): InterpreterObject;
    createObjectProto(proto: InterpreterObject | null): InterpreterObject;
    createPrimitive(value: any): InterpreterValue;
    createNativeFunction(
      nativeFunc: (...args: any[]) => any,
      isConstructor?: boolean
    ): InterpreterObject;
    createAsyncFunction(asyncFunc: (...args: any[]) => any): InterpreterObject;

    // Type conversion
    nativeToPseudo(nativeObj: any, opt_cycles?: object): InterpreterValue;
    pseudoToNative(pseudoObj: InterpreterValue, opt_cycles?: object): any;

    // Built-in constructors
    OBJECT: InterpreterObject;
    OBJECT_PROTO: InterpreterObject;
    FUNCTION: InterpreterObject;
    FUNCTION_PROTO: InterpreterObject;
    ARRAY: InterpreterObject;
    ARRAY_PROTO: InterpreterObject;
    NUMBER: InterpreterObject;
    STRING: InterpreterObject;
    BOOLEAN: InterpreterObject;
    DATE: InterpreterObject;
    REGEXP: InterpreterObject;
    ERROR: InterpreterObject;
    NULL: InterpreterValue;
    UNDEFINED: InterpreterValue;
    NAN: InterpreterValue;
    TRUE: InterpreterValue;
    FALSE: InterpreterValue;

    // Global scope
    globalObject: InterpreterObject;
    globalScope: InterpreterObject;

    // AST
    ast: object;

    // Static properties
    static Status: typeof Status;

    // Custom properties (can be extended)
    _currentStepParams?: {
      pairs?: Array<[string, string]>;
    };
  }

  // Re-export Status enum and types
  export { Status };
  export type { InterpreterObject, StackFrame, InterpreterValue };
}
