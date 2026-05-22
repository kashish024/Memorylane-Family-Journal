/**
 * Notifications utility for MemoryLane.
 * Handles permission, Android channel, and daily reminder scheduling.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_REMINDER_ID = 'memorylane-daily-reminder';
const ANDROID_CHANNEL_ID = 'memorylane-reminders';
const PREFERENCES_KEY = '@preferences';
const EVENT_NOTIFICATION_PREFIX = '@eventNotification:';

// Default: 7:00 PM (19:00) for daily reminder
const DEFAULT_REMINDER_HOUR = 19;
const DEFAULT_REMINDER_MINUTE = 0;

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Set up Android notification channel (required for Android 8+).
 * Call before requesting permission or scheduling on Android.
 */
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E07A5F',
    });
  } catch (error) {
    console.warn('Failed to create notification channel:', error);
  }
}

/**
 * Check if we're on a physical device (required for notifications).
 */
export function isPhysicalDevice() {
  return Device.isDevice === true;
}

const isIosPermissionGranted = (permissionResponse) => {
  const iosStatus = permissionResponse?.ios?.status;
  const rootStatus = permissionResponse?.status;

  return (
    rootStatus === 'granted' ||
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
};

/**
 * Get current notification permission status.
 * @returns {'granted' | 'denied' | 'undetermined'}
 */
export async function getNotificationPermissionStatus() {
  const permissionResponse = await Notifications.getPermissionsAsync();

  if (Platform.OS === 'ios') {
    if (isIosPermissionGranted(permissionResponse)) {
      return 'granted';
    }

    const iosStatus = permissionResponse?.ios?.status;
    if (
      permissionResponse?.status === 'denied' ||
      iosStatus === Notifications.IosAuthorizationStatus.DENIED
    ) {
      return 'denied';
    }

    return 'undetermined';
  }

  const { status } = permissionResponse;
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * Request notification permissions. Sets up Android channel first if needed.
 * @returns {Promise<boolean>} true if granted, false otherwise
 */
export async function requestNotificationPermissions() {
  if (!isPhysicalDevice()) {
    console.warn('Notifications require a physical device');
    return false;
  }
  await setupNotificationChannel();
  const existingPermission = await Notifications.getPermissionsAsync();
  let finalPermission = existingPermission;
  if (
    existingPermission.status !== 'granted' &&
    !isIosPermissionGranted(existingPermission)
  ) {
    finalPermission = await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === 'ios') {
    return isIosPermissionGranted(finalPermission);
  }

  return finalPermission.status === 'granted';
}

/**
 * Schedule the daily "capture a moment" reminder.
 * iOS: calendar trigger at set time. Android: repeating time interval (every 24h).
 */
export async function scheduleDailyReminder(options = {}) {
  const hour = options.hour ?? DEFAULT_REMINDER_HOUR;
  const minute = options.minute ?? DEFAULT_REMINDER_MINUTE;
  const title = options.title ?? "Capture a moment 📸";
  const body = options.body ?? "Add a memory to your family journal today!";

  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);

  const content = {
    title,
    body,
    data: { screen: 'AddMemory' },
    ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
  };

  if (Platform.OS === 'ios') {
    // iOS: use calendar trigger for daily at fixed time
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
      identifier: DAILY_REMINDER_ID,
    });
  } else {
    // Android: use daily trigger (hour, minute)
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: ANDROID_CHANNEL_ID,
      },
      identifier: DAILY_REMINDER_ID,
    });
  }
}

/**
 * Cancel all scheduled notifications (e.g. when user turns off notifications).
 */
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

const canSendEventNotifications = async () => {
  if (!isPhysicalDevice()) return false;

  try {
    const prefsRaw = await AsyncStorage.getItem(PREFERENCES_KEY);
    const preferences = prefsRaw ? JSON.parse(prefsRaw) : {};
    if (!preferences.notifications) return false;
  } catch (error) {
    console.warn('Failed to read preferences for notifications:', error);
    return false;
  }

  const status = await getNotificationPermissionStatus();
  return status === 'granted';
};

const shouldThrottleNotification = async (key, throttleHours = 24) => {
  const storageKey = `${EVENT_NOTIFICATION_PREFIX}${key}`;
  const now = Date.now();
  const throttleMs = throttleHours * 60 * 60 * 1000;

  try {
    const lastSentRaw = await AsyncStorage.getItem(storageKey);
    const lastSent = lastSentRaw ? Number(lastSentRaw) : null;

    if (lastSent && now - lastSent < throttleMs) {
      return true;
    }

    await AsyncStorage.setItem(storageKey, String(now));
    return false;
  } catch (error) {
    console.warn('Failed to read/write notification throttle key:', error);
    return false;
  }
};

export async function sendEventNotification({
  title,
  body,
  data = {},
  throttleKey = null,
  throttleHours = 24,
}) {
  if (!(await canSendEventNotifications())) return false;
  await setupNotificationChannel();

  if (throttleKey) {
    const isThrottled = await shouldThrottleNotification(throttleKey, throttleHours);
    if (isThrottled) return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.error('Failed to send event notification:', error);
    return false;
  }
}

export async function notifyPendingInvitations(invitationsCount) {
  if (!invitationsCount || invitationsCount <= 0) return false;
  const body =
    invitationsCount === 1
      ? 'You have 1 pending contributor invitation.'
      : `You have ${invitationsCount} pending contributor invitations.`;

  return sendEventNotification({
    title: 'New invitation waiting',
    body,
    data: { screen: 'AcceptInvitation' },
    throttleKey: `invites:${invitationsCount}`,
    throttleHours: 6,
  });
}

export async function notifyMonthlySummarySent(sentCount) {
  if (!sentCount || sentCount <= 0) return false;
  const body =
    sentCount === 1
      ? 'Your monthly summary email was sent for 1 child.'
      : `Your monthly summary emails were sent for ${sentCount} children.`;

  return sendEventNotification({
    title: 'Monthly summary sent',
    body,
    data: { screen: 'MonthlySummary' },
    throttleKey: `monthly-summary:${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
    throttleHours: 24,
  });
}

export async function notifyAutoBackupCompleted() {
  return sendEventNotification({
    title: 'Backup completed',
    body: 'Your weekly automatic backup finished successfully.',
    data: { screen: 'DataManagement' },
    throttleKey: `auto-backup:${new Date().toISOString().slice(0, 10)}`,
    throttleHours: 24,
  });
}

/**
 * Enable notifications: request permission and schedule daily reminder.
 * @returns {{ success: boolean, message?: string }}
 */
export async function enableNotifications() {
  if (!isPhysicalDevice()) {
    return { success: false, message: 'Use a physical device to enable notifications.' };
  }
  const granted = await requestNotificationPermissions();
  if (!granted) {
    return { success: false, message: 'Notification permission was denied.' };
  }
  try {
    await scheduleDailyReminder();
    return { success: true };
  } catch (error) {
    console.error('Failed to schedule daily reminder:', error);
    return { success: false, message: error.message || 'Failed to schedule reminder.' };
  }
}

/**
 * Disable notifications: cancel all scheduled and optionally revoke (OS-dependent).
 */
export async function disableNotifications() {
  await cancelAllScheduledNotifications();
}
