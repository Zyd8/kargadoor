import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const PRIMARY  = '#f0a92d';
const INACTIVE = '#9E9E9E';

type TabIconProps = { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string };

function TabIcon({ name, color }: TabIconProps) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

// Center FAB — USER gets a + button, DRIVER gets a truck/search button
function CenterButton(props: { onPress?: (e: any) => void; style?: any; isDriver: boolean }) {
  const { onPress, style, isDriver } = props;
  return (
    <View style={[styles.addBtnWrap, style]} pointerEvents="box-none">
      <TouchableOpacity style={styles.addBtn} onPress={onPress} activeOpacity={0.85}>
        <MaterialIcons name={isDriver ? 'search' : 'add'} size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading, debugBypass, userRole } = useAuth();
  const isAuthenticated = !!user || debugBypass;
  const isDriver = (userRole ?? 'USER').toUpperCase() === 'DRIVER';
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace('/login');
  }, [user, loading, debugBypass, isAuthenticated]);

  if (loading || !isAuthenticated) return null;

  const tabBarStyle = [
    styles.tabBar,
    { paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <TabIcon name="receipt-long" color={color} />,
        }}
      />

      {/* USER: "add" order form | DRIVER: "find-orders" map — cannot use href and tabBarButton together */}
      <Tabs.Screen
        name="add"
        options={
          isDriver
            ? { title: '', tabBarIcon: () => null, href: null }
            : {
                title: '',
                tabBarIcon: () => null,
                tabBarButton: (props) => (
                  <CenterButton
                    onPress={props.onPress ?? undefined}
                    style={props.style}
                    isDriver={false}
                  />
                ),
              }
        }
      />
      <Tabs.Screen
        name="find-orders"
        options={
          isDriver
            ? {
                title: '',
                tabBarIcon: () => null,
                tabBarButton: (props) => (
                  <CenterButton
                    onPress={props.onPress ?? undefined}
                    style={props.style}
                    isDriver
                  />
                ),
              }
            : { title: '', tabBarIcon: () => null, href: null }
        }
      />

      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color }) => <TabIcon name="location-on" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDE6DC',
    minHeight: 64,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  addBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
