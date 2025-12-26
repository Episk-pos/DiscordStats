# Implementation Plan: Issues #1-8

## Executive Summary

This document outlines the implementation strategy for GitHub issues #1-8 of the DiscordStats project. The issues fall into two main feature tracks:

1. **Multi-Server Aggregation** (Issues #1 & #2) - Infrastructure for monitoring multiple Discord servers
2. **RallyRound Integration** (Issues #3-8) - Live session management with Discord voice channels

---

## Current Codebase State

| Component | Status |
|-----------|--------|
| Frontend | React 19 + Vite + TypeScript, Recharts visualizations |
| Backend | Express + TypeScript + discord.js |
| Database | **None** - currently stateless |
| Authentication | OAuth endpoints exist but not integrated |
| Voice Features | **None** - no @discordjs/voice integration |
| RallyRound | **None** - no integration exists |

---

## Issue Dependency Graph

```
Issue #1/#2: Multi-Server Aggregation (Independent Track)
    └── Can be developed in parallel with RallyRound features

Issue #3: Discord OAuth Provider
    └── Issue #4: RallyRound API Client
         ├── Issue #5: Bot Commands
         ├── Issue #6: Voice Channel Presence
         │    └── Issue #8: Sound Effect Playback
         └── Issue #7: Webhook Receiver
              └── Issue #8: Sound Effect Playback
```

---

## Implementation Phases

### Phase 0: Foundation (Prerequisites)

Before implementing any issues, the following foundational work is required:

#### 0.1 Database Layer
- Add SQLite/PostgreSQL support with an ORM (Drizzle or Prisma)
- Create base schemas for sessions, users, and server configurations
- Set up migrations infrastructure

#### 0.2 Voice Infrastructure
- Install `@discordjs/voice`, `sodium-native`, `ffmpeg-static`
- Configure Discord bot with voice intents (`GuildVoiceStates`)
- Create audio resource utilities

#### 0.3 Project Structure Updates
```
server/src/
├── db/
│   ├── schema.ts          # Database schemas
│   ├── migrations/        # Migration files
│   └── index.ts           # DB connection
├── services/
│   ├── rallyround/        # RallyRound API client
│   ├── voice/             # Voice connection management
│   └── audio/             # Sound effect playback
├── commands/              # Bot command handlers
├── webhooks/              # Webhook handlers
└── utils/
    └── jwt.ts             # JWT utilities
```

---

### Phase 1: Discord OAuth Provider (Issue #3)

**Priority:** High | **Complexity:** Medium | **Dependencies:** None

#### Implementation Tasks

1. **JWT Infrastructure**
   - Install `jsonwebtoken` package
   - Create JWT signing/verification utilities
   - Configure JWT_SECRET environment variable

2. **OAuth Endpoints**
   ```
   GET  /auth/discord          - Initiate OAuth flow
   GET  /auth/discord/callback - Handle Discord callback
   GET  /auth/validate         - Validate bearer tokens
   GET  /auth/user             - Get authenticated user profile
   ```

3. **Security Requirements**
   - CSRF protection via state tokens
   - HMAC signature verification
   - 24-hour token expiration
   - CORS configuration for RallyRound origin

4. **Files to Create/Modify**
   - `server/src/routes/auth.ts` - New auth routes
   - `server/src/controllers/authController.ts` - OAuth logic
   - `server/src/utils/jwt.ts` - JWT utilities
   - `server/src/middleware/auth.ts` - Auth middleware
   - `server/src/index.ts` - Mount new routes

#### Acceptance Criteria
- [ ] OAuth flow redirects to Discord with correct scopes (`identify`, `guilds`)
- [ ] Callback exchanges code for Discord token
- [ ] JWT is generated with user info and 24h expiry
- [ ] `/auth/validate` returns user info for valid tokens
- [ ] Invalid/expired tokens return 401
- [ ] CORS allows RallyRound origin

---

### Phase 2: RallyRound API Client (Issue #4)

**Priority:** High | **Complexity:** Medium | **Dependencies:** Issue #3

#### Implementation Tasks

1. **Client Class Structure**
   ```typescript
   class RallyRoundClient {
     // Session Management
     createSession(options: CreateSessionOptions): Promise<Session>
     getSession(sessionId: string): Promise<Session>
     updateSession(sessionId: string, updates: SessionUpdate): Promise<Session>
     endSession(sessionId: string): Promise<void>

     // Participants
     addParticipant(sessionId: string, participant: Participant): Promise<void>
     removeParticipant(sessionId: string, participantId: string): Promise<void>
     updateParticipantStatus(sessionId: string, participantId: string, status: ParticipantStatus): Promise<void>

     // Signals
     raiseSignal(sessionId: string, participantId: string, signal: SignalType): Promise<void>
     clearSignal(sessionId: string, participantId: string): Promise<void>

     // Speaker Queue
     advanceSpeaker(sessionId: string): Promise<void>
     setSpeaker(sessionId: string, participantId: string): Promise<void>
     clearSpeakerQueue(sessionId: string): Promise<void>

     // Agenda
     addAgendaItem(sessionId: string, item: AgendaItem): Promise<void>
     advanceAgenda(sessionId: string): Promise<void>
     completeAgendaItem(sessionId: string, itemId: string): Promise<void>
   }
   ```

2. **Type Definitions**
   ```typescript
   type SessionState = 'scheduled' | 'active' | 'paused' | 'ended'
   type SessionMode = 'structured' | 'unstructured'
   type SignalType = 'hand' | 'point_of_order' | 'clarification' | 'information' | 'question' | 'agree' | 'disagree'
   type ParticipantStatus = 'active' | 'away' | 'speaking'
   ```

3. **Session Registry**
   - Track active sessions per guild
   - Map guild IDs to session IDs
   - Store session metadata (voice channel, facilitator, etc.)

4. **Error Handling**
   - Custom `RallyRoundError` class
   - Retry logic for transient failures (503, network errors)
   - 30-second request timeout

5. **Files to Create**
   - `server/src/services/rallyround/client.ts` - API client
   - `server/src/services/rallyround/types.ts` - Type definitions
   - `server/src/services/rallyround/errors.ts` - Error classes
   - `server/src/services/rallyround/registry.ts` - Session registry

#### Acceptance Criteria
- [ ] All client methods implemented with type safety
- [ ] Authorization header sent with all requests
- [ ] Webhook URL included in session creation
- [ ] 30-second timeout on all requests
- [ ] Retry logic for 503 errors (max 3 retries with backoff)
- [ ] Session registry tracks guild-to-session mapping

---

### Phase 3: Bot Commands (Issue #5)

**Priority:** High | **Complexity:** High | **Dependencies:** Issue #4

#### Implementation Tasks

1. **Command Parser**
   - Listen for `!rr` prefixed messages
   - Parse command, subcommand, and arguments
   - Route to appropriate handler

2. **Command Categories**

   **Session Management (Facilitator Only)**
   ```
   !rr start [title]    - Create new session
   !rr end              - End current session
   !rr pause            - Pause session
   !rr resume           - Resume session
   !rr link             - Post dashboard URL
   !rr status           - Show session status
   ```

   **Mode & Recording**
   ```
   !rr mode [structured/unstructured]  - Switch mode
   !rr record [start/stop]             - Toggle recording
   ```

   **Speaker Management (Facilitator Only)**
   ```
   !rr next             - Advance to next speaker
   !rr speaker @user    - Set specific speaker
   !rr clear            - Clear speaker queue
   !rr queue            - Display current queue
   ```

   **Participant Signals (Voice Channel Members)**
   ```
   !rr hand             - Toggle raise hand
   !rr point [type]     - Parliamentary signals
   !rr question         - Question signal
   !rr agree/disagree   - Sentiment signals
   !rr away/back        - Status updates
   ```

   **Agenda Management**
   ```
   !rr agenda           - Display agenda
   !rr agenda add [item] - Add item
   !rr agenda next      - Advance agenda
   !rr agenda done      - Mark current complete
   ```

   **Utilities**
   ```
   !rr help             - Show commands
   !rr sfx [on/off/list/name] - Sound controls
   ```

3. **Permission System**
   - Facilitator check: User must be session creator
   - Voice channel check: User must be in session's VC
   - Mode check: Some signals only in structured mode

4. **Response Formatting**
   - Emoji-enhanced responses
   - Embed messages for complex displays (queue, agenda, status)
   - Error messages with clear instructions

5. **Files to Create**
   - `server/src/commands/index.ts` - Command router
   - `server/src/commands/parser.ts` - Command parser
   - `server/src/commands/session.ts` - Session commands
   - `server/src/commands/speaker.ts` - Speaker commands
   - `server/src/commands/signals.ts` - Signal commands
   - `server/src/commands/agenda.ts` - Agenda commands
   - `server/src/commands/utils.ts` - Utility commands
   - `server/src/commands/permissions.ts` - Permission checks

#### Acceptance Criteria
- [ ] All commands functional with proper permissions
- [ ] Clear error messages for all failure scenarios
- [ ] Formatted responses with emoji indicators
- [ ] User mentions work in commands
- [ ] Signal commands toggle properly
- [ ] Help command shows categorized documentation

---

### Phase 4: Voice Channel Presence Tracking (Issue #6)

**Priority:** High | **Complexity:** Medium | **Dependencies:** Issue #4

#### Implementation Tasks

1. **Voice State Event Handler**
   - Listen for `voiceStateUpdate` events
   - Detect join, leave, and channel moves
   - Filter out bot accounts

2. **Participant Sync**
   ```typescript
   async function handleVoiceJoin(member: GuildMember, channel: VoiceChannel)
   async function handleVoiceLeave(member: GuildMember, channel: VoiceChannel)
   async function syncAllMembers(channel: VoiceChannel, sessionId: string)
   ```

3. **Bot Voice Connection**
   - Join voice channel when session starts
   - Handle disconnections with exponential backoff (max 3 retries)
   - Notify channel on connection issues

4. **Permission Validation**
   ```typescript
   function isUserInSessionVC(userId: string, guildId: string): boolean
   ```

5. **Files to Create/Modify**
   - `server/src/services/voice/connection.ts` - Voice connection management
   - `server/src/services/voice/presence.ts` - Presence tracking
   - `server/src/services/voice/sync.ts` - Member synchronization
   - `server/src/index.ts` - Register voice state event handler

#### Acceptance Criteria
- [ ] Bot joins voice channel on session start
- [ ] Existing members synced as participants on session start
- [ ] New joins trigger `addParticipant` API call
- [ ] Leaves trigger `removeParticipant` API call
- [ ] Channel moves handled correctly
- [ ] Bot accounts filtered out
- [ ] Reconnection with backoff on disconnect
- [ ] Notification posted on connection issues
- [ ] `isUserInSessionVC()` validates command permissions

---

### Phase 5: Webhook Receiver (Issue #7)

**Priority:** Medium | **Complexity:** Medium | **Dependencies:** Issues #4, #6

#### Implementation Tasks

1. **Webhook Endpoint**
   ```
   POST /webhooks/rallyround
   ```

2. **Security**
   - HMAC-SHA256 signature verification
   - Timing-safe comparison
   - Timestamp validation (reject > 5 minutes old)
   - Per-session webhook secrets

3. **Event Handlers**
   | Event | Action |
   |-------|--------|
   | `signal.raised` | Play sound, post notification with emoji |
   | `speaker.changed` | Play transition sound, announce speaker |
   | `mode.changed` | Post mode change notification |
   | `recording.changed` | Play sound, announce recording status |
   | `agenda.advanced` | Display progress, completed/current items |
   | `session.ended` | Post summary, cleanup resources |

4. **Files to Create**
   - `server/src/webhooks/rallyround.ts` - Webhook handler
   - `server/src/webhooks/security.ts` - Signature verification
   - `server/src/webhooks/events/` - Individual event handlers

#### Acceptance Criteria
- [ ] Endpoint validates HMAC signatures
- [ ] Stale timestamps rejected (> 5 minutes)
- [ ] All 6 event types handled correctly
- [ ] Sound effects triggered appropriately
- [ ] Chat messages posted for all events
- [ ] Session cleanup on `session.ended`
- [ ] Unknown events handled gracefully
- [ ] Per-session secret management

---

### Phase 6: Sound Effect Playback (Issue #8)

**Priority:** Medium | **Complexity:** Medium | **Dependencies:** Issue #6

#### Implementation Tasks

1. **Audio Infrastructure**
   - Install `@discordjs/voice`, `sodium-native`, `ffmpeg-static`
   - Create audio player per session
   - Implement player cleanup on session end

2. **Sound Assets**
   ```
   assets/sounds/
   ├── hand-raise.mp3      # Chime for hand raises
   ├── gavel-tap.mp3       # Session start/end
   ├── speaker-change.mp3  # Swoosh for speaker transitions
   ├── record-start.mp3    # Recording started
   ├── record-stop.mp3     # Recording stopped
   ├── agenda-complete.mp3 # Item completion ding
   ├── time-warning.mp3    # Time running low
   ├── error.mp3           # Error buzzer
   └── notification.mp3    # Generic notification
   ```
   Specifications: 0.5-3 seconds, 48kHz, 128kbps minimum

3. **Signal-to-Sound Mapping**
   ```typescript
   const signalSounds: Record<SignalType, string | null> = {
     'hand': 'hand-raise.mp3',
     'point_of_order': 'gavel-tap.mp3',
     'clarification': 'notification.mp3',
     'question': 'notification.mp3',
     'agree': null,  // Silent
     'disagree': null,
     'away': null,
     'back': null,
   }
   ```

4. **Playback Controls**
   - `!rr sfx on` - Enable sounds
   - `!rr sfx off` - Disable sounds
   - `!rr sfx list` - Show available sounds
   - `!rr sfx [name]` - Play specific sound

5. **Queue Management**
   - Prevent overlapping audio
   - Promise-based sequential queue
   - Skip if bot not in voice channel

6. **Files to Create**
   - `server/src/services/audio/player.ts` - Audio player management
   - `server/src/services/audio/queue.ts` - Playback queue
   - `server/src/services/audio/sounds.ts` - Sound mappings
   - `server/assets/sounds/` - Audio files

#### Acceptance Criteria
- [ ] All 9 sound files created meeting specifications
- [ ] `!rr sfx` commands work correctly
- [ ] Sounds play at appropriate events
- [ ] No overlapping audio (queue management)
- [ ] Graceful handling when bot not in voice
- [ ] Per-session enable/disable
- [ ] Cleanup on session end

---

### Phase 7: Multi-Server Aggregation (Issues #1 & #2)

**Priority:** Medium | **Complexity:** High | **Dependencies:** Phase 0 (Database)

*Note: This phase can be developed in parallel with Phases 1-6*

#### Implementation Tasks

1. **Database Schema**
   ```typescript
   // Monitored Servers
   interface MonitoredServer {
     id: string              // Guild ID
     name: string
     icon?: string
     botToken?: string       // Optional: per-server bot
     addedAt: Date
     lastSeen: Date
     isActive: boolean
     settings: {
       messageLimit: number
       refreshInterval: number
     }
   }

   // User Preferences
   interface UserPreferences {
     userId: string
     selectedServers: string[]
     defaultView: 'aggregated' | 'individual'
     savedAt: Date
   }
   ```

2. **Backend API Endpoints**
   ```
   GET    /api/discord/servers                    - List monitored servers
   POST   /api/discord/servers                    - Add server
   DELETE /api/discord/servers/:serverId          - Remove server
   GET    /api/discord/servers/:serverId/health   - Check status

   GET    /api/discord/stats/multi/guild          - Aggregated guild stats
   POST   /api/discord/stats/multi/messages       - Aggregated message stats
   GET    /api/discord/stats/comparison           - Side-by-side comparison
   ```

3. **Aggregation Engine**
   - Combine stats across multiple guilds
   - Support per-server breakdowns
   - Efficient parallel data fetching
   - Caching layer for performance

4. **Frontend Components**
   - Settings page with server selection
   - Aggregated dashboard view
   - Comparison mode (side-by-side)
   - Server health indicators

5. **Files to Create/Modify**
   - `server/src/db/schema.ts` - Database schemas
   - `server/src/routes/servers.ts` - Server management routes
   - `server/src/controllers/serversController.ts` - CRUD logic
   - `server/src/services/aggregation.ts` - Stats aggregation
   - `client/src/pages/Settings.tsx` - Settings page
   - `client/src/components/ServerSelector.tsx` - Server selection UI
   - `client/src/components/AggregatedDashboard.tsx` - Multi-server view
   - `client/src/components/ComparisonView.tsx` - Comparison mode

#### Acceptance Criteria
- [ ] Backend monitors multiple Discord servers
- [ ] API endpoints for server CRUD operations
- [ ] Aggregation endpoints combine stats across servers
- [ ] Server health status trackable
- [ ] Settings page shows available servers
- [ ] Users can select/deselect servers
- [ ] Preferences persist (localStorage minimum)
- [ ] Dashboard displays aggregated statistics
- [ ] Clear visual indication of included servers
- [ ] Toggle between aggregated and individual views

---

## Implementation Order Summary

| Order | Issue(s) | Phase | Estimated Effort |
|-------|----------|-------|------------------|
| 1 | - | Phase 0: Foundation | Medium |
| 2 | #3 | Phase 1: OAuth Provider | Medium |
| 3 | #4 | Phase 2: RallyRound Client | Medium |
| 4 | #5 | Phase 3: Bot Commands | High |
| 5 | #6 | Phase 4: Voice Presence | Medium |
| 6 | #7 | Phase 5: Webhook Receiver | Medium |
| 7 | #8 | Phase 6: Sound Effects | Medium |
| Parallel | #1, #2 | Phase 7: Multi-Server | High |

---

## New Dependencies Required

```json
{
  "dependencies": {
    "@discordjs/voice": "^0.16.0",
    "sodium-native": "^4.0.0",
    "ffmpeg-static": "^5.2.0",
    "jsonwebtoken": "^9.0.0",
    "drizzle-orm": "^0.29.0",
    "better-sqlite3": "^9.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

---

## Environment Variables (New)

```env
# Existing
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=
PORT=3002

# New - Auth
JWT_SECRET=your-secret-key-here

# New - RallyRound Integration
RALLYROUND_API_URL=https://api.rallyround.app
RALLYROUND_URL=https://rallyround.app
WEBHOOK_SECRET=your-webhook-secret

# New - Database
DATABASE_URL=file:./discordstats.db
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RallyRound API changes | High | Version API client, maintain documentation |
| Discord rate limits | Medium | Implement rate limiting, caching |
| Voice connection stability | Medium | Robust reconnection with backoff |
| Database migrations | Low | Use ORM with migration support |
| Audio codec issues | Low | Use well-tested ffmpeg-static |

---

## Testing Strategy

1. **Unit Tests**
   - RallyRound client methods
   - Command parser
   - JWT utilities
   - Aggregation logic

2. **Integration Tests**
   - OAuth flow end-to-end
   - Webhook signature verification
   - Voice connection lifecycle

3. **Manual Testing**
   - All bot commands in real Discord server
   - Sound effects in voice channels
   - Multi-server dashboard views

---

## Notes

- Issues #1 and #2 appear to be duplicates - both describe Multi-Server Aggregation
- The RallyRound integration (Issues #3-8) forms a cohesive feature set for live session management
- Phase 7 (Multi-Server) can be developed in parallel with the RallyRound features
- Consider implementing Phase 0 first to establish database infrastructure needed by multiple features
