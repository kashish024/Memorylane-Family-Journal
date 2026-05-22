export const getErrorMessage = (error) => {
    // Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        // Login errors - use generic message for security (prevents user enumeration)
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-email':
          return 'Invalid email or password. Please check your credentials and try again.';
        
        // Signup errors
        case 'auth/email-already-in-use':
          return 'This email is already registered. Please sign in or use a different email.';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters long.';
        
        // Network and connection errors
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection and try again.';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later or reset your password.';
        
        // Account status errors
        case 'auth/user-disabled':
          return 'This account has been disabled. Please contact support for assistance.';
        case 'auth/operation-not-allowed':
          return 'This sign-in method is not enabled. Please contact support.';
        case 'auth/requires-recent-login':
          return 'For security, please sign out and sign in again to perform this action.';
        
        // Storage errors
        case 'storage/unauthorized':
          return 'Upload failed. You don\'t have permission to upload this file.';
        case 'storage/canceled':
          return 'Upload was canceled.';
        case 'storage/quota-exceeded':
          return 'Storage limit reached. Please free up space and try again.';
        case 'storage/object-not-found':
          return 'File not found. It may have been deleted.';
        
        // Firestore errors
        case 'permission-denied':
          return 'You don\'t have permission to perform this action.';
        
        // Generic Firebase error fallback
        default:
          // Try to extract a readable message from Firebase error
          if (error.message) {
            // Remove Firebase error prefix if present
            const message = error.message.replace(/^Firebase:\s*/i, '').replace(/^Error\s*\([^)]+\):\s*/i, '');
            // If it's still technical, use generic message
            if (message.includes('auth/') || message.includes('storage/')) {
              return 'Something went wrong. Please try again.';
            }
            return message;
          }
          return 'Something went wrong. Please try again.';
      }
    }
  
    // Network errors (fallback check)
    if (error.message?.includes('Network') || error.message?.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
  
    // Generic fallback
    return error.message || 'Something went wrong. Please try again.';
  };
  
  export const showError = (error, Alert) => {
    const message = getErrorMessage(error);
    Alert.alert('Error', message, [{ text: 'OK' }]);
  };