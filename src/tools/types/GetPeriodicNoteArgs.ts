import { PeriodType } from '../../utils/validation.js';

/**
 * Arguments for the GetPeriodicNote tool
 */
export interface GetPeriodicNoteArgs extends Record<string, unknown> {
  /**
   * The type of periodic note to retrieve
   */
  period: PeriodType;
}