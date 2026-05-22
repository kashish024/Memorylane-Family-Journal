// Helper function to parse date string as local date (not UTC)
// Handles YYYY-MM-DD format correctly
export const parseLocalDate = (dateString) => {
  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // If it's in YYYY-MM-DD format, parse as local date
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day);
  }
  
  // Otherwise, parse normally
  return new Date(dateString);
};

// Format date to readable string
export const formatDate = (dateString) => {
    // Parse date as local date to avoid timezone issues
    const date = parseLocalDate(dateString);
    const today = new Date();
    // Normalize today to midnight for accurate comparison
    today.setHours(0, 0, 0, 0);
    
    // Normalize date to midnight for accurate comparison
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if today
    if (dateNormalized.getTime() === today.getTime()) {
      return 'Today';
    }
    
    // Check if yesterday
    if (dateNormalized.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    // Check if this week
    const daysDiff = Math.floor((today - dateNormalized) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7 && daysDiff > 0) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Check if this year
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    // Full date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Get relative time (e.g., "2 hours ago")
  export const getRelativeTime = (dateString, timeString) => {
    const memoryDate = new Date(`${dateString} ${timeString}`);
    const now = new Date();
    const diffMs = now - memoryDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
  };