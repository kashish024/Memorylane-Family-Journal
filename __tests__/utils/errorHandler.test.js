import { getErrorMessage, showError } from '../../utils/errorHandler';

describe('errorHandler', () => {
  describe('getErrorMessage', () => {
    it('should return correct message for auth/user-not-found', () => {
      const error = { code: 'auth/user-not-found' };
      expect(getErrorMessage(error)).toBe('Invalid email or password');
    });

    it('should return correct message for auth/wrong-password', () => {
      const error = { code: 'auth/wrong-password' };
      expect(getErrorMessage(error)).toBe('Invalid email or password');
    });

    it('should return correct message for auth/email-already-in-use', () => {
      const error = { code: 'auth/email-already-in-use' };
      expect(getErrorMessage(error)).toBe('This email is already registered');
    });

    it('should return correct message for auth/weak-password', () => {
      const error = { code: 'auth/weak-password' };
      expect(getErrorMessage(error)).toBe('Password should be at least 6 characters');
    });

    it('should return correct message for auth/invalid-email', () => {
      const error = { code: 'auth/invalid-email' };
      expect(getErrorMessage(error)).toBe('Please enter a valid email address');
    });

    it('should return correct message for auth/network-request-failed', () => {
      const error = { code: 'auth/network-request-failed' };
      expect(getErrorMessage(error)).toBe('Network error. Please check your connection');
    });

    it('should return correct message for storage/unauthorized', () => {
      const error = { code: 'storage/unauthorized' };
      expect(getErrorMessage(error)).toBe('Upload failed. Please try again');
    });

    it('should return correct message for storage/canceled', () => {
      const error = { code: 'storage/canceled' };
      expect(getErrorMessage(error)).toBe('Upload canceled');
    });

    it('should return correct message for storage/quota-exceeded', () => {
      const error = { code: 'storage/quota-exceeded' };
      expect(getErrorMessage(error)).toBe('Storage quota exceeded');
    });

    it('should return error message for unknown code', () => {
      const error = { code: 'unknown/error', message: 'Custom error message' };
      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('should return default message for unknown code without message', () => {
      const error = { code: 'unknown/error' };
      expect(getErrorMessage(error)).toBe('An error occurred');
    });

    it('should handle network errors in message', () => {
      const error = { message: 'Network request failed' };
      expect(getErrorMessage(error)).toBe('Network error. Please check your internet connection');
    });

    it('should return generic fallback for errors without code or network message', () => {
      const error = { message: 'Something went wrong' };
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return default message for errors without message', () => {
      const error = {};
      expect(getErrorMessage(error)).toBe('Something went wrong. Please try again');
    });
  });

  describe('showError', () => {
    it('should call Alert.alert with correct parameters', () => {
      const mockAlert = {
        alert: jest.fn(),
      };
      const error = { code: 'auth/user-not-found' };

      showError(error, mockAlert);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Error',
        'Invalid email or password',
        [{ text: 'OK' }]
      );
    });
  });
});

