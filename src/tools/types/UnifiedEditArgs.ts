// Type definitions for UnifiedEditTool arguments

export interface SimpleEdit {
  append?: string;
}

export interface StructureEdit {
  after?: string;
  before?: string;
  add?: string;
}

export interface TextEdit {
  find?: string;
  replace?: string;
}

export type BatchOperationInput = {
  after?: string;
  before?: string;
  add?: string;
  find?: string;
  replace?: string;
  at?: 'start' | 'end';
  append?: string;
};

export interface BatchEdit {
  batch?: BatchOperationInput[];
}

export interface NewSectionEdit {
  new_section?: string;
  at?: 'start' | 'end' | string;
  content?: string;
}

export type UnifiedEditArgs = {
  file: string;
} & (SimpleEdit | StructureEdit | TextEdit | BatchEdit | NewSectionEdit);