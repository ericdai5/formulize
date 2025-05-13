/**
 * Binding System for Formulize
 * 
 * This module handles component connections and provides a declarative way to
 * establish relationships between different components in the system.
 */

import { computationStore } from "../computation";
import { FormulizeVisualization } from "./Formulize";
import { runInAction } from "mobx";

/**
 * Direction of data flow within a binding
 */
export type BindingDirection = 'to-target' | 'bidirectional';

/**
 * Defines a component and property reference
 */
export interface ComponentPropertyRef {
  component: string;  // Component ID
  property: string;   // Property path
}

/**
 * Binding configuration
 */
export interface BindingConfig {
  source?: ComponentPropertyRef;
  target?: ComponentPropertyRef;
  variable?: string;  // Shorthand for binding to a formula variable
  direction?: BindingDirection;
  transform?: (value: any) => any;
  reverseTransform?: (value: any) => any;
  condition?: (context: any) => boolean;
}

/**
 * Defines a global binding between components
 */
export interface GlobalBinding {
  source: ComponentPropertyRef;
  target: ComponentPropertyRef;
  direction?: BindingDirection;
  transform?: (value: any) => any;
  reverseTransform?: (value: any) => any;
  condition?: (context: any) => boolean;
}

/**
 * Registry of component references
 */
export interface ComponentRegistry {
  [componentId: string]: {
    type: 'formula' | 'visualization' | 'control';
    properties: Record<string, any>;
    reference: any;
    setProperty?: (propertyPath: string, value: any) => void;
    getProperty?: (propertyPath: string) => any;
  };
}

/**
 * Main binding system class
 */
export class BindingSystem {
  private registry: ComponentRegistry = {};
  private globalBindings: GlobalBinding[] = [];
  private activeLocalBindings: Map<string, any> = new Map();

  /**
   * Register a component with the binding system
   */
  registerComponent(
    componentId: string, 
    type: 'formula' | 'visualization' | 'control',
    reference: any,
    properties: Record<string, any> = {},
    getProperty?: (propertyPath: string) => any,
    setProperty?: (propertyPath: string, value: any) => void
  ) {
    this.registry[componentId] = {
      type,
      properties,
      reference,
      getProperty,
      setProperty
    };
  }

  /**
   * Set global bindings from configuration
   */
  setGlobalBindings(bindings: GlobalBinding[]) {
    this.globalBindings = bindings;
    this.setupBindings();
  }

  /**
   * Register local binding from a component
   */
  registerLocalBinding(
    componentId: string,
    propertyPath: string,
    bindingConfig: BindingConfig
  ) {
    const key = `${componentId}.${propertyPath}`;
    this.activeLocalBindings.set(key, bindingConfig);
    
    // Local bindings take precedence, so apply immediately
    this.setupLocalBinding(componentId, propertyPath, bindingConfig);
  }

  /**
   * Setup all bindings
   */
  private setupBindings() {
    // First clear any existing connections
    // In a real implementation, we'd use a more sophisticated
    // approach to track and clean up specific connections
    
    // Set up global bindings
    this.globalBindings.forEach(binding => {
      this.setupGlobalBinding(binding);
    });
  }

  /**
   * Setup a global binding
   */
  private setupGlobalBinding(binding: GlobalBinding) {
    const { source, target, direction = 'bidirectional' } = binding;
    
    // Check if components exist
    if (!this.registry[source.component] || !this.registry[target.component]) {
      console.warn(`Binding failed: component not found`, { source, target });
      return;
    }

    // Check if local binding takes precedence
    const localBindingKey = `${target.component}.${target.property}`;
    if (this.activeLocalBindings.has(localBindingKey)) {
      // Local binding exists, skip global binding for this target
      console.log(`Local binding takes precedence for ${localBindingKey}`);
      return;
    }

    // Otherwise, proceed with establishing connection
    this.connectComponents(source, target, direction, binding.transform, binding.reverseTransform);
  }

  /**
   * Setup a local binding between components
   */
  private setupLocalBinding(
    componentId: string,
    propertyPath: string,
    bindingConfig: BindingConfig
  ) {
    const { source, target, variable, direction = 'bidirectional' } = bindingConfig;

    // If variable shorthand is used, convert to proper reference
    let sourceRef: ComponentPropertyRef;
    let targetRef: ComponentPropertyRef;

    if (variable) {
      // Find the formula component 
      const formulaId = Object.keys(this.registry).find(
        id => this.registry[id].type === 'formula'
      );

      if (!formulaId) {
        console.warn(`No formula component found for variable binding`);
        return;
      }

      console.log(`🔗 Setting up binding for variable ${variable} between ${componentId} and ${formulaId}`);

      // Variable shorthand maps to the formula component
      if (this.registry[componentId].type === 'visualization' || 
          this.registry[componentId].type === 'control') {
        // When defined inside visualization/control, the formula is the target
        sourceRef = { component: componentId, property: propertyPath };
        targetRef = { component: formulaId, property: variable };

        // For bidirectional binding, also set up formula-to-visualization binding
        if (direction === 'bidirectional') {
          // Store this binding for future reference
          const bindingKey = `${formulaId}.${variable}->${componentId}.${propertyPath}`;
          this.activeLocalBindings.set(bindingKey, {
            source: { component: formulaId, property: variable },
            target: { component: componentId, property: propertyPath },
            direction: 'to-target',
            transform: bindingConfig.reverseTransform,
            reverseTransform: bindingConfig.transform
          });
          
          console.log(`🔄 Created bidirectional binding: ${bindingKey}`);
        }
      } else {
        // When defined inside formula, the formula is the source
        sourceRef = { component: formulaId, property: variable };
        targetRef = { component: componentId, property: propertyPath };
      }
    } else if (source && target) {
      sourceRef = source;
      targetRef = target;
      
      // For explicit source and target, also track the binding
      const bindingKey = `${source.component}.${source.property}->${target.component}.${target.property}`;
      this.activeLocalBindings.set(bindingKey, bindingConfig);
      
      console.log(`🔗 Created explicit binding: ${bindingKey}`);
    } else {
      console.warn(`Invalid binding configuration`, bindingConfig);
      return;
    }

    // Connect the components
    this.connectComponents(
      sourceRef, 
      targetRef, 
      direction,
      bindingConfig.transform,
      bindingConfig.reverseTransform
    );
    
    // For bidirectional binding, immediately sync values from source to target
    const initialValue = this.getPropertyValue(sourceRef.component, sourceRef.property);
    console.log(`🔍 Initial value for binding: ${sourceRef.component}.${sourceRef.property} = ${initialValue}`);
    
    // Apply transform if specified
    const transformedValue = bindingConfig.transform ? 
      bindingConfig.transform(initialValue) : initialValue;
    
    // Set the value on the target
    this.setPropertyValue(targetRef.component, targetRef.property, transformedValue);
  }

  /**
   * Connect two components with binding relationship
   */
  private connectComponents(
    source: ComponentPropertyRef,
    target: ComponentPropertyRef,
    direction: BindingDirection,
    transform?: (value: any) => any,
    reverseTransform?: (value: any) => any
  ) {
    const sourceComponent = this.registry[source.component];
    const targetComponent = this.registry[target.component];

    if (!sourceComponent || !targetComponent) {
      console.warn(`Cannot connect components: not registered`, { source, target });
      return;
    }

    // Get initial value from source
    const initialValue = this.getPropertyValue(source.component, source.property);
    
    // Apply transform if specified
    const transformedValue = transform ? transform(initialValue) : initialValue;
    
    // Set initial value on target
    this.setPropertyValue(target.component, target.property, transformedValue);

    // In a real implementation, we would also set up observers for changes
    // to propagate changes between components
    console.log(`Connected ${source.component}.${source.property} → ${target.component}.${target.property}`);
    
    // For bidirectional binding, we'd also set up the reverse connection
    if (direction === 'bidirectional') {
      console.log(`Connected ${target.component}.${target.property} → ${source.component}.${source.property} (reverse)`);
    }
  }

  /**
   * Get property value from a component
   */
  private getPropertyValue(componentId: string, propertyPath: string): any {
    const component = this.registry[componentId];
    if (!component) return undefined;

    // Use component's getter if available
    if (component.getProperty) {
      return component.getProperty(propertyPath);
    }

    // Special handling for formula components (uses computation store)
    if (component.type === 'formula') {
      const varId = `var-${propertyPath}`;
      const variable = computationStore.variables.get(varId);
      return variable?.value;
    }

    // Default property access with path support
    return this.getNestedProperty(component.properties, propertyPath);
  }

  /**
   * Set property value on a component
   */
  private setPropertyValue(componentId: string, propertyPath: string, value: any): void {
    const component = this.registry[componentId];
    if (!component) return;

    // Use component's setter if available
    if (component.setProperty) {
      component.setProperty(propertyPath, value);
      return;
    }

    // Special handling for formula components (uses computation store)
    if (component.type === 'formula') {
      const varId = `var-${propertyPath}`;
      
      // Ensure we have a numeric value for computation
      let numericValue: number;
      if (typeof value === 'number') {
        numericValue = value;
      } else if (typeof value === 'string') {
        numericValue = parseFloat(value) || 0;
        console.log(`Converting string value "${value}" to number: ${numericValue}`);
      } else if (typeof value === 'boolean') {
        numericValue = value ? 1 : 0;
        console.log(`Converting boolean value ${value} to number: ${numericValue}`);
      } else {
        numericValue = 0;
        console.warn(`Unexpected value type: ${typeof value}, defaulting to 0`);
      }
      
      // Use runInAction to comply with MobX strict mode
      runInAction(() => {
        computationStore.setValue(varId, numericValue);
      });
      return;
    }

    // Default property setting with path support
    this.setNestedProperty(component.properties, propertyPath, value);
  }

  /**
   * Get a nested property using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      // Handle array indexing, e.g., "points[0].x"
      const match = part.match(/(\w+)\[(\d+)\]/);
      if (match) {
        const [_, arrayName, index] = match;
        if (!current[arrayName] || !Array.isArray(current[arrayName])) {
          return undefined;
        }
        current = current[arrayName][parseInt(index)];
      } else {
        if (current === undefined || current === null) {
          return undefined;
        }
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Set a nested property using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    const lastPart = parts.pop()!;
    let current = obj;
    
    for (const part of parts) {
      // Handle array indexing, e.g., "points[0].x"
      const match = part.match(/(\w+)\[(\d+)\]/);
      if (match) {
        const [_, arrayName, index] = match;
        if (!current[arrayName]) {
          current[arrayName] = [];
        }
        if (!current[arrayName][parseInt(index)]) {
          current[arrayName][parseInt(index)] = {};
        }
        current = current[arrayName][parseInt(index)];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    // Handle last part that might be an array index
    const match = lastPart.match(/(\w+)\[(\d+)\]/);
    if (match) {
      const [_, arrayName, index] = match;
      if (!current[arrayName]) {
        current[arrayName] = [];
      }
      current[arrayName][parseInt(index)] = value;
    } else {
      current[lastPart] = value;
    }
  }

  /**
   * Update a component property and propagate changes
   */
  updateProperty(componentId: string, propertyPath: string, value: any): void {
    // Wrap in runInAction for MobX strict mode compliance
    runInAction(() => {
      this.setPropertyValue(componentId, propertyPath, value);
      
      // In a real implementation, this would trigger the propagation
      // of changes to all bound components
      this.propagateChange(componentId, propertyPath, value);
    });
  }

  /**
   * Propagate changes to bound components
   */
  private propagateChange(sourceId: string, propertyPath: string, value: any): void {
    console.log(`Property changed: ${sourceId}.${propertyPath} = ${value}`);
    
    // Check if this property is the source for any bindings
    // First look for direct path matches
    const sourcePropertyPath = `${sourceId}.${propertyPath}`;
    
    // Find all bindings where this property is the source
    for (const [bindingKey, bindingConfig] of this.activeLocalBindings.entries()) {
      // Extract source and target from the binding
      let source: ComponentPropertyRef | undefined;
      let target: ComponentPropertyRef | undefined;
      let transform: ((value: any) => any) | undefined;
      
      if (bindingConfig.source && bindingConfig.target) {
        // This is an explicit binding config
        source = bindingConfig.source;
        target = bindingConfig.target;
        transform = bindingConfig.transform;
      } else if (bindingConfig.variable) {
        // This is a variable-based binding
        // Parse the binding key to get source and target
        const match = bindingKey.match(/([^.]+)\.([^->]+)->([^.]+)\.(.+)/);
        if (match) {
          source = { component: match[1], property: match[2] };
          target = { component: match[3], property: match[4] };
          transform = bindingConfig.transform;
        }
      }
      
      // Check if this source matches our changed property
      if (source && source.component === sourceId && source.property === propertyPath) {
        console.log(`🔄 Found binding to propagate: ${bindingKey}`);
        
        if (target) {
          // Apply transform if specified
          const transformedValue = transform ? transform(value) : value;
          
          // Update the target component
          console.log(`🔄 Propagating value to ${target.component}.${target.property}: ${transformedValue}`);
          this.setPropertyValue(target.component, target.property, transformedValue);
        }
      }
    }
    
    // Check for global bindings that match this source
    for (const binding of this.globalBindings) {
      if (binding.source.component === sourceId && binding.source.property === propertyPath) {
        // Apply transform if specified
        const transformedValue = binding.transform ? binding.transform(value) : value;
        
        // Update the target component
        console.log(`🔄 Propagating value via global binding to ${binding.target.component}.${binding.target.property}: ${transformedValue}`);
        this.setPropertyValue(binding.target.component, binding.target.property, transformedValue);
      }
    }
    
    // Special handling for formula variables - need to update dependent visualizations
    if (sourceId.includes('formula') && this.registry[sourceId]?.type === 'formula') {
      // Find all visualizations that might be connected to this formula variable
      Object.entries(this.registry)
        .filter(([id, component]) => component.type === 'visualization')
        .forEach(([vizId, _]) => {
          // Check if this visualization has a binding to this formula variable
          console.log(`🔍 Checking visualization ${vizId} for references to ${propertyPath}`);
          
          // This would update the visualization based on formula changes
          // (specific implementation would depend on visualization type)
        });
    }
  }

  /**
   * Process bindings from a visualization component
   */
  processVisualizationBindings(vizId: string, visualization: FormulizeVisualization): void {
    // Process any bindings in the visualization config
    if (visualization.type === 'plot2d') {
      const config = visualization.config;
      
      // Automatically bind x and y axis variables to formula variables
      if (config.xAxis && config.xAxis.variable) {
        this.registerLocalBinding(
          vizId,
          `xAxis.variable`,
          {
            variable: config.xAxis.variable,
            direction: 'bidirectional'
          }
        );
        
        console.log(`✅ Created binding from plot xAxis to formula variable ${config.xAxis.variable}`);
      }
      
      if (config.yAxis && config.yAxis.variable) {
        this.registerLocalBinding(
          vizId,
          `yAxis.variable`,
          {
            variable: config.yAxis.variable,
            direction: 'bidirectional'
          }
        );
        
        console.log(`✅ Created binding from plot yAxis to formula variable ${config.yAxis.variable}`);
      }
      
      // Process points with draggable config
      if (config.points) {
        config.points.forEach((point, index) => {
          if (point.draggable && point.draggable.bind) {
            this.registerLocalBinding(
              vizId,
              `points[${index}].x`,
              {
                variable: point.draggable.bind,
                direction: 'bidirectional',
                transform: point.draggable.transform
              }
            );
            
            console.log(`✅ Created binding from draggable point to formula variable ${point.draggable.bind}`);
          }
        });
      }
      
      // Process line draggable
      if (config.line?.draggable?.bind) {
        this.registerLocalBinding(
          vizId,
          'line.position',
          {
            variable: config.line.draggable.bind,
            direction: 'bidirectional',
            transform: config.line.draggable.transform
          }
        );
        
        console.log(`✅ Created binding from draggable line to formula variable ${config.line.draggable.bind}`);
      }
      
      // Create direct binding for click interactions
      // This ensures the plot click will update the corresponding formula variable
      if (config.xAxis && config.xAxis.variable) {
        computationStore.registerClickHandler(
          `plot2d-${vizId}`,
          (x: number) => {
            const varId = `var-${config.xAxis.variable}`;
            console.log(`📊 Plot clicked, setting ${config.xAxis.variable} = ${x}`);
            
            // Use runInAction to comply with MobX strict mode
            runInAction(() => {
              // First update the computation store
              computationStore.setValue(varId, x);
              
              // Then update through the binding system to ensure bidirectional propagation
              const formulaId = Object.keys(this.registry).find(
                id => this.registry[id].type === 'formula'
              );
              
              if (formulaId) {
                console.log(`📊 Propagating plot click value to formula: ${formulaId}.${config.xAxis.variable} = ${x}`);
                
                // Update formula variable using binding system
                this.updateProperty(formulaId, config.xAxis.variable, x);
                
                // Also check if we need to trigger any other bound visualizations
                this.propagateChange(formulaId, config.xAxis.variable, x);
              }
            });
          }
        );
        
        console.log(`✅ Registered click handler for plot to update ${config.xAxis.variable}`);
        
        // Also register a reaction to formula variable changes to update the plot
        // This completes the bidirectional binding
        const formulaId = Object.keys(this.registry).find(
          id => this.registry[id].type === 'formula'
        );
        
        if (formulaId) {
          const bindingKey = `${formulaId}.${config.xAxis.variable}->${vizId}.xAxis.variable`;
          console.log(`🔄 Registering bidirectional binding for plot: ${bindingKey}`);
          
          this.activeLocalBindings.set(bindingKey, {
            source: { component: formulaId, property: config.xAxis.variable },
            target: { component: vizId, property: 'xAxis.variable' },
            direction: 'to-target'
          });
        }
      }
    }
  }
}

// Create singleton instance
export const bindingSystem = new BindingSystem();