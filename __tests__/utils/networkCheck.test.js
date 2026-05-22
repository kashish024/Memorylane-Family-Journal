import { checkNetworkConnection, showNetworkError } from '../../utils/networkCheck';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo');

describe('networkCheck', () => {
  describe('checkNetworkConnection', () => {
    it('should return true when network is connected', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      const result = await checkNetworkConnection();
      expect(result).toBe(true);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should return false when network is not connected', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      const result = await checkNetworkConnection();
      expect(result).toBe(false);
    });

    it('should handle network state with isInternetReachable', async () => {
      NetInfo.fetch.mockResolvedValue({ 
        isConnected: true, 
        isInternetReachable: true 
      });
      const result = await checkNetworkConnection();
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      NetInfo.fetch.mockRejectedValue(new Error('Network error'));
      await expect(checkNetworkConnection()).rejects.toThrow('Network error');
    });
  });

  describe('showNetworkError', () => {
    it('should call Alert.alert with correct parameters', () => {
      const mockAlert = {
        alert: jest.fn(),
      };

      showNetworkError(mockAlert);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'No Internet Connection',
        'Please check your internet connection and try again',
        [{ text: 'OK' }]
      );
    });
  });
});

