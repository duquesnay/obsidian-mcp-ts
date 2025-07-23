import { ResourceHandler } from './types.js';
import { TagsHandler, StatsHandler, RecentHandler, NoteHandler, FolderHandler } from './concreteHandlers.js';
import { DailyNoteHandler } from './DailyNoteHandler.js';

// Create singleton instances of handlers
const tagsHandler = new TagsHandler();
const statsHandler = new StatsHandler();
const recentHandler = new RecentHandler();
const noteHandler = new NoteHandler();
const folderHandler = new FolderHandler();
const dailyNoteHandler = new DailyNoteHandler();

export function createTagsHandler(): ResourceHandler {
  return (uri: string, server?: any) => tagsHandler.execute(uri, server);
}

export function createStatsHandler(): ResourceHandler {
  return (uri: string, server?: any) => statsHandler.execute(uri, server);
}

export function createRecentHandler(): ResourceHandler {
  return (uri: string, server?: any) => recentHandler.execute(uri, server);
}

export function createNoteHandler(): ResourceHandler {
  return (uri: string, server?: any) => noteHandler.execute(uri, server);
}

export function createFolderHandler(): ResourceHandler {
  return (uri: string, server?: any) => folderHandler.execute(uri, server);
}

export function createDailyNoteHandler(): ResourceHandler {
  return (uri: string, server?: any) => dailyNoteHandler.execute(uri, server);
}