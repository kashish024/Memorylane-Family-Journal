import NetInfo from '@react-native-community/netinfo';

export const checkNetworkConnection = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

export const showNetworkError = (Alert) => {
  Alert.alert(
    'No Internet Connection',
    'Please check your internet connection and try again',
    [{ text: 'OK' }]
  );
};