import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#147878', // primary color
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#E5E7EB',
          height: 88,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#147878',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今日の現場',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerTitle: 'GENBA GEAR',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: '日報',
          tabBarIcon: ({ color }) => <TabBarIcon name="file-text-o" color={color} />,
          headerTitle: '日報一覧',
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: '顧客',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          headerTitle: '顧客カルテ',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          headerTitle: '設定',
        }}
      />
    </Tabs>
  );
}
