import { PeriodType } from '../../utils/validation.js';

/**
 * Arguments for the GetRecentPeriodicNotes tool
 */
export interface GetRecentPeriodicNotesArgs {
  /**
   * The type of periodic notes to retrieve
   */
  period: PeriodType;
  /**
   * Number of days to look back for notes. Default varies by period type.
   */
  days?: number;
}