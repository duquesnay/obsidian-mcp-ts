import { JsonLogicQuery } from '../../types/jsonlogic.js';

/**
 * Arguments for the ComplexSearch tool
 */
export interface ComplexSearchArgs {
  /**
   * JsonLogic query object for complex searches
   */
  query: JsonLogicQuery;
}