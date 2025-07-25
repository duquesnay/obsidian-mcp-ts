import { describe, it, expect } from 'vitest';
import { REGEX_PATTERNS } from '../../src/constants.js';

describe('Path Validation Regex Patterns', () => {
  describe('PATH_TRAVERSAL', () => {
    it('should match parent directory traversal patterns', () => {
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('../')).toBe(true);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('..\\')).toBe(true);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('../../file.md')).toBe(true);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('path/../other')).toBe(true);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('..\\windows\\path')).toBe(true);
    });

    it('should not match valid relative paths without traversal', () => {
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('./file.md')).toBe(false);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('path/to/file.md')).toBe(false);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('..file.md')).toBe(false);
      expect(REGEX_PATTERNS.PATH_TRAVERSAL.test('path..name/file.md')).toBe(false);
    });
  });

  describe('ABSOLUTE_PATH_UNIX', () => {
    it('should match Unix absolute paths', () => {
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('/')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('/home/user')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('/var/log/file.txt')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('\\')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('\\network\\share')).toBe(true);
    });

    it('should not match relative paths', () => {
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('home/user')).toBe(false);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('./home')).toBe(false);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test('file.txt')).toBe(false);
    });
  });

  describe('ABSOLUTE_PATH_WINDOWS', () => {
    it('should match Windows absolute paths', () => {
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('C:\\')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('D:\\folder')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('Z:\\path\\to\\file.txt')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('c:/')).toBe(true);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('E:/documents')).toBe(true);
    });

    it('should not match non-Windows paths', () => {
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('folder\\file.txt')).toBe(false);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('C:file.txt')).toBe(false);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('1:\\path')).toBe(false);
      expect(REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test('path/to/file')).toBe(false);
    });
  });

  describe('HOME_DIRECTORY', () => {
    it('should match home directory expansion patterns', () => {
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('~')).toBe(true);
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('~/')).toBe(true);
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('~/Documents')).toBe(true);
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('~username')).toBe(true);
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('~user/folder')).toBe(true);
    });

    it('should not match tilde in middle of path', () => {
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('path/~/file')).toBe(false);
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test('file~name.txt')).toBe(false);
      expect(REGEX_PATTERNS.HOME_DIRECTORY.test(' ~/path')).toBe(false);
    });
  });

  describe('CONTROL_CHARACTERS', () => {
    it('should match control characters', () => {
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('\x00')).toBe(true); // null byte
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('\x1f')).toBe(true); // unit separator
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('\x7f')).toBe(true); // delete
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('file\x00name')).toBe(true);
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('path\x0d\x0a')).toBe(true); // CRLF
    });

    it('should not match normal printable characters', () => {
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('normal text')).toBe(false);
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('file-name_123.txt')).toBe(false);
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test('path/to/file')).toBe(false);
      expect(REGEX_PATTERNS.CONTROL_CHARACTERS.test(' ')).toBe(false); // space is \x20
    });
  });

  describe('HIDDEN_FILE_WITH_SLASH', () => {
    it('should match hidden file patterns with slashes', () => {
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('./')).toBe(true);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('../')).toBe(true);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('...\\')).toBe(true);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('../')).toBe(true);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('.\\')).toBe(true);
    });

    it('should not match valid hidden files or normal paths', () => {
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('.gitignore')).toBe(false);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('folder/.hidden')).toBe(false);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('path/to/file')).toBe(false);
      expect(REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test('file.txt')).toBe(false);
    });
  });

  describe('MULTIPLE_SLASHES', () => {
    it('should match multiple consecutive slashes', () => {
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('//')).toBe(true);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('///')).toBe(true);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('\\\\')).toBe(true);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('path//file')).toBe(true);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('folder\\\\\\name')).toBe(true);
    });

    it('should not match single slashes', () => {
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('/')).toBe(false);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('\\')).toBe(false);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('path/to/file')).toBe(false);
      expect(REGEX_PATTERNS.MULTIPLE_SLASHES.test('folder\\file')).toBe(false);
    });
  });

  describe('LEADING_SLASH', () => {
    it('should match leading slashes', () => {
      expect(REGEX_PATTERNS.LEADING_SLASH.test('/')).toBe(true);
      expect(REGEX_PATTERNS.LEADING_SLASH.test('/path')).toBe(true);
      expect(REGEX_PATTERNS.LEADING_SLASH.test('//multiple')).toBe(true);
      expect(REGEX_PATTERNS.LEADING_SLASH.test('///many')).toBe(true);
    });

    it('should not match paths without leading slashes', () => {
      expect(REGEX_PATTERNS.LEADING_SLASH.test('path/to/file')).toBe(false);
      expect(REGEX_PATTERNS.LEADING_SLASH.test('file.txt')).toBe(false);
      expect(REGEX_PATTERNS.LEADING_SLASH.test('./relative')).toBe(false);
    });
  });

  describe('TRAILING_SLASH', () => {
    it('should match trailing slashes', () => {
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('/')).toBe(true);
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('path/')).toBe(true);
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('folder//')).toBe(true);
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('dir///')).toBe(true);
    });

    it('should not match paths without trailing slashes', () => {
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('path/to/file')).toBe(false);
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('file.txt')).toBe(false);
      expect(REGEX_PATTERNS.TRAILING_SLASH.test('/absolute/path')).toBe(false);
    });
  });
});