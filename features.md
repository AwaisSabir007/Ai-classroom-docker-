# EduSense AI: Full Feature List

EduSense is an advanced, polyglot microservice-based educational platform designed to augment teachers with AI and automatically track student engagement. Below is a comprehensive list of all the features implemented across the platform.

## 1. Live Class Broadcasting
- **WebRTC Camera & Screen Sharing**: Teachers can broadcast high-quality video or share their screens directly through the browser.
- **Live Server-Side Audio Streaming**: Microphone audio is sliced into binary chunks natively in the browser and streamed continuously to a high-speed Rust WebSocket gateway without dropping frames.
- **End-Session Overlays**: Once a session concludes, students see a custom "Session Ended" dashboard.

## 2. Polyglot AI Pipeline (Transcriptions & Summaries)
- **Live Whisper AI Transcriptions**: Rust streams audio chunks instantly to a Python FastAPI microservice running the OpenAI Whisper model, capturing everything the teacher says in real-time.
- **Auto-Generated Lecture Summaries**: When the session ends, a complete transcript is sent to OpenAI's GPT-4o-mini to generate a clean, concise summary of the entire session.
- **Class-Wide Summary Broadcasting**: The AI summary is instantly shown on the student's ending screen and also pushed to all enrolled students as a persistent Notification.

## 3. Real-Time Attention & Emotion Analytics
- **AI Face Monitoring**: Using client-side facial analysis (Face-API), the platform continuously scans students' webcams to determine their emotional state (happy, neutral, focused, bored, distracted).
- **Live Engagement Scoring**: Calculates a real-time `Attention Score` (0-100%) and streams it to the teacher’s dashboard via Socket.io.
- **Smart Automated Attendance**: The system algorithmically calculates a student's `averageFocus` throughout a live session. If they maintain a score of 60% or higher, they are automatically marked as "Present".

## 4. Gamification Engine
- **XP & Leveling System**: Students earn Experience Points (XP) for maintaining focus, joining classes, and completing assignments.
- **Dynamic Streaks**: Tracks daily activity streaks to encourage consistent learning behavior.
- **Achievement Badges**: The backend automatically awards achievement badges (e.g., "7-Day Streak") and sends a pop-up system notification.

## 5. Assessment & Anti-Cheat Quizzes
- **AI Quiz Generation**: Teachers can automatically generate custom quizzes utilizing OpenAI.
- **Anti-Cheat Mechanisms**: Quizzes have enforced time limits, window-switching flags, and strict tracking mechanisms to prevent academic dishonesty.
- **Assignment Uploads**: Students can upload textbook answers or PDFs, which the system can grade.

## 6. Document & Library Management
- **Centralized PDF Library**: Teachers can upload and share reference books, materials, and PDFs.
- **Smart Reading Sessions**: When students read assignments, the system tracks the `time_spent_seconds` and even tracks their `bored_count` while they read the document.

## 7. Communication & Ecosystem
- **Global Notification System**: Real-time push notifications for class starts, badge unlocks, and lecture summaries.
- **Direct Messaging**: Built-in 1-to-1 direct messaging system for students to contact their teachers or peers.
- **Join Codes**: Secure alphanumeric class join codes for simple student onboarding.

## 8. Analytics & Reporting
- **Teacher Insights Dashboard**: Teachers can view peaks and valleys in classroom attention alongside the transcript.
- **Downloadable PDF Reports**: The backend dynamically builds PDF reports of classroom attention and attendance metrics for administrative reporting.
