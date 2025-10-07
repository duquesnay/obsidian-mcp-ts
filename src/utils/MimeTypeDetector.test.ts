import { describe, it, expect } from 'vitest';
import { MimeTypeDetector } from './MimeTypeDetector.js';

describe('MimeTypeDetector', () => {
  describe('isBinaryFile', () => {
    it('should detect PNG as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('image.png')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('path/to/image.PNG')).toBe(true);
    });

    it('should detect JPG/JPEG as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('photo.jpg')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('photo.jpeg')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('photo.JPEG')).toBe(true);
    });

    it('should detect GIF as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('animation.gif')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('animation.GIF')).toBe(true);
    });

    it('should detect SVG as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('icon.svg')).toBe(true);
    });

    it('should detect WebP as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('modern.webp')).toBe(true);
    });

    it('should detect BMP as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('bitmap.bmp')).toBe(true);
    });

    it('should detect ICO as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('favicon.ico')).toBe(true);
    });

    it('should detect PDF as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('document.pdf')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('document.PDF')).toBe(true);
    });

    it('should detect audio formats as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('song.mp3')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('sound.wav')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('audio.ogg')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('track.aac')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('lossless.flac')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('apple.m4a')).toBe(true);
    });

    it('should detect video formats as binary', () => {
      expect(MimeTypeDetector.isBinaryFile('video.mp4')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('webvideo.webm')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('quicktime.mov')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('old.avi')).toBe(true);
    });

    it('should detect markdown as text (not binary)', () => {
      expect(MimeTypeDetector.isBinaryFile('note.md')).toBe(false);
      expect(MimeTypeDetector.isBinaryFile('README.MD')).toBe(false);
    });

    it('should detect text files as text (not binary)', () => {
      expect(MimeTypeDetector.isBinaryFile('file.txt')).toBe(false);
      expect(MimeTypeDetector.isBinaryFile('data.json')).toBe(false);
      expect(MimeTypeDetector.isBinaryFile('code.js')).toBe(false);
    });

    it('should handle files without extensions', () => {
      expect(MimeTypeDetector.isBinaryFile('README')).toBe(false);
      expect(MimeTypeDetector.isBinaryFile('Makefile')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(MimeTypeDetector.isBinaryFile('image.PNG')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('image.Png')).toBe(true);
      expect(MimeTypeDetector.isBinaryFile('image.pNg')).toBe(true);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for PNG', () => {
      expect(MimeTypeDetector.getMimeType('image.png')).toBe('image/png');
    });

    it('should return correct MIME type for JPG', () => {
      expect(MimeTypeDetector.getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(MimeTypeDetector.getMimeType('photo.jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for GIF', () => {
      expect(MimeTypeDetector.getMimeType('animation.gif')).toBe('image/gif');
    });

    it('should return correct MIME type for SVG', () => {
      expect(MimeTypeDetector.getMimeType('icon.svg')).toBe('image/svg+xml');
    });

    it('should return correct MIME type for WebP', () => {
      expect(MimeTypeDetector.getMimeType('modern.webp')).toBe('image/webp');
    });

    it('should return correct MIME type for BMP', () => {
      expect(MimeTypeDetector.getMimeType('bitmap.bmp')).toBe('image/bmp');
    });

    it('should return correct MIME type for ICO', () => {
      expect(MimeTypeDetector.getMimeType('favicon.ico')).toBe('image/x-icon');
    });

    it('should return correct MIME type for PDF', () => {
      expect(MimeTypeDetector.getMimeType('document.pdf')).toBe('application/pdf');
    });

    it('should return correct MIME types for audio formats', () => {
      expect(MimeTypeDetector.getMimeType('song.mp3')).toBe('audio/mpeg');
      expect(MimeTypeDetector.getMimeType('sound.wav')).toBe('audio/wav');
      expect(MimeTypeDetector.getMimeType('audio.ogg')).toBe('audio/ogg');
      expect(MimeTypeDetector.getMimeType('track.aac')).toBe('audio/aac');
      expect(MimeTypeDetector.getMimeType('lossless.flac')).toBe('audio/flac');
      expect(MimeTypeDetector.getMimeType('apple.m4a')).toBe('audio/mp4');
    });

    it('should return correct MIME types for video formats', () => {
      expect(MimeTypeDetector.getMimeType('video.mp4')).toBe('video/mp4');
      expect(MimeTypeDetector.getMimeType('webvideo.webm')).toBe('video/webm');
      expect(MimeTypeDetector.getMimeType('quicktime.mov')).toBe('video/quicktime');
      expect(MimeTypeDetector.getMimeType('old.avi')).toBe('video/x-msvideo');
    });

    it('should return application/octet-stream for unknown extensions', () => {
      expect(MimeTypeDetector.getMimeType('file.unknown')).toBe('application/octet-stream');
      expect(MimeTypeDetector.getMimeType('data.xyz')).toBe('application/octet-stream');
    });

    it('should return application/octet-stream for files without extensions', () => {
      expect(MimeTypeDetector.getMimeType('README')).toBe('application/octet-stream');
      expect(MimeTypeDetector.getMimeType('Makefile')).toBe('application/octet-stream');
    });

    it('should be case insensitive for MIME types', () => {
      expect(MimeTypeDetector.getMimeType('image.PNG')).toBe('image/png');
      expect(MimeTypeDetector.getMimeType('image.Png')).toBe('image/png');
      expect(MimeTypeDetector.getMimeType('document.PDF')).toBe('application/pdf');
    });
  });
});
