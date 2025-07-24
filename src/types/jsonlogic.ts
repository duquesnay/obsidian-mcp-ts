/**
 * JsonLogic type definitions
 * JsonLogic is a standard for building complex rules as JSON objects
 * See: http://jsonlogic.com/
 */

/**
 * JsonLogic operators and their value types
 */
export type JsonLogicOperator = 
  // Logic operators
  | 'and' | 'or' | 'not' | '!' | '!!' | 'if'
  // Comparison operators
  | '==' | '===' | '!=' | '!==' | '>' | '>=' | '<' | '<='
  // Array/String operators
  | 'in' | 'cat' | 'substr' | 'merge'
  // Math operators
  | '+' | '-' | '*' | '/' | '%' | 'min' | 'max'
  // Variable/Data operators
  | 'var' | 'missing' | 'missing_some' | 'method'
  // Array operations
  | 'map' | 'filter' | 'reduce' | 'all' | 'some' | 'none'
  // Extended operators (Obsidian-specific)
  | 'contains' | 'startsWith' | 'endsWith';

/**
 * JsonLogic value can be a primitive, array, or nested JsonLogic expression
 */
export type JsonLogicValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonLogicExpression 
  | JsonLogicValue[];

/**
 * A JsonLogic expression is an object with an operator as key
 */
export type JsonLogicExpression = {
  [K in JsonLogicOperator]?: JsonLogicValue;
};

/**
 * Root JsonLogic query type
 */
export type JsonLogicQuery = JsonLogicExpression;