import { PeriodType } from '../../utils/validation.js';

/**
 * Arguments for the GetPeriodicNote tool
 */
export interface GetPeriodicNoteArgs {
  /**
   * The type of periodic note to retrieve
   */
  period: PeriodType;
}