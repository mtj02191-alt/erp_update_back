# WebSocket Notifications Usage

## Installation

First, install the required packages:
```bash
npm install @nestjs/websockets@^10.0.0 @nestjs/platform-socket.io@^10.0.0 socket.io --legacy-peer-deps
```

## Frontend Connection

### Connect to WebSocket

```javascript
import { io } from 'socket.io-client';

// Connect to notifications namespace
const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: 'your-jwt-token-here' // JWT token from login
  },
  // Or pass token in query
  // query: { token: 'your-jwt-token-here' }
  // Or in Authorization header
  // extraHeaders: { Authorization: 'Bearer your-jwt-token-here' }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to notifications');
});

socket.on('disconnect', () => {
  console.log('Disconnected from notifications');
});

// Listen for new notifications
socket.on('new_notification', (notification) => {
  console.log('New notification received:', notification);
  // Update UI with new notification
  // {
  //   id: number,
  //   title: string,
  //   message: string,
  //   type: 'info' | 'success' | 'warning' | 'error' | 'donation' | 'system',
  //   link: string,
  //   metadata: object,
  //   created_at: Date,
  //   is_read: false
  // }
});

// Listen for unread count updates
socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
  // Update badge/counter in UI
});

// Mark notification as read
socket.emit('mark_as_read', { notificationId: 123 }, (response) => {
  if (response.success) {
    console.log('Notification marked as read');
  }
});

// Get unread count
socket.emit('get_unread_count', {}, (response) => {
  if (response.success) {
    console.log('Unread count:', response.count);
  }
});
```

## Events

### Client → Server

- `mark_as_read`: Mark a notification as read
  ```javascript
  socket.emit('mark_as_read', { notificationId: 123 });
  ```

- `get_unread_count`: Get current unread count
  ```javascript
  socket.emit('get_unread_count', {});
  ```

### Server → Client

- `new_notification`: New notification received
  ```javascript
  socket.on('new_notification', (notification) => {
    // Handle new notification
  });
  ```

- `unread_count`: Unread count update
  ```javascript
  socket.on('unread_count', ({ count }) => {
    // Update UI counter
  });
  ```

## Authentication

The WebSocket connection requires JWT authentication. Pass the token in one of these ways:

1. **In auth object** (recommended):
   ```javascript
   const socket = io('http://localhost:3000/notifications', {
     auth: { token: 'your-jwt-token' }
   });
   ```

2. **In query string**:
   ```javascript
   const socket = io('http://localhost:3000/notifications?token=your-jwt-token');
   ```

3. **In Authorization header**:
   ```javascript
   const socket = io('http://localhost:3000/notifications', {
     extraHeaders: { Authorization: 'Bearer your-jwt-token' }
   });
   ```

## Example React Hook

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useNotifications = (token) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:3000/notifications', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to notifications');
    });

    newSocket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    newSocket.on('unread_count', ({ count }) => {
      setUnreadCount(count);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const markAsRead = (notificationId) => {
    if (socket) {
      socket.emit('mark_as_read', { notificationId });
    }
  };

  return { socket, notifications, unreadCount, markAsRead };
};
```



