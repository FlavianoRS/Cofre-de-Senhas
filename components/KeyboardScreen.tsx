import React, {
  ReactNode,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

type KeyboardScreenProps = {
  children: ReactNode;
  centered?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  keepBottomFieldsVisible?: boolean;
};

export type KeyboardScreenHandle = {
  scrollToInput: (nodeHandle: number, additionalOffset?: number) => void;
};

const KeyboardScreen = forwardRef<KeyboardScreenHandle, KeyboardScreenProps>(({
  children,
  centered = false,
  edges = ['bottom'],
  contentStyle,
  keepBottomFieldsVisible = false,
}, ref) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (!keepBottomFieldsVisible) return;

    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const listener = Keyboard.addListener(eventName, () => {
      requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));
    });
    return () => listener.remove();
  }, [keepBottomFieldsVisible]);

  useImperativeHandle(ref, () => ({
    scrollToInput: (nodeHandle: number, additionalOffset = 120) => {
      const scroll = () =>
        scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
          nodeHandle,
          additionalOffset,
          true
        );
      scroll();
      setTimeout(scroll, Platform.OS === 'android' ? 260 : 120);
    },
  }), []);

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            centered && styles.centeredContent,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.animatedContent, { opacity, transform: [{ translateY }] }]}
          >
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

KeyboardScreen.displayName = 'KeyboardScreen';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  centeredContent: { justifyContent: 'center' },
  animatedContent: { width: '100%' },
  glowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primarySoft,
    opacity: 0.32,
    top: -150,
    right: -100,
  },
  glowBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentSoft,
    opacity: 0.22,
    bottom: -130,
    left: -100,
  },
});

export default KeyboardScreen;
