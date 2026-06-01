import React from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView, 
  StatusBar,
  StyleProp,
  ViewStyle
} from 'react-native';
import { COLORS } from '../../theme/theme';

import usePreferenceStore from '../../store/preferenceStore';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  safe?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  safe = true,
  style,
}) => {
  // Subscribe to preference store to trigger re-render on theme changes
  const themeMode = usePreferenceStore(state => state.theme);

  const containerStyle = [
    styles.container,
    { backgroundColor: COLORS.background },
    style,
  ];

  const content = scrollable ? (
    <ScrollView 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flexOne}>
      {children}
    </View>
  );

  const inner = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexOne}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {content}
    </KeyboardAvoidingView>
  );

  if (safe) {
    return (
      <SafeAreaView style={containerStyle}>
        {inner}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }, style]}>
      {inner}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default ScreenContainer;
