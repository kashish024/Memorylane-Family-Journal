import { formatDuration } from '../../utils/audioHelper';

describe('audioHelper', () => {
  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(599)).toBe('9:59');
    });

    it('should format large durations in minutes', () => {
      expect(formatDuration(3600)).toBe('60:00');
      expect(formatDuration(3665)).toBe('61:05');
      expect(formatDuration(7325)).toBe('122:05');
    });

    it('should handle decimal values by rounding down', () => {
      expect(formatDuration(30.5)).toBe('0:30');
      expect(formatDuration(65.7)).toBe('1:05');
    });

    it('should handle negative values', () => {
      // formatDuration doesn't clamp negative values, it just calculates them
      expect(formatDuration(-5)).toBe('-1:-5');
    });

    it('should handle very large values', () => {
      expect(formatDuration(86400)).toBe('1440:00');
    });

    it('should pad single digit seconds with zero', () => {
      expect(formatDuration(1)).toBe('0:01');
      expect(formatDuration(9)).toBe('0:09');
    });
  });
});

