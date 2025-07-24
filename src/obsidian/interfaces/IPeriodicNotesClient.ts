export interface IPeriodicNotesClient {
  /**
   * Get a specific periodic note (daily, weekly, monthly, quarterly, yearly)
   * @param period The period type
   * @returns The periodic note content and metadata
   */
  getPeriodicNote(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<any>;

  /**
   * Get recent periodic notes
   * @param period The period type
   * @param days Number of days to look back (optional)
   * @returns Array of recent periodic notes
   */
  getRecentPeriodicNotes(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    days?: number
  ): Promise<any[]>;
}