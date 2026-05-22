# Admin Scripts

This folder contains backend scripts for administrative tasks.

## Premium Management

**File:** `admin-manage-premium.js`

Manage user premium status from the backend.

### Quick Start

1. Install dependencies:
   ```bash
   npm install firebase-admin
   ```

2. Get service account key from Firebase Console and save as `serviceAccountKey.json` in project root

3. Update the script to use the service account key (see script comments)

4. Run the script:
   ```bash
   # Enable premium
   node scripts/admin-manage-premium.js <userId> enable
   
   # Disable premium
   node scripts/admin-manage-premium.js <userId> disable
   
   # Check status
   node scripts/admin-manage-premium.js <userId> status
   ```

### Full Documentation

See [docs/ADMIN_PREMIUM_MANAGEMENT.md](../docs/ADMIN_PREMIUM_MANAGEMENT.md) for complete instructions and alternative methods.

## Security Notes

- ⚠️ **NEVER commit service account keys to version control**
- Service account keys have full admin access to your Firebase project
- Keep keys secure and restrict access to authorized personnel only

