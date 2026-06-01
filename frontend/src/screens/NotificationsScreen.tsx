import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import ScreenContainer from '../components/ui/ScreenContainer';
import notificationsApi, { NotificationItem } from '../api/notifications';
import useNotificationStore from '../store/notificationStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatRelativeTime = (dateString: string): string => {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    return 'Recently';
  }
};

const getCategoryStyles = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes('delay') || lower.includes('late')) {
    return { bg: COLORS.dangerLight, color: COLORS.danger, icon: 'clock-alert-outline' as const };
  }
  if (lower.includes('arrival') || lower.includes('eta') || lower.includes('approaching')) {
    return { bg: COLORS.accentLight, color: COLORS.accent, icon: 'bus-clock' as const };
  }
  if (lower.includes('schedule') || lower.includes('route')) {
    return { bg: COLORS.primaryLight, color: COLORS.primary, icon: 'map-marker-path' as const };
  }
  return { bg: COLORS.secondaryTint, color: COLORS.secondary, icon: 'bell-outline' as const };
};

const SkeletonCard: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonBody} />
        <View style={styles.skeletonTime} />
      </View>
    </Animated.View>
  );
};

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const localNotifications = useNotificationStore(state => state.localNotifications);

  // Combine and sort notifications reactively
  const mergedNotifications = React.useMemo(() => {
    const combined = [...localNotifications, ...notifications];
    // Filter duplicates by id
    const unique = combined.filter((item, index, self) =>
      self.findIndex(t => t.id === item.id) === index
    );
    return unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [localNotifications, notifications]);

  // Compute unread count reactively
  const unreadCount = React.useMemo(() => {
    return mergedNotifications.filter(n => !n.isRead).length;
  }, [mergedNotifications]);

  const fetchNotifications = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await notificationsApi.getAll();
      if (res.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(false);
  };

  const handleNotificationTap = async (item: NotificationItem) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === item.id ? null : item.id);

    if (!item.isRead) {
      if (item.id.startsWith('local-') || item.id === 'welcome-notification') {
        useNotificationStore.getState().markAsRead(item.id);
      } else {
        // Optimistic read update for backend notifications
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n))
        );

        try {
          await notificationsApi.markAsRead(item.id);
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
          setNotifications(prev =>
            prev.map(n => (n.id === item.id ? { ...n, isRead: false } : n))
          );
        }
      }
    }
  };

  const handleMarkAllRead = async () => {
    const unreadLocal = localNotifications.some(n => !n.isRead);
    const unreadBackend = notifications.some(n => !n.isRead);
    if (!unreadLocal && !unreadBackend) return;

    if (unreadLocal) {
      useNotificationStore.getState().markAllRead();
    }

    if (unreadBackend) {
      const previousNotifications = [...notifications];
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      try {
        const res = await notificationsApi.markAllAsRead();
        if (!res.success) {
          throw new Error(res.message);
        }
      } catch (err) {
        console.error('Failed to mark all notifications as read:', err);
        Alert.alert('Error', 'Failed to mark notifications as read.');
        setNotifications(previousNotifications);
      }
    }
  };

  // Group notifications helper
  const getGroupedNotifications = () => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    mergedNotifications.forEach(item => {
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime >= todayStart) {
        today.push(item);
      } else if (itemTime >= yesterdayStart) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = getGroupedNotifications();

  const renderNotificationCard = (item: NotificationItem) => {
    const isExpanded = expandedId === item.id;
    const catStyle = getCategoryStyles(item.typeLabel || 'Alert');

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.card,
          !item.isRead ? styles.cardUnread : styles.cardRead,
        ]}
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {/* Glowing Status Icon Badge */}
          <View style={[styles.iconContainer, { backgroundColor: catStyle.bg }]}>
            <MaterialCommunityIcons name={catStyle.icon} size={22} color={catStyle.color} />
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text 
                variant={!item.isRead ? 'bodySemibold' : 'body'} 
                style={[styles.cardTitle, !item.isRead && styles.textUnread]}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>

            <View style={styles.badgeRow}>
              {/* Colored tag chip */}
              <View style={[styles.categoryChip, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.categoryChipText, { color: catStyle.color }]}>
                  {item.typeLabel || 'Transit Update'}
                </Text>
              </View>
              <Text variant="caption" color={COLORS.textLight}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </View>

          <MaterialCommunityIcons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={COLORS.textLight} 
            style={styles.chevronIcon}
          />
        </View>

        {isExpanded && (
          <View style={styles.cardBody}>
            <View style={styles.bodyDivider} />
            <Text variant="body" color={COLORS.textMuted} style={styles.cardBodyText}>
              {item.body}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <MaterialCommunityIcons name="bell-off-outline" size={40} color={COLORS.textLight} />
      </View>
      <Text variant="h3" style={styles.emptyTitle}>All Caught Up!</Text>
      <Text variant="body" color={COLORS.textMuted} style={styles.emptyText}>
        You don't have any notifications at the moment. We'll alert you here when a bus approaches your stop or if schedules change.
      </Text>
    </View>
  );

  return (
    <ScreenContainer safe={true} style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text variant="h1" style={styles.headerTitle}>Arrival Alerts</Text>
          <Text variant="caption" color={COLORS.textMuted}>
            {unreadCount > 0 ? `${unreadCount} new alerts waiting` : 'All alerts read'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllBtn} 
            onPress={handleMarkAllRead}
            activeOpacity={0.6}
          >
            <Text variant="bodySemibold" color={COLORS.primary}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* NOTIFICATIONS LIST SCROLL */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {today.length > 0 && (
            <View style={styles.section}>
              <Text variant="bodySemibold" style={styles.sectionHeader}>Today</Text>
              {today.map(item => renderNotificationCard(item))}
            </View>
          )}

          {yesterday.length > 0 && (
            <View style={styles.section}>
              <Text variant="bodySemibold" style={styles.sectionHeader}>Yesterday</Text>
              {yesterday.map(item => renderNotificationCard(item))}
            </View>
          )}

          {earlier.length > 0 && (
            <View style={styles.section}>
              <Text variant="bodySemibold" style={styles.sectionHeader}>Earlier</Text>
              {earlier.map(item => renderNotificationCard(item))}
            </View>
          )}

          {mergedNotifications.length === 0 && renderEmptyState()}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    color: COLORS.secondary, // Navy
    fontWeight: 'bold',
  },
  markAllBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  listContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...SHADOWS.light,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardRead: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: ROUNDNESS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardContent: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    color: COLORS.text,
    flex: 1,
    paddingRight: SPACING.xs,
    fontSize: 15,
  },
  textUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDNESS.sm,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chevronIcon: {
    paddingLeft: 4,
  },
  cardBody: {
    marginTop: SPACING.sm,
    paddingLeft: 2,
  },
  bodyDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  cardBodyText: {
    lineHeight: 20,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: SPACING.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  emptyTitle: {
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Skeleton styles
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.borderDark,
    marginRight: SPACING.md,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTitle: {
    width: '60%',
    height: 14,
    backgroundColor: COLORS.borderDark,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBody: {
    width: '80%',
    height: 12,
    backgroundColor: COLORS.borderDark,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonTime: {
    width: '40%',
    height: 10,
    backgroundColor: COLORS.borderDark,
    borderRadius: 4,
  },
});

export default NotificationsScreen;
