/**
 * Variable Linkage Tracking for Manual Engine
 *
 * This module handles tracking local variable assignments during interpreter execution
 * and matches them to corresponding computationStore variables based on linkage configuration.
 */
import { computationStore } from "../../computation";
import {
  JSInterpreter,
  StackFrame,
  collectVariablesFromStack,
} from "./interpreter";

export interface Linkage {
  [localVarName: string]: string;
}

export interface Assignment {
  localVar: string;
  storeVar: string;
  value: unknown;
  stepNum: number;
}

export class Connector {
  private static linkageMap: Linkage = {};
  private static assignments: Assignment[] = [];
  private static currentStepNum = 0;

  /**
   * Initialize the variable linkage tracker with the linkage configuration
   */
  static initialize(linkage: Linkage = {}): void {
    this.linkageMap = linkage;
    this.assignments = [];
    this.currentStepNum = 0;
  }

  /**
   * Update the current step number during execution
   */
  static updateStepNum(stepNum: number): void {
    this.currentStepNum = stepNum;
  }

  /**
   * Track variable assignments during interpreter execution
   */
  static trackAssignments(
    interpreter: JSInterpreter,
    stack: StackFrame[]
  ): Assignment[] {
    if (!interpreter || !stack || Object.keys(this.linkageMap).length === 0) {
      return [];
    }
    const currentAssignments: Assignment[] = [];
    // Get all local variables that we're tracking
    const localVars = Object.keys(this.linkageMap);
    const currentVars = collectVariablesFromStack(
      interpreter,
      stack,
      localVars
    );
    // Check each tracked variable for assignments
    for (const [localVarName, storeVarName] of Object.entries(
      this.linkageMap
    )) {
      const currentValue = currentVars[localVarName];
      if (currentValue !== undefined) {
        // Check if this is a new assignment (value changed from previous step)
        const lastAssignment = this.assignments
          .filter((a) => a.localVar === localVarName)
          .pop();
        if (!lastAssignment || lastAssignment.value !== currentValue) {
          const assignment: Assignment = {
            localVar: localVarName,
            storeVar: storeVarName,
            value: currentValue,
            stepNum: this.currentStepNum,
          };
          currentAssignments.push(assignment);
          this.assignments.push(assignment);
          // Update the computationStore variable if it's a numeric value
          if (typeof currentValue === "number") {
            computationStore.setValueInStepMode(storeVarName, currentValue);
          }
        }
      }
    }
    return currentAssignments;
  }

  /**
   * Get all assignments made during execution
   */
  static getAssignments(): Assignment[] {
    return [...this.assignments];
  }

  /**
   * Get assignments for a specific step
   */
  static getAssignmentsForStep(stepNumber: number): Assignment[] {
    return this.assignments.filter((a) => a.stepNum === stepNumber);
  }

  /**
   * Clear all tracked assignments
   */
  static clearAssignments(): void {
    this.assignments = [];
    this.currentStepNum = 0;
  }

  /**
   * Get the current linkage configuration
   */
  static getLinkageMap(): Linkage {
    return { ...this.linkageMap };
  }

  /**
   * Check if a local variable is being tracked
   */
  static isTracked(localVarName: string): boolean {
    return localVarName in this.linkageMap;
  }

  /**
   * Get the computationStore variable name for a local variable
   */
  static getComputationStoreVariableName(
    localVarName: string
  ): string | undefined {
    return this.linkageMap[localVarName];
  }
}
