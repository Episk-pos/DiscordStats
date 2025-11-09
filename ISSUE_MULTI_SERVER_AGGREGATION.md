# Issue: Add Multi-Server Aggregation Support with Per-User Configuration

## Summary

Add support for aggregating Discord statistics across multiple servers with per-user configuration. This will allow the backend to monitor multiple Discord servers simultaneously, while giving end-users the ability to select which servers to include in their personalized analytics views.

## User Stories

### As a Server Administrator
- I want to configure the backend to monitor multiple Discord servers so that I can provide analytics across all my communities
- I want to manage server credentials centrally so that I don't have to redeploy for each new server
- I want to see which servers are currently being monitored and their connection status

### As an End User
- I want to select which of my Discord servers to include in my analytics so that I can focus on the communities I care about
- I want to save my server preferences so that I don't have to reconfigure them every time
- I want to see aggregated statistics across all my selected servers in a single dashboard
- I want to toggle individual servers on/off to compare different communities
- I want to see per-server breakdowns as well as cross-server aggregations

## Current Behavior

Currently, the application:
- Only supports viewing statistics for one Discord server at a time
- Requires manual server ID input for each query
- Has no persistent user preferences or settings
- No aggregation capabilities across multiple servers

## Proposed Behavior

### Backend Changes

1. **Multi-Server Configuration**
   - Support multiple Discord bot tokens/credentials in configuration
   - Store server configurations in a database or config file
   - Monitor multiple servers simultaneously via single bot or multiple bots
   - Health checks for each monitored server connection

2. **Server Registry**
   - Database schema to store monitored servers
   - API endpoints to manage server configurations (CRUD operations)
   - Server metadata (name, icon, description, join date, etc.)
   - Connection status tracking

3. **Aggregation Engine**
   - New API endpoints for multi-server statistics
   - Query parameter or request body to specify which servers to aggregate
   - Efficient data aggregation across multiple guilds
   - Support for both aggregated and per-server breakdowns

### Frontend Changes

1. **User Settings Page**
   - New settings/preferences screen
   - List of all available monitored servers
   - Checkbox/toggle interface to select servers for aggregation
   - Save preferences to localStorage or user profile (if auth implemented)
   - Server search/filter capabilities

2. **Enhanced Dashboard**
   - Toggle between "All Servers" and "Individual Server" views
   - Multi-server statistics with clear labeling
   - Comparison mode to view metrics side-by-side
   - Server selector dropdown for quick filtering
   - Visual indicators showing which servers are included in current view

3. **Server Management UI** (Admin)
   - Admin panel to add/remove monitored servers
   - Display server connection status
   - Test connectivity for each server
   - View server-specific configuration

## Technical Requirements

### Backend API Endpoints

```
GET    /api/discord/servers                    # List all monitored servers
POST   /api/discord/servers                    # Add new server to monitor
DELETE /api/discord/servers/:serverId          # Remove server from monitoring
GET    /api/discord/servers/:serverId/health   # Check server connection status

GET    /api/discord/stats/multi/guild          # Aggregated guild stats
POST   /api/discord/stats/multi/messages       # Aggregated message stats
  Body: { serverIds: string[] }

GET    /api/discord/stats/multi/activity       # Cross-server activity
  Query: ?serverIds=id1,id2,id3

GET    /api/discord/stats/comparison           # Side-by-side comparison
  Query: ?serverIds=id1,id2,id3
```

### Database Schema

```typescript
// Server Configuration
interface MonitoredServer {
  id: string;                    // Guild ID
  name: string;
  icon?: string;
  description?: string;
  botToken?: string;             // Optional: separate bot per server
  addedAt: Date;
  lastSeen: Date;
  isActive: boolean;
  settings: {
    messageLimit: number;
    refreshInterval: number;
  };
}

// User Preferences (if implementing user auth)
interface UserPreferences {
  userId: string;
  selectedServers: string[];     // Array of server IDs
  defaultView: 'aggregated' | 'individual';
  savedAt: Date;
}
```

### Frontend State Management

```typescript
// User Settings Context/Store
interface UserSettings {
  selectedServerIds: string[];
  viewMode: 'aggregated' | 'individual' | 'comparison';
  availableServers: MonitoredServer[];
}

// Aggregated Stats Types
interface AggregatedGuildStats {
  totalServers: number;
  totalMembers: number;
  totalOnlineMembers: number;
  totalChannels: number;
  perServerStats: GuildStats[];
}

interface AggregatedMessageStats extends MessageStats {
  perServerStats: {
    serverId: string;
    serverName: string;
    stats: MessageStats;
  }[];
}
```

## Implementation Considerations

### Phase 1: Backend Multi-Server Support
- [ ] Add database/storage layer for server configurations
- [ ] Refactor Discord client to support multiple simultaneous connections
- [ ] Implement server registry CRUD endpoints
- [ ] Create aggregation logic for statistics
- [ ] Add health monitoring for each server connection
- [ ] Update existing endpoints to support server arrays

### Phase 2: Frontend Settings & Selection
- [ ] Create Settings/Preferences page component
- [ ] Implement server selection UI with checkboxes
- [ ] Add localStorage or API-based preference persistence
- [ ] Create context/state management for selected servers
- [ ] Update Dashboard to use selected servers from settings

### Phase 3: Aggregated Views
- [ ] Implement aggregated statistics display
- [ ] Add per-server breakdowns in expandable sections
- [ ] Create comparison view with side-by-side metrics
- [ ] Add visual indicators for included/excluded servers
- [ ] Implement server filtering and search

### Phase 4: Admin Interface (Optional)
- [ ] Create admin panel for server management
- [ ] Add server connection testing
- [ ] Implement bot token rotation/management
- [ ] Add audit logs for server changes

## UI/UX Mockup Ideas

### Settings Page
```
┌─────────────────────────────────────────┐
│  Settings                               │
│                                         │
│  Your Discord Servers                   │
│  ┌───────────────────────────────────┐ │
│  │ ✓ My Gaming Community              │ │
│  │   1,234 members • Online           │ │
│  ├───────────────────────────────────┤ │
│  │ ✓ Dev Team Server                  │ │
│  │   56 members • Online              │ │
│  ├───────────────────────────────────┤ │
│  │ ☐ Friends Hangout                  │ │
│  │   23 members • Online              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Save Preferences]                     │
└─────────────────────────────────────────┘
```

### Aggregated Dashboard Header
```
Viewing: My Gaming Community, Dev Team Server (2 servers)
[Change Servers] [View Mode: Aggregated ▼]
```

## Security Considerations

- [ ] Ensure bot tokens are stored securely (encrypted at rest)
- [ ] Implement rate limiting for aggregated queries
- [ ] Validate server access permissions
- [ ] Add authentication if managing user preferences server-side
- [ ] Audit logging for server configuration changes
- [ ] Prevent unauthorized access to server management endpoints

## Performance Considerations

- [ ] Implement caching for aggregated statistics
- [ ] Consider pagination for large server lists
- [ ] Optimize database queries for multi-server aggregation
- [ ] Add loading states for incremental data fetching
- [ ] Consider background jobs for expensive aggregations
- [ ] Set reasonable limits on number of servers per aggregation

## Testing Requirements

- [ ] Unit tests for aggregation logic
- [ ] Integration tests for multi-server queries
- [ ] E2E tests for settings persistence
- [ ] Load testing with multiple servers
- [ ] Test edge cases (server offline, partial data, etc.)

## Documentation Updates

- [ ] Update README with multi-server setup instructions
- [ ] Add API documentation for new endpoints
- [ ] Create user guide for server selection feature
- [ ] Document admin panel usage
- [ ] Add troubleshooting section for multi-server issues

## Acceptance Criteria

### Backend
- [ ] Backend can be configured to monitor multiple Discord servers simultaneously
- [ ] API endpoints exist to retrieve list of monitored servers
- [ ] API endpoints support aggregating statistics across specified server IDs
- [ ] Server health/connection status is trackable and queryable
- [ ] Proper error handling when servers are offline or inaccessible

### Frontend
- [ ] Settings page allows users to see all available servers
- [ ] Users can select/deselect servers to include in aggregations
- [ ] User preferences are persisted (localStorage minimum)
- [ ] Dashboard displays aggregated statistics for selected servers
- [ ] Clear visual indication of which servers are included
- [ ] Ability to switch between aggregated and individual server views

### User Experience
- [ ] Smooth transitions when changing server selection
- [ ] Loading states during aggregation calculations
- [ ] Error messages when servers are unavailable
- [ ] Responsive design on all screen sizes
- [ ] Intuitive server selection interface

## Future Enhancements

- User authentication and server-side preference storage
- Real-time updates via WebSocket
- Scheduled reports across multiple servers
- Advanced filtering (by date range, channel type, etc.)
- Export aggregated data to CSV/JSON
- Shareable dashboard links
- Server comparison analytics (growth rates, engagement metrics, etc.)
- Cross-server user activity tracking (for users in multiple servers)

## Related Issues

None yet - this is a foundational feature request

## Labels

`enhancement`, `feature`, `backend`, `frontend`, `multi-server`, `aggregation`, `high-priority`

---

**Estimated Complexity:** High
**Estimated Effort:** Large (3-4 weeks)
**Priority:** Medium-High
**Dependencies:** None
