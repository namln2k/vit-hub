# Firebase Setup Guide

VIT Hub uses Firebase Authentication for email/password accounts and Cloud Firestore for user profile documents.

## Create Firebase Resources

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. Add a Web App to the Firebase project.
3. Enable Firebase Authentication.
4. Enable the Email/Password and Google sign-in providers.
5. Create a Cloud Firestore database.
6. Copy the Firebase Web App config values.

The config values are available in:

```text
Project settings -> General -> Your apps -> Firebase SDK snippet -> Config
```

## Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in the Firebase values:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Restart the dev server after changing environment variables.

## Required Services

- Authentication: email/password user accounts and Google user accounts
- Firestore: `users` collection for user profile documents

## Firestore Rules

The app checks whether a username already exists before creating a user profile, then writes the new profile to `users/{uid}`. For local development, use rules that allow authenticated users to read the `users` collection and create their own profile document.

Example development rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == uid && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Review and harden these rules before production. In particular, restrict which fields users can write if profile roles are managed by admins.

## Common Issues

### Firebase config is missing

Confirm that `.env` exists and all `VITE_FIREBASE_*` values are filled in. Restart the dev server after changing environment variables.

### Register fails with Firestore permission errors

Check that Firestore rules allow the app to:

- query `users` by `username`
- create `users/{uid}` for the signed-in user
- read the signed-in user's profile document

### Email/password login is not available

Enable the provider in:

```text
Authentication -> Sign-in method -> Email/Password
```

### Google login is not available

Enable the provider in:

```text
Authentication -> Sign-in method -> Google
```

Also confirm that the current domain is listed under:

```text
Authentication -> Settings -> Authorized domains
```

### Reset password email is not sent

Enable the password reset template in:

```text
Authentication -> Templates -> Password reset
```

Also check spam folders. Some providers block password reset emails for test accounts, so a real email address may be more reliable for testing.
