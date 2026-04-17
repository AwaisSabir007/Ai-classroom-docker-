# EduSense AI

An AI-powered classroom platform for universities and schools. Teacher-first design with real-time attention monitoring, smart book reading, gamification, and deep analytics.

## Architecture

- **Frontend**: React 18 + TypeScript with Vite, TailwindCSS, shadcn/ui, Recharts
- **Backend**: Express.js with TypeScript, PostgreSQL via Drizzle ORM
- **Real-time**: Socket.io for WebSocket-based live attention streaming between student and teacher
- **Auth**: Session-based authentication with express-session + connect-pg-simple

## Key Features

- **Role-based auth**: Teacher, Student, Admin roles with different dashboards
- **Admin Section**: Full admin dashboard with real platform-wide analytics (user counts, session stats, avg attention, top students leaderboard, activity feed). User management page to create/edit/delete students and teachers. Class oversight page showing all classes across all teachers with student enrollment details. Broadcast announcement system to send notifications to all users, students only, teachers only, or specific classes.
- **Live Sessions with WebSocket Streaming**: Real-time attention monitoring via Socket.io. Student browsers stream simulated AI attention scores and emotions to the teacher dashboard every 3 seconds over WebSocket connections. Teacher sees live student grid with attention rings, emotion badges, boredom alerts, and class attention wave chart — all updated in real-time.
- **Class Management**: Create classes with join codes, manage students, assignments
- **Book Library**: Add books, assign to classes with timers and due dates
- **Face Monitor / Camera AI**: Reusable `FaceMonitor` component (`client/src/components/face-monitor.tsx`) activates the student's webcam via `getUserMedia` for facial sentiment analysis. Shows a PiP video preview (minimizable) with "AI Active" badge, face-detection overlay, and emotion/score readout. Camera consent dialog (`CameraConsentDialog`) gates activation. If camera access fails (denied/unavailable), falls back automatically to simulated scoring. Used in both live sessions and book reader.
- **PDF Upload & Reader**: Teachers can upload actual PDF files when adding books (drag-and-drop or click, 50MB max). Students read real PDFs in-browser using react-pdf with zoom controls, page navigation, and completion tracking. Books without PDFs fall back to sample text reader.
- **Parent Reports**: Teachers can generate PDF progress reports per student per class. Reports include attendance, attention scores, XP/level/streak, quiz performance, badges, and reading completion. Teachers can preview reports in-app and download as professionally formatted PDFs. Authorization ensures teachers can only access reports for their own classes. Route: `/teacher/reports`.
- **AI Doubt Solver**: Chat interface in the book reader where students ask questions about what they're reading. Uses OpenAI (via Replit AI Integrations) with streaming SSE responses. Context-aware: sends book title, subject, and current page text (extracted from PDF or sample content) so the AI can give relevant answers. Zod-validated input with chat history support.
- **AI Teaching Advisor**: Full-page chat interface for teachers at `/teacher/ai-advisor`. The AI has access to real class data (student XP, attention scores, session counts, boredom events, learning styles) and provides data-driven advice on improving teaching effectiveness, identifying at-risk students, and boosting engagement. Features quick-prompt cards, streaming SSE responses, and disconnect handling. Student data uses first names only for privacy.
- **Assignment Submissions**: Students can upload PDF or Word (.docx) documents as assignment submissions from their dashboard. Each assignment card shows a drag-and-drop upload zone. Text is automatically extracted from uploaded files for plagiarism analysis. Teachers view, download, and grade submissions at `/teacher/submissions` with a grading dialog (0-100 score + written feedback). Students see their grade and feedback inline.
- **Plagiarism Detection**: Two-tier system: (1) Quiz plagiarism at `/teacher/plagiarism` compares answer patterns — flags matching wrong answers. (2) Document plagiarism at `/teacher/submissions` uses 4-gram Jaccard similarity + exact sentence matching + 12-word sliding window fallback on extracted text. Enhanced with side-by-side highlighted text comparison showing copied passages in context for each student. Teachers can "Flag & Notify All Students" or notify individual pairs — sends `plagiarism_alert` notifications to involved students with similarity %, copied passages, risk level, and who they matched with. Notifications render with special formatting (highlighted quoted passages, red styling). Server validates recipient IDs against actual assignment submissions for security.
- **Smart Reader**: Page-by-page reading with boredom detection simulation and enrichment content overlays
- **Analytics**: Weekly attention trends, learning style radar charts, dropout risk flags, enrichment effectiveness
- **Gamification**: XP system, levels, badges, streak tracking, leaderboard per class
- **Quiz System**: Teachers create quizzes with multiple-choice questions, optional timer, and anti-cheat (tab-switch detection, fullscreen enforcement, copy/paste blocking). Students take quizzes and earn XP/badges.
- **Student Messaging**: Direct messages between classmates within the same class only (safety-enforced). Two-panel chat UI at `/student/messages` with conversation list, chat bubbles, new message dialog with classmate search, unread badges in sidebar, and 10-second polling for new messages. Backend verifies classmate relationship before allowing messaging.
- **Notifications**: Real-time notification bell with type-coded alerts

## Demo Accounts

| Role | Username | Password |
|------|----------|----------|
| Teacher | teacher1 | password123 |
| Student | student1 | password123 |
| Admin | admin | password123 |

## Project Structure

```
client/src/
├── pages/
│   ├── login.tsx              # Auth page with demo account shortcuts
│   ├── teacher/
│   │   ├── dashboard.tsx      # Teacher home with stats + charts
│   │   ├── classes.tsx        # Class management (CRUD)
│   │   ├── class-detail.tsx   # Class detail with tabs: students, sessions, assignments, quizzes, leaderboard
│   │   ├── session.tsx        # Live session with real-time WebSocket attention grid
│   │   ├── analytics.tsx      # Analytics dashboard with Recharts
│   │   ├── quizzes.tsx        # Quiz management (create, view results)
│   │   └── books.tsx          # Book library management
│   ├── student/
│   │   ├── dashboard.tsx      # Student home with XP card + assignments + quizzes + live sessions
│   │   ├── session.tsx        # Student live session page — streams attention data via WebSocket
│   │   ├── profile.tsx        # Profile with badges, stats, activity chart
│   │   ├── quiz.tsx           # Quiz taking with timer + anti-cheat
│   │   ├── reader.tsx         # Book reader with enrichment overlay
│   │   └── messages.tsx       # Student-to-student direct messaging
│   └── admin/
│       ├── dashboard.tsx      # Admin overview with real analytics + announcement system
│       ├── users.tsx          # User management (create/edit/delete students & teachers)
│       └── classes.tsx        # Class oversight across all teachers
├── components/
│   ├── app-sidebar.tsx        # Role-aware sidebar with navigation
│   ├── page-header.tsx        # Sticky header with notifications
│   ├── notification-bell.tsx  # Notification popover
│   ├── face-monitor.tsx       # Webcam face monitor PiP + CameraConsentDialog
│   ├── pdf-reader.tsx         # PDF renderer using react-pdf with zoom/navigation
│   └── stat-card.tsx          # Reusable stat card
├── lib/
│   ├── socket.ts              # Socket.io client singleton (getSocket, disconnectSocket)
│   └── queryClient.ts         # TanStack Query client with default fetcher
server/
├── routes.ts                  # All API endpoints
├── storage.ts                 # Database storage layer + seed data
├── socket.ts                  # Socket.io server setup with session auth sharing
shared/
└── schema.ts                  # All Drizzle schemas + types
```

## WebSocket Events (Socket.io)

- `teacher:join-session` — Teacher joins a session room
- `student:join-session` — Student joins and starts streaming
- `student:attention` — Student sends {sessionId, score, emotion} every 3s
- `attention:update` — Server relays student attention data to teacher
- `student:joined` / `student:left` — Connection events for the teacher dashboard
- `session:ended` — Teacher broadcasts session end to all connected students
- `session:current-students` — Teacher receives list of currently connected students on join

## Database Tables

- `users` - all users with roles, XP, level, streak, learning style
- `classes` - teacher classes with join codes
- `class_enrollments` - student-class relationships
- `sessions_log` - live session records with attention summaries
- `attention_scores` - per-student per-session attention + emotion data (persisted from WebSocket stream)
- `books` - book library
- `assignments` - book assignments to classes
- `reading_sessions` - student reading progress
- `notifications` - user notifications
- `badges` - earned achievement badges
- `quizzes` + `quiz_attempts` - quiz system
- `direct_messages` - student-to-student messaging (classmates only)

## Color Palette

- Primary Brand: `#1E3A5F` (deep navy)
- Primary Action: `#2563EB` (blue)
- Secondary: `#0EA5E9` (sky)
- Surface Light: `#EFF6FF`
- Success: `#16A34A`
- Warning: `#D97706`
- Danger: `#DC2626`
- Purple: `#7C3AED`
