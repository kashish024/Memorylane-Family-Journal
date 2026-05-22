// autoMonthlySummary.js - Automatic Monthly Summary System
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth } from './firebase';
import { loadChildren, getMemoriesForChild } from './storage';
import { generateMonthlySummary } from './aiSummary';
import { sendMonthlyEmail } from './emailService';
import { generateMonthlyEmailHTML } from './emailTemplates';
import { parseLocalDate } from './dateHelper';

/**
 * Get the first business day of the current month
 * Business days are Monday-Friday
 * @returns {Date} The first business day of the month
 */
export const getFirstBusinessDayOfMonth = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Start with the 1st of the current month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
  
  // If it's Saturday (6), add 2 days to get Monday
  if (dayOfWeek === 6) {
    firstDay.setDate(firstDay.getDate() + 2);
  }
  // If it's Sunday (0), add 1 day to get Monday
  else if (dayOfWeek === 0) {
    firstDay.setDate(firstDay.getDate() + 1);
  }
  // Otherwise it's already a business day (Mon-Fri: 1-5)
  
  return firstDay;
};

/**
 * Check if today is the first business day of the month
 * @returns {boolean}
 */
export const isFirstBusinessDayOfMonth = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const firstBusinessDay = getFirstBusinessDayOfMonth();
  firstBusinessDay.setHours(0, 0, 0, 0);
  
  return today.getTime() === firstBusinessDay.getTime();
};

/**
 * Get the previous month and year
 * @returns {{month: string, year: number, monthIndex: number}} Previous month info
 */
export const getPreviousMonth = () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const monthIndex = previousMonth.getMonth();
  const year = previousMonth.getFullYear();
  const month = previousMonth.toLocaleString('default', { month: 'long' });
  
  return { month, year, monthIndex };
};

const getMonthName = (monthIndex) =>
  new Date(2000, monthIndex, 1).toLocaleString('default', { month: 'long' });

const getSummaryKey = (childId, monthIndex, year) => `${childId}_${year}_${monthIndex}`;

/** Firestore-safe queue token: childId may contain underscores */
const encodePendingMonthKey = (childId, year, monthIndex) =>
  `${childId}:${year}:${monthIndex}`;

const decodePendingMonthKey = (token) => {
  const parts = String(token).split(':');
  if (parts.length < 3) return null;
  const monthIndex = Number(parts.pop());
  const year = Number(parts.pop());
  const childId = parts.join(':');
  if (!childId || Number.isNaN(year) || Number.isNaN(monthIndex)) return null;
  return { childId, year, monthIndex };
};

const getMonthStats = (memories) => {
  const latestUpdatedAt = memories.reduce((latest, memory) => {
    const candidate = memory.updatedAt || memory.createdAt || memory.date;
    if (!candidate) return latest;
    const candidateTime = new Date(candidate).toISOString();
    return !latest || candidateTime > latest ? candidateTime : latest;
  }, null);

  return {
    totalMemories: memories.length,
    milestones: memories.filter(m => m.milestone).length,
    photos: memories.filter(m => m.type === 'photo').length,
    voiceNotes: memories.filter(m => m.type === 'audio').length,
    textNotes: memories.filter(m => m.type === 'text').length,
    latestUpdatedAt,
  };
};

const isCurrentMonth = (monthIndex, year) => {
  const now = new Date();
  return now.getMonth() === monthIndex && now.getFullYear() === year;
};

/**
 * Whether this month should eventually get (or refresh) a summary email.
 * Used when queueing edits and when processing the queue on the monthly run.
 */
const monthDataWarrantsSummary = (summaryData, monthStats) => {
  if (!monthStats || monthStats.totalMemories === 0) return false;
  if (!summaryData?.sent) return true;

  const previousCount = summaryData.lastMemoryCount ?? null;
  const previousLatest = summaryData.lastMemoryUpdatedAt
    ? new Date(summaryData.lastMemoryUpdatedAt).getTime()
    : 0;
  const currentLatest = monthStats.latestUpdatedAt
    ? new Date(monthStats.latestUpdatedAt).getTime()
    : 0;

  return (
    previousCount !== monthStats.totalMemories ||
    currentLatest > previousLatest
  );
};

/**
 * Check if a monthly summary was already sent for a specific child and month
 * @param {string} childId - The child ID
 * @param {number} monthIndex - Month index (0-11)
 * @param {number} year - Year
 * @returns {Promise<boolean>}
 */
export const wasSummarySent = async (childId, monthIndex, year) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;
    
    const summaryKey = `${childId}_${year}_${monthIndex}`;
    const summaryRef = doc(db, 'monthlySummaries', summaryKey);
    const summaryDoc = await getDoc(summaryRef);
    
    return summaryDoc.exists() && summaryDoc.data().sent === true;
  } catch (error) {
    console.error('❌ Error checking if summary was sent:', error);
    return false;
  }
};

/**
 * Mark a monthly summary as sent
 * @param {string} childId - The child ID
 * @param {number} monthIndex - Month index (0-11)
 * @param {number} year - Year
 * @param {string} childName - The child's name
 * @returns {Promise<void>}
 */
const markSummaryAsSent = async (childId, monthIndex, year, childName, metadata = {}) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not logged in');
    
    const summaryKey = getSummaryKey(childId, monthIndex, year);
    const summaryRef = doc(db, 'monthlySummaries', summaryKey);
    
    await setDoc(summaryRef, {
      childId,
      childName,
      userId,
      monthIndex,
      year,
      sent: true,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...metadata,
    });
    
    console.log(`✅ Marked summary as sent for ${childName} - ${year}/${monthIndex + 1}`);
  } catch (error) {
    console.error('❌ Error marking summary as sent:', error);
    throw error;
  }
};

/**
 * Generate and send monthly summary for a single child
 * @param {Object} child - Child object
 * @param {string} month - Month name (e.g., "January")
 * @param {number} year - Year
 * @param {number} monthIndex - Month index (0-11)
 * @returns {Promise<boolean>} Success status
 */
const sendChildMonthlySummary = async (child, month, year, monthIndex, options = {}) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      console.error('❌ No user email found for', child.name);
      return false;
    }
    
    console.log(`📧 Processing monthly summary for ${child.name} - ${month} ${year}`);
    
    // Get memories for the previous month
    const allMemories = await getMemoriesForChild(child.id);
    const monthMemories = allMemories.filter(memory => {
      // Parse date as local date to avoid timezone issues
      const memoryDate = parseLocalDate(memory.date);
      return memoryDate.getMonth() === monthIndex && 
             memoryDate.getFullYear() === year;
    });
    
    if (monthMemories.length === 0) {
      console.log(`⏭️ No memories found for ${child.name} in ${month} ${year}, skipping`);
      // Still mark as sent to avoid retrying
      await markSummaryAsSent(child.id, monthIndex, year, child.name);
      return true;
    }
    
    const memoryStats = getMonthStats(monthMemories);
    
    // Generate AI summary
    console.log(`🤖 Generating AI summary for ${child.name}...`);
    const aiSummaryText = await generateMonthlySummary(
      monthMemories,
      child.name,
      month,
      year
    );
    
    if (!aiSummaryText) {
      console.error(`❌ Failed to generate AI summary for ${child.name}`);
      return false;
    }
    
    // Generate HTML email
    const htmlContent = generateMonthlyEmailHTML(
      child.name,
      month,
      year,
      aiSummaryText,
      {
        milestones: memoryStats.milestones,
        memories: monthMemories.slice(0, 5) // Top 5 memories
      },
      memoryStats.totalMemories,
      { isRefreshed: Boolean(options.isUpdate) }
    );
    
    // Send email
    console.log(`📧 Sending email to ${user.email} for ${child.name}...`);
    const subjectPrefix = options.isUpdate ? 'Updated ' : '';
    await sendMonthlyEmail(
      user.email,
      `${subjectPrefix}${child.name}'s ${month} ${year} Memory Summary`,
      htmlContent
    );
    
    // Mark as sent
    await markSummaryAsSent(child.id, monthIndex, year, child.name, {
      lastMemoryCount: memoryStats.totalMemories,
      lastMemoryUpdatedAt: memoryStats.latestUpdatedAt || null,
      source: options.source || 'scheduled',
      updatedSummary: Boolean(options.isUpdate),
    });
    
    console.log(`✅ Successfully sent monthly summary for ${child.name}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error sending monthly summary for ${child.name}:`, error);
    return false;
  }
};

/**
 * Queue past-month summary sends for the next scheduled monthly run (first business day).
 * Avoids immediate "updated summary" emails when users backfill older months.
 */
export const queuePastMonthSummaryRefreshes = async (childId, affectedDates = []) => {
  try {
    const user = auth.currentUser;
    if (!user || !childId) return { queued: 0, skipped: 0 };

    const children = await loadChildren();
    const child = children.find(c => c.id === childId);
    if (!child || child.ownerId !== user.uid) {
      return { queued: 0, skipped: 0 };
    }

    const uniqueMonthKeys = Array.from(
      new Set(
        affectedDates
          .filter(Boolean)
          .map((dateStr) => {
            const parsed = parseLocalDate(dateStr);
            return `${parsed.getFullYear()}-${parsed.getMonth()}`;
          })
      )
    );

    if (uniqueMonthKeys.length === 0) {
      return { queued: 0, skipped: 0 };
    }

    const allMemories = await getMemoriesForChild(childId);
    const tokensToQueue = [];

    for (const key of uniqueMonthKeys) {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr);

      if (isCurrentMonth(monthIndex, year)) {
        continue;
      }

      const monthMemories = allMemories.filter(memory => {
        const memoryDate = parseLocalDate(memory.date);
        return memoryDate.getMonth() === monthIndex && memoryDate.getFullYear() === year;
      });
      const monthStats = getMonthStats(monthMemories);

      const summaryRef = doc(db, 'monthlySummaries', getSummaryKey(childId, monthIndex, year));
      const summaryDoc = await getDoc(summaryRef);
      const summaryData = summaryDoc.exists() ? summaryDoc.data() : null;

      if (!monthDataWarrantsSummary(summaryData, monthStats)) {
        continue;
      }

      tokensToQueue.push(encodePendingMonthKey(childId, year, monthIndex));
    }

    if (tokensToQueue.length === 0) {
      return { queued: 0, skipped: uniqueMonthKeys.length };
    }

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      pendingSummaryRefreshKeys: arrayUnion(...tokensToQueue),
    });

    console.log(
      `📬 Queued ${tokensToQueue.length} past-month summary refresh(es) for next monthly send`
    );
    return { queued: tokensToQueue.length, skipped: 0 };
  } catch (error) {
    console.error('❌ Error queueing past-month summary refreshes:', error);
    return { queued: 0, skipped: 0 };
  }
};

const processPendingSummaryRefreshes = async (user, children, sentKeysThisRun) => {
  let deferredSent = 0;
  let deferredFailed = 0;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const pendingRaw = userSnap.exists() ? userSnap.data().pendingSummaryRefreshKeys : null;
  const pending = [...new Set(Array.isArray(pendingRaw) ? pendingRaw : [])];

  if (pending.length === 0) {
    return { deferredSent, deferredFailed, newPending: [] };
  }

  const newPending = [];

  for (const token of pending) {
    const parsed = decodePendingMonthKey(token);
    if (!parsed) {
      continue;
    }

    const { childId, year, monthIndex } = parsed;

    if (isCurrentMonth(monthIndex, year)) {
      continue;
    }

    const dedupeKey = encodePendingMonthKey(childId, year, monthIndex);
    if (sentKeysThisRun.has(dedupeKey)) {
      continue;
    }

    const child = children.find(c => c.id === childId);
    if (!child || child.ownerId !== user.uid) {
      continue;
    }

    const allMemories = await getMemoriesForChild(childId);
    const monthMemories = allMemories.filter(memory => {
      const memoryDate = parseLocalDate(memory.date);
      return memoryDate.getMonth() === monthIndex && memoryDate.getFullYear() === year;
    });
    const monthStats = getMonthStats(monthMemories);

    const summaryRef = doc(db, 'monthlySummaries', getSummaryKey(childId, monthIndex, year));
    const summaryDoc = await getDoc(summaryRef);
    const summaryData = summaryDoc.exists() ? summaryDoc.data() : null;

    if (!monthDataWarrantsSummary(summaryData, monthStats)) {
      continue;
    }

    const month = getMonthName(monthIndex);
    const isUpdate = Boolean(summaryData?.sent);
    const success = await sendChildMonthlySummary(child, month, year, monthIndex, {
      source: 'backfill_deferred',
      isUpdate,
    });

    if (success) {
      deferredSent++;
      sentKeysThisRun.add(dedupeKey);
    } else {
      deferredFailed++;
      newPending.push(token);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await updateDoc(userRef, { pendingSummaryRefreshKeys: newPending });

  return { deferredSent, deferredFailed, newPending };
};

/**
 * Check if summaries should be sent and send them for all children
 * This should be called on app launch or via scheduled task
 * @returns {Promise<{sent: number, failed: number, skipped: number, deferredSent: number, deferredFailed: number}>}
 */
export const checkAndSendMonthlySummaries = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('⏭️ User not logged in, skipping monthly summary check');
      return { sent: 0, failed: 0, skipped: 0, deferredSent: 0, deferredFailed: 0 };
    }
    
    // Check if today is the first business day of the month
    if (!isFirstBusinessDayOfMonth()) {
      console.log('⏭️ Not the first business day of the month, skipping monthly summary check');
      return { sent: 0, failed: 0, skipped: 0, deferredSent: 0, deferredFailed: 0 };
    }
    
    console.log('📅 First business day detected! Checking for monthly summaries...');
    
    // Get previous month info
    const { month, year, monthIndex } = getPreviousMonth();
    console.log(`📆 Processing summaries for ${month} ${year}`);
    
    // Load all children for the user
    const children = await loadChildren();
    
    if (children.length === 0) {
      console.log('⏭️ No children found, skipping monthly summaries');
      return { sent: 0, failed: 0, skipped: 0, deferredSent: 0, deferredFailed: 0 };
    }
    
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const sentKeysThisRun = new Set();
    
    // Process each child
    for (const child of children) {
      // Only send summaries for children owned by the current user
      // (not for children where user is just a contributor)
      if (child.ownerId !== user.uid) {
        console.log(`⏭️ Skipping ${child.name} - user is not the owner`);
        skipped++;
        continue;
      }
      
      // Check if summary was already sent
      const alreadySent = await wasSummarySent(child.id, monthIndex, year);
      if (alreadySent) {
        console.log(`⏭️ Summary already sent for ${child.name} - ${month} ${year}`);
        skipped++;
        continue;
      }
      
      // Send summary
      const success = await sendChildMonthlySummary(child, month, year, monthIndex, {
        source: 'scheduled',
      });
      if (success) {
        sent++;
        sentKeysThisRun.add(encodePendingMonthKey(child.id, year, monthIndex));
      } else {
        failed++;
      }
      
      // Small delay between children to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const { deferredSent, deferredFailed } = await processPendingSummaryRefreshes(
      user,
      children,
      sentKeysThisRun
    );
    
    console.log(
      `✅ Monthly summary check complete: ${sent} sent, ${failed} failed, ${skipped} skipped; ` +
        `deferred queue: ${deferredSent} sent, ${deferredFailed} failed`
    );
    return { sent, failed, skipped, deferredSent, deferredFailed };
    
  } catch (error) {
    console.error('❌ Error in checkAndSendMonthlySummaries:', error);
    return { sent: 0, failed: 0, skipped: 0, deferredSent: 0, deferredFailed: 0 };
  }
};

