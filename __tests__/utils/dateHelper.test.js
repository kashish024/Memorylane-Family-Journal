import { formatDate, getRelativeTime } from '../../utils/dateHelper';

describe('dateHelper', () => {
  beforeEach(() => {
    // Mock current date to ensure consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('should return "Today" for today\'s date', () => {
      const today = new Date('2024-01-15T12:00:00Z');
      expect(formatDate(today.toISOString())).toBe('Today');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date('2024-01-14T12:00:00Z');
      expect(formatDate(yesterday.toISOString())).toBe('Yesterday');
    });

    it('should return weekday name for dates within this week', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z');
      const result = formatDate(threeDaysAgo.toISOString());
      expect(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).toContain(result);
    });

    it('should return month and day for dates within this year', () => {
      const lastMonth = new Date('2024-01-01T12:00:00Z');
      const result = formatDate(lastMonth.toISOString());
      expect(result).toMatch(/Jan \d+/);
    });

    it('should return full date for dates from previous years', () => {
      const lastYear = new Date('2023-06-15T12:00:00Z');
      const result = formatDate(lastYear.toISOString());
      expect(result).toMatch(/Jun \d+, 2023/);
    });

    it('should handle invalid date strings gracefully', () => {
      expect(() => formatDate('invalid-date')).not.toThrow();
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for very recent times', () => {
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      const timeString = now.toTimeString().split(' ')[0];
      expect(getRelativeTime(dateString, timeString)).toBe('Just now');
    });

    it('should return minutes ago for recent times', () => {
      const thirtyMinsAgo = new Date('2024-01-15T11:30:00Z');
      const dateString = thirtyMinsAgo.toISOString().split('T')[0];
      const timeString = thirtyMinsAgo.toTimeString().split(' ')[0];
      const result = getRelativeTime(dateString, timeString);
      expect(result).toMatch(/\d+ min ago/);
    });

    it('should return hours ago for times within 24 hours', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z');
      const dateString = twoHoursAgo.toISOString().split('T')[0];
      const timeString = twoHoursAgo.toTimeString().split(' ')[0];
      const result = getRelativeTime(dateString, timeString);
      expect(result).toMatch(/\d+ hour(s)? ago/);
    });

    it('should return days ago for times within a week', () => {
      const twoDaysAgo = new Date('2024-01-13T12:00:00Z');
      const dateString = twoDaysAgo.toISOString().split('T')[0];
      const timeString = twoDaysAgo.toTimeString().split(' ')[0];
      const result = getRelativeTime(dateString, timeString);
      expect(result).toMatch(/\d+ day(s)? ago/);
    });

    it('should return formatted date for older times', () => {
      const oldDate = new Date('2024-01-01T12:00:00Z');
      const dateString = oldDate.toISOString().split('T')[0];
      const timeString = oldDate.toTimeString().split(' ')[0];
      const result = getRelativeTime(dateString, timeString);
      // getRelativeTime calls formatDate for dates older than a week
      // formatDate returns full date format for dates from previous years or months
      expect(result).toMatch(/(Jan|Dec) \d+/);
    });
  });
});

