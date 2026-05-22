// invitations.js - Contributor Invitation System (Secure Version)
import { auth, db } from './firebase';
import Constants from 'expo-constants';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';

// ==================== HELPERS ====================

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No user logged in!');
    return null;
  }
  return user.uid;
};

const getUserEmail = () => {
  const user = auth.currentUser;
  return user?.email || null;
};

const getUserName = async () => {
  const userId = getUserId();
  if (!userId) return 'Unknown';
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().name || userDoc.data().email || 'You';
    }
    return 'You';
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'You';
  }
};

// ==================== INVITATION FUNCTIONS ====================

/**
 * Send an invitation to contribute to a child's memories
 * @param {string} childId - ID of the child to share
 * @param {string} inviteeEmail - Email of person to invite
 * @returns {Promise<Object>} Invitation object
 */
export const sendInvitation = async (childId, inviteeEmail) => {
  const userId = getUserId();
  const userEmail = getUserEmail();
  
  if (!userId) throw new Error('User not logged in');
  if (!inviteeEmail) throw new Error('Invitee email required');
  
  try {
    // Get child details first (we'll reuse this)
    const childDoc = await getDoc(doc(db, 'children', childId));
    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    const childData = childDoc.data();

    // Check subscription limits for contributors
    const { canAddContributor } = require('./subscription');
    const contributorsCount = (childData.contributors || []).length;
    const canAdd = await canAddContributor(contributorsCount, childId);
    
    if (!canAdd.canAdd) {
      const error = new Error(canAdd.reason);
      error.code = 'SUBSCRIPTION_LIMIT';
      throw error;
    }
    
    console.log('📧 Sending invitation to:', inviteeEmail);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      throw new Error('Invalid email format');
    }

    // Normalize email (lowercase)
    const normalizedEmail = inviteeEmail.toLowerCase().trim();

    // ⚠️ TEST MODE: Allow self-invite for testing Resend
    const ALLOW_SELF_INVITE_FOR_TESTING = false; // Set to false in production

    if (normalizedEmail === userEmail?.toLowerCase()) {
      if (!ALLOW_SELF_INVITE_FOR_TESTING) {
        throw new Error("You can't invite yourself!");
      }
      console.log('⚠️ TEST MODE: Allowing self-invitation');
    }

    // Check if user is owner
    if (childData.ownerId !== userId) {
      throw new Error('Only the owner can invite contributors');
    }

    // Check if already a contributor
    if (childData.contributors && childData.contributors.includes(normalizedEmail)) {
      throw new Error(`${inviteeEmail} is already a contributor`);
    }

    // Check if invitation already exists and is pending
    const existingInvitesQuery = query(
      collection(db, 'invitations'),
      where('childId', '==', childId),
      where('inviteeEmail', '==', normalizedEmail),
      where('status', '==', 'pending')
    );
    
    const existingInvites = await getDocs(existingInvitesQuery);
    if (!existingInvites.empty) {
      throw new Error(`Invitation already sent to ${inviteeEmail}`);
    }

    // Create invitation
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const inviterName = await getUserName();
    
    const invitationData = {
      id: invitationId,
      childId: childId,
      childName: childData.name,
      childAvatar: childData.avatar,
      inviterUserId: userId,
      inviterEmail: userEmail,
      inviterName: inviterName,
      inviteeEmail: normalizedEmail,
      status: 'pending', // 'pending', 'accepted', 'declined'
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Save invitation to Firestore
    await setDoc(doc(db, 'invitations', invitationId), invitationData);

    console.log('✅ Invitation created:', invitationId);

    // Send email
    try {
      await sendInvitationEmail(invitationData);
      console.log('✅ Invitation email sent');
    } catch (emailError) {
      console.error('⚠️ Email failed, but invitation created:', emailError);
      // Don't throw - invitation is created, email is secondary
      // User can still accept via manual invitation code
    }

    return invitationData;
    
  } catch (error) {
    console.error('❌ Error sending invitation:', error);
    throw error;
  }
};

/**
 * Accept an invitation
 * @param {string} invitationId - ID of invitation to accept
 * @returns {Promise<Object>} Updated invitation
 */
export const acceptInvitation = async (invitationId) => {
  const userId = getUserId();
  const userEmail = getUserEmail();
  
  if (!userId) throw new Error('User not logged in');
  
  try {
    console.log('✅ Accepting invitation:', invitationId);

    // Get invitation
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitationData = invitationDoc.data();

    // Check if invitation is for this user
    if (invitationData.inviteeEmail.toLowerCase() !== userEmail?.toLowerCase()) {
      throw new Error('This invitation is not for you');
    }

    // Check if already accepted
    if (invitationData.status === 'accepted') {
      throw new Error('Invitation already accepted');
    }

    // Check if expired
    if (new Date(invitationData.expiresAt) < new Date()) {
      await updateDoc(invitationRef, { status: 'expired' });
      throw new Error('Invitation has expired');
    }

    // Add user to child's contributors
    const childRef = doc(db, 'children', invitationData.childId);
    const childDoc = await getDoc(childRef);
    
    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    const childData = childDoc.data();
    const currentContributors = childData.contributors || [];

    // Add userId to contributors array (not email, just ID)
    if (!currentContributors.includes(userId)) {
      await updateDoc(childRef, {
        contributors: [...currentContributors, userId],
        updatedAt: new Date().toISOString(),
      });
    }

    // Add child to user's childrenAccess and ensure user document has name/email
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentAccess = userDoc.exists() ? (userDoc.data().childrenAccess || []) : [];
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Ensure user document has email and name (use email if name is missing)
    const updateData = {
      childrenAccess: currentAccess.includes(invitationData.childId) 
        ? currentAccess 
        : [...currentAccess, invitationData.childId],
    };
    
    // Set email if not already set
    if (!userData.email && userEmail) {
      updateData.email = userEmail;
    }
    
    // Set name if not already set (extract from email as fallback)
    if (!userData.name && userEmail) {
      const emailName = userEmail.split('@')[0];
      updateData.name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    await setDoc(userRef, updateData, { merge: true });

    // Update invitation status
    await updateDoc(invitationRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptedByUserId: userId,
    });

    console.log('✅ Invitation accepted successfully');

    return {
      ...invitationData,
      status: 'accepted',
    };
    
  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Resend an invitation email
 * @param {string} invitationId - ID of invitation to resend
 * @returns {Promise<Object>} Updated invitation
 */
export const resendInvitation = async (invitationId) => {
  const userId = getUserId();
  
  if (!userId) throw new Error('User not logged in');
  
  try {
    console.log('📧 Resending invitation:', invitationId);

    // Get invitation
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitationData = invitationDoc.data();

    // Check if user is the inviter (owner)
    if (invitationData.inviterUserId !== userId) {
      throw new Error('Only the inviter can resend invitations');
    }

    // Check if invitation is still pending
    if (invitationData.status !== 'pending') {
      throw new Error('Can only resend pending invitations');
    }

    // Update expiration date (extend by 7 days from now)
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await updateDoc(invitationRef, {
      expiresAt: newExpiresAt,
      resentAt: new Date().toISOString(),
    });

    // Resend email
    const updatedInvitationData = {
      ...invitationData,
      expiresAt: newExpiresAt,
    };

    try {
      await sendInvitationEmail(updatedInvitationData);
      console.log('✅ Invitation email resent');
    } catch (emailError) {
      console.error('⚠️ Email failed, but invitation updated:', emailError);
      // Don't throw - invitation is updated, email is secondary
    }

    return updatedInvitationData;
    
  } catch (error) {
    console.error('❌ Error resending invitation:', error);
    throw error;
  }
};

/**
 * Decline an invitation
 * @param {string} invitationId - ID of invitation to decline
 * @returns {Promise<void>}
 */
export const declineInvitation = async (invitationId) => {
  const userId = getUserId();
  const userEmail = getUserEmail();
  
  if (!userId) throw new Error('User not logged in');
  
  try {
    console.log('❌ Declining invitation:', invitationId);

    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitationData = invitationDoc.data();

    // Check if invitation is for this user
    if (invitationData.inviteeEmail.toLowerCase() !== userEmail?.toLowerCase()) {
      throw new Error('This invitation is not for you');
    }

    // Update status
    await updateDoc(invitationRef, {
      status: 'declined',
      declinedAt: new Date().toISOString(),
    });

    console.log('✅ Invitation declined');
    
  } catch (error) {
    console.error('❌ Error declining invitation:', error);
    throw error;
  }
};

/**
 * Get pending invitations for current user
 * @returns {Promise<Array>} List of pending invitations
 */
export const getPendingInvitations = async () => {
  const userEmail = getUserEmail();
  if (!userEmail) return [];

  try {
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', userEmail.toLowerCase()),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(invitationsQuery);
    const invitations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter out expired invitations
    const validInvitations = invitations.filter(inv => {
      return new Date(inv.expiresAt) > new Date();
    });

    console.log('📬 Found', validInvitations.length, 'pending invitations');
    return validInvitations;
    
  } catch (error) {
    console.error('❌ Error getting pending invitations:', error);
    return [];
  }
};

/**
 * Get contributors for a child
 * @param {string} childId - ID of the child
 * @returns {Promise<Array>} List of contributor details
 */
export const getChildContributors = async (childId) => {
  try {
    const childDoc = await getDoc(doc(db, 'children', childId));
    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    const childData = childDoc.data();
    const contributorIds = childData.contributors || [];

    // Get details for each contributor
    const contributorDetails = await Promise.all(
      contributorIds.map(async (contributorId) => {
        const userDoc = await getDoc(doc(db, 'users', contributorId));
        
        let contributorName = null;
        let contributorEmail = null;
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          contributorName = userData.name;
          contributorEmail = userData.email;
        }
        
        // If email is missing and this is the current user, try to get from Firebase Auth
        if (!contributorEmail) {
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === contributorId && currentUser.email) {
            contributorEmail = currentUser.email;
            // Also update the Firestore document with the email for future use
            if (userDoc.exists()) {
              try {
                await updateDoc(doc(db, 'users', contributorId), {
                  email: currentUser.email,
                }, { merge: true });
              } catch (updateError) {
                console.warn('Could not update user email in Firestore:', updateError);
              }
            }
          }
        }
        
        // Get contributor name - prefer name, then extract from email, finally "User"
        if (!contributorName) {
          if (contributorEmail) {
            // Extract name from email (part before @) and capitalize
            const emailName = contributorEmail.split('@')[0];
            contributorName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          } else {
            contributorName = 'User'; // Better than "Unknown"
          }
        }
        
        return {
          userId: contributorId,
          name: contributorName,
          email: contributorEmail,
          role: 'contributor',
        };
      })
    );

    // Add owner
    const ownerDoc = await getDoc(doc(db, 'users', childData.ownerId));
    const ownerData = ownerDoc.exists() ? ownerDoc.data() : {};
    
    // Get owner name - use name, email, or "Owner" (never "You" as that's only for current user)
    // Also check if name is "You" and replace it with email or "Owner"
    let ownerName = ownerData.name || ownerData.email || 'Owner';
    if (ownerName === 'You' || ownerName === 'you') {
      // If owner's name is "You", use email instead, or "Owner" as fallback
      ownerName = ownerData.email || 'Owner';
    }
    
    const allContributors = [
      {
        userId: childData.ownerId,
        name: ownerName,
        email: ownerData.email,
        role: 'owner',
      },
      ...contributorDetails,
    ];

    return allContributors;
    
  } catch (error) {
    console.error('❌ Error getting contributors:', error);
    return [];
  }
};

/**
 * Get pending invitations for a child (sent by owner)
 * Filters out expired invitations and marks them as expired in the database
 * @param {string} childId - ID of the child
 * @returns {Promise<Array>} List of valid pending invitations
 */
export const getChildPendingInvitations = async (childId) => {
  try {
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('childId', '==', childId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(invitationsQuery);
    const now = new Date();
    const validInvitations = [];
    
    // Process each invitation
    for (const doc of snapshot.docs) {
      const invitationData = {
        id: doc.id,
        ...doc.data(),
      };
      
      // Check if expired
      if (new Date(invitationData.expiresAt) < now) {
        // Mark as expired in database
        try {
          await updateDoc(doc.ref, { status: 'expired' });
          console.log('⏰ Marked expired invitation:', doc.id);
        } catch (updateError) {
          console.error('Error updating expired invitation status:', updateError);
        }
      } else {
        // Only include non-expired invitations
        validInvitations.push(invitationData);
      }
    }
    
    return validInvitations;
    
  } catch (error) {
    console.error('❌ Error getting child invitations:', error);
    return [];
  }
};

/**
 * Remove yourself as a contributor from a child
 * @param {string} childId - ID of the child
 * @returns {Promise<void>}
 */
export const removeSelfAsContributor = async (childId) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    console.log('👋 Removing self as contributor:', { childId, userId });

    // Get child document
    const childRef = doc(db, 'children', childId);
    const childDoc = await getDoc(childRef);

    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    const childData = childDoc.data();

    // Verify current user is a contributor (not the owner)
    if (childData.ownerId === userId) {
      throw new Error('Owner cannot remove themselves. Transfer ownership first.');
    }

    const currentContributors = childData.contributors || [];
    if (!currentContributors.includes(userId)) {
      throw new Error('You are not a contributor of this child');
    }

    // Remove self from child's contributors array
    const updatedContributors = currentContributors.filter(id => id !== userId);
    await updateDoc(childRef, {
      contributors: updatedContributors,
      updatedAt: new Date().toISOString(),
    });

    // Remove child from user's childrenAccess
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentAccess = userDoc.data().childrenAccess || [];
      const updatedAccess = currentAccess.filter(id => id !== childId);
      await updateDoc(userRef, {
        childrenAccess: updatedAccess,
      });
    }

    console.log('✅ Successfully removed self as contributor');
    
  } catch (error) {
    console.error('❌ Error removing self as contributor:', error);
    throw error;
  }
};

/**
 * Remove a contributor from a child (owner only)
 * @param {string} childId - ID of the child
 * @param {string} contributorUserId - ID of the user to remove
 * @returns {Promise<void>}
 */
export const removeContributor = async (childId, contributorUserId) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    console.log('🗑️ Removing contributor:', { childId, contributorUserId });

    // Get child document to verify ownership
    const childRef = doc(db, 'children', childId);
    const childDoc = await getDoc(childRef);

    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    const childData = childDoc.data();

    // Verify current user is the owner
    if (childData.ownerId !== userId) {
      throw new Error('Only the owner can remove contributors');
    }

    // Cannot remove the owner
    if (contributorUserId === childData.ownerId) {
      throw new Error('Cannot remove the owner');
    }

    // Remove from child's contributors array
    const currentContributors = childData.contributors || [];
    if (!currentContributors.includes(contributorUserId)) {
      throw new Error('User is not a contributor');
    }

    const updatedContributors = currentContributors.filter(id => id !== contributorUserId);
    await updateDoc(childRef, {
      contributors: updatedContributors,
      updatedAt: new Date().toISOString(),
    });

    // Best-effort cleanup for contributor's local access list.
    // Firestore rules only allow users to write their own /users/{uid} docs,
    // so owner-initiated contributor removal may not be able to update this directly.
    // We rely on loadChildren() access filtering as the source of truth.
    try {
      const userRef = doc(db, 'users', contributorUserId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentAccess = userDoc.data().childrenAccess || [];
        const updatedAccess = currentAccess.filter(id => id !== childId);
        await updateDoc(userRef, {
          childrenAccess: updatedAccess,
        });
      }
    } catch (cleanupError) {
      console.warn('Could not remove child from contributor access list (non-blocking):', cleanupError);
    }

    console.log('✅ Contributor removed successfully');
    
  } catch (error) {
    console.error('❌ Error removing contributor:', error);
    throw error;
  }
};

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send invitation email using Resend
 * @param {Object} invitationData - Invitation details
 */
const sendInvitationEmail = async (invitationData) => {
  try {
    // Get API key from EAS environment variable
    // In production builds, Constants.expoConfig.extra contains values from app.config.js
    // In dev, it's also available via Constants.expoConfig
    const RESEND_API_KEY = process.env.RESEND_API_KEY || Constants.expoConfig?.extra?.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      console.error('💡 Invitation created but email not sent. User can accept via invitation code.');
      throw new Error('Email service unavailable on client. Configure server-side Resend integration.');
    }
    
    console.log('📧 Sending email via Resend...');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #2D3436; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #87C38F 0%, #B5E3B8 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .child-info { background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .child-avatar { font-size: 48px; margin-bottom: 10px; }
    .button { display: inline-block; background: #87C38F; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #6B9E6F; }
    .footer { text-align: center; padding: 20px; color: #95A5A6; font-size: 14px; }
    .invite-code { background: #F8F9FA; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .code { font-family: 'Courier New', monospace; font-size: 18px; color: #87C38F; font-weight: 600; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Invited to MemoryLane!</h1>
    </div>
    <div class="content">
      <p>Hi there!</p>
      
      <p><strong>${invitationData.inviterName}</strong> (${invitationData.inviterEmail}) has invited you to contribute to <strong>${invitationData.childName}'s</strong> memories on MemoryLane.</p>
      
      <div class="child-info">
        <h2 style="margin: 10px 0; color: #2D3436;">${invitationData.childName}</h2>
        <p style="color: #636E72; margin: 0;">You'll be able to add and view memories together</p>
      </div>
      
      <p><strong>What is MemoryLane?</strong></p>
      <p>MemoryLane is a private family journal app where you can capture and share precious moments together. Add photos, voice notes, and text memories - all in one beautiful timeline.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a 
          href="memorylane://invitation/${invitationData.id}" 
          style="display: inline-block; background: #87C38F; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; -webkit-appearance: none;"
        >
          Accept Invitation
        </a>
      </div>
      <p style="text-align: center; color: #636E72; font-size: 12px; margin-top: 10px;">
        💡 If the button doesn't work, copy the invitation code below and paste it in the app
      </p>
      
      <div class="invite-code">
        <p style="margin: 0 0 10px 0; color: #636E72; font-size: 14px;"><strong>Or use this invitation code in the app:</strong></p>
        <div class="code">${invitationData.id}</div>
      </div>
      
      <p style="color: #636E72; font-size: 14px; margin-top: 30px;">
        <strong>How to accept:</strong><br>
        1. Download MemoryLane from the App Store (if you don't have it)<br>
        2. Create an account or sign in<br>
        3. Tap the 🔔 bell icon in the top right of the home screen<br>
        4. Paste the invitation code above into the text field<br>
        5. Tap "Accept" to join
      </p>
      
      <p style="color: #636E72; font-size: 14px;">
        <strong>Note:</strong> This invitation expires in 7 days.
      </p>
    </div>
    <div class="footer">
      <p>MemoryLane - Your Family's Memory Journal</p>
      <p>This invitation was sent to ${invitationData.inviteeEmail}</p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MemoryLane <invitations@mymemorlylane.com>',
        to: invitationData.inviteeEmail,
        subject: `${invitationData.inviterName} invited you to MemoryLane for ${invitationData.childName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Resend API error:', errorData);
      throw new Error(`Email sending failed: ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result.id);
    return result;
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw - invitation is still created in Firestore
    // User can accept via manual invitation code
    throw error;
  }
};

/**
 * Check if user has access to a child
 * @param {string} childId - ID of the child
 * @param {string} userId - ID of the user (optional, defaults to current user)
 * @returns {Promise<boolean>}
 */
export const hasChildAccess = async (childId, userId = null) => {
  const uid = userId || getUserId();
  if (!uid) return false;

  try {
    const childDoc = await getDoc(doc(db, 'children', childId));
    if (!childDoc.exists()) return false;

    const childData = childDoc.data();
    
    // Check if owner
    if (childData.ownerId === uid) return true;
    
    // Check if contributor
    const contributors = childData.contributors || [];
    return contributors.includes(uid);
    
  } catch (error) {
    console.error('Error checking child access:', error);
    return false;
  }
};