# BIZVEN

A business venture management app for tracking time, documenting work sessions, and monitoring project progress.

## Features

### Core Functionality
- Time tracking for business projects with start/stop timer functionality
- Work session documentation through written notes or voice dictation (using Whisper API)
- Automatic summarization of session notes using an LLM
- Project progress tracking with percentage completion updates
- Categorization of work (marketing, creation, general business tasks)

### App Structure (3 Tabs)
1. **Timer Tab** - Session timer controls, project selection, work documentation interface
2. **Project Dashboard** - Overall project progress visualization, breakdown by development steps, monthly schedule view, task completion status
3. **Performance Dashboard** - Metrics tracking for deliverables, analytics for platform plays/views, goal setting and achievement monitoring, effort vs. results analysis

## Technical Implementation
- React Native for cross-platform deployment (iOS and Android)
- Firebase backend for user authentication, data storage, server infrastructure, and analytics

## Getting Started

### Prerequisites
- Node.js (latest LTS version)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tgra59/bizven-app.git
   cd bizven-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
   EXPO_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
   EXPO_PUBLIC_FIREBASE_APP_ID="your-app-id"
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
   ```

4. Start the development server:
   ```bash
   npx expo start
   ```

### Deployment

#### Firebase Deployment

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase with your project:
   ```bash
   firebase init
   ```

4. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Considerations

- Always use environment variables for Firebase configuration
- Ensure `.env` files are added to `.gitignore`
- Follow Firebase security rules for data access control
- Using Google Authentication for secure user management
- No need for password storage as we rely exclusively on Google OAuth

## License

This project is licensed under the MIT License - see the LICENSE file for details