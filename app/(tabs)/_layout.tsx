import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const PRIMARY = '#1B6B4A';
const INACTIVE = '#9E9E9E';

type TabIconProps = { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string };

function TabIcon({ name, color }: TabIconProps) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

function AddButton(props: { onPress?: (e: any) => void; style?: any }) {
  const { onPress, style } = props;
  return (
    <View style={[styles.addBtnWrap, style]} pointerEvents="box-none">
      <TouchableOpacity style={styles.addBtn} onPress={onPress} activeOpacity={0.85}>
        <MaterialIcons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading, debugBypass } = useAuth();
  const isAuthenticated = !!user || debugBypass;
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
          tabBarIcon: ({ color }) => <TabIcon name="local-shipping" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <AddButton
              onPress={props.onPress ?? undefined}
              style={props.style}
            />
          ),
        }}
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
    borderTopColor: '#E8EDE8',
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
