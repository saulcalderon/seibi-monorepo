import { openBrowserAsync } from 'expo-web-browser';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, TextInput, View, type ScrollViewInstance } from 'react-native';
import { KeyboardChatScrollView, KeyboardStickyView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { cubicBezier, FadeInDown, interpolate, LayoutAnimationConfig, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ChatMessage } from '@/data/chat/messages';
import { replyMessages } from '@/data/chat/messages';
import { useChat, usePendingQuestion, useSendChat } from '@/data/chat/queries';
import { errorMessage } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useProfile } from '@/data/profile/queries';
import { vehicleName } from '@/lib/format';
import { openLegal } from '@/lib/legal';
import { actionsButtonBottom } from '@/shell/actions-button';
import { motion, opacity, size, space } from '@/theme/tokens';
import { IconButton } from '@/ui/button';
import { ErrorState } from '@/ui/feedback';
import { KEYBOARD_DISMISS } from '@/ui/form';
import { Icon } from '@/ui/icon';
import { usePressed } from '@/ui/press';
import { Text } from '@/ui/text';

import { bubbleSources, bubbleText, canSend, chatRequest, MESSAGE_MAX, replySpoken, starters } from './chat-logic';
import { LocationGate, useLocated } from './location-gate';

const ios = process.env.EXPO_OS === 'ios';

/** The id of the question shown while it is being sent, before the function saves it. */
const PENDING = 'pending';

/** Says something to VoiceOver and TalkBack without moving their focus, after what they are saying now. */
function announce(message: string) {
  AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
}

/**
 * Chat de Seibi (the PWA's ChatPanel as of 6e3b818): follow-up questions
 * about the person's Vehicle. The thread scrolls under `header` (the screen's
 * subtitle, the Vehicle line and the switch); the question field is pinned
 * at the bottom, beside the floating [+], and rides on the keyboard
 * (react-native-keyboard-controller's chat recipe), so the keyboard never
 * covers it or the last message. The `chat` function answers whole, not in
 * parts: «Seibi está escribiendo» shows until the answer arrives.
 */
export function ChatPanel({ vehicle, header }: { vehicle: VehicleView; header: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const chat = useChat();
  const send = useSendChat();
  const profile = useProfile();
  const located = useLocated();
  const [text, setText] = useState('');
  // The question on its way lives with the mutation, so it survives a trip to «Estimar precio» and back.
  const pending = usePendingQuestion();
  // Blocks a second tap before the first one's render lands (two taps would spend two AI calls).
  const sending = useRef(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const toEnd = useRef(true);

  const messages = chat.data ?? [];
  // Where the field rests: level with the [+], whose bottom is measured from the window. On iOS the
  // screen runs under the tab bar, so the field keeps clear of it; on Android the screen ends at the bar.
  // With the keyboard up the field sits a small gap above it; this is how much nearer it comes than the keyboard's height.
  const lift = actionsButtonBottom(insets.bottom) - space[2];

  // A new message or the typing line brings the end of the thread into view once it is laid out.
  // Armed before the layout's size change can fire.
  useLayoutEffect(() => {
    toEnd.current = true;
  }, [messages.length, pending]);

  const submit = (raw: string) => {
    if (!canSend(raw) || pending !== null || sending.current) return;
    sending.current = true;
    const body = chatRequest(raw, vehicle.id);
    setText('');
    announce(t('estimates.chat.typing'));
    send
      .mutateAsync(body)
      .then(
        (data) => {
          const reply = replyMessages(data.messages).find((m) => m.role === 'assistant');
          if (reply) announce(replySpoken(reply, t));
        },
        (error: unknown) => {
          // The question goes back in the field, so a failed send doesn't lose it.
          setText((current) => current || body.message);
          announce(errorMessage(error, t));
        },
      )
      .finally(() => {
        sending.current = false;
      });
  };

  const empty = messages.length === 0 && !pending;

  return (
    <View style={styles.screen} testID="estimates-screen">
      <KeyboardChatScrollView
        // Its ref is a ScrollView; the library's own ref type resolves against a second copy of React's types.
        ref={scrollRef as never}
        offset={lift}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={KEYBOARD_DISMISS}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (!toEnd.current || chat.isLoading) return;
          toEnd.current = false;
          scrollRef.current?.scrollToEnd({ animated: !reduced });
        }}
      >
        {header}
        <LocationGate>
          <View style={styles.thread} testID="chat-thread">
            <Text step="footnote" tone="muted" style={styles.intro}>
              {t('estimates.chat.intro', { vehicle: vehicleName(vehicle) })}
            </Text>
            {chat.isLoading ? null : chat.isError ? (
              <ErrorState testID="chat-error" onRetry={() => void chat.refetch()} />
            ) : empty ? (
              <View style={styles.starters} testID="chat-starters">
                {starters(profile.data?.knowledgeLevel, t).map((question, i) => (
                  <Starter key={question} testID={`chat-starter-${i}`} question={question} onPress={() => submit(question)} />
                ))}
              </View>
            ) : (
              // The thread already there when the chat opens appears in place; only what is added after rises in.
              // Keyed on loading, so it mounts once the thread is in: the very first question still rises in.
              <LayoutAnimationConfig skipEntering key={chat.isFetched ? 'thread' : 'loading'}>
                {messages.map((m, i) => (
                  // The newest question and answer carry their own ids, so a flow can find the reply it waited for.
                  <Bubble key={m.id} message={m} testID={i >= messages.length - 2 && !pending ? `chat-latest-${m.role}` : undefined} />
                ))}
                {pending ? (
                  <>
                    <Bubble testID="chat-pending" sending message={{ id: PENDING, role: 'user', content: pending, sources: [], createdAt: '', vehicleId: vehicle.id }} />
                    <Typing />
                  </>
                ) : null}
              </LayoutAnimationConfig>
            )}
            {send.isError && !pending ? (
              <Text testID="chat-send-error" step="subhead" tone="overdue" accessibilityRole="alert" style={styles.intro}>
                {errorMessage(send.error, t)}
              </Text>
            ) : null}
            <AiUse />
          </View>
        </LocationGate>
      </KeyboardChatScrollView>
      {located ? (
        // With the keyboard up the bottom padding is behind it: the field rises by the keyboard less `lift`.
        <KeyboardStickyView offset={{ opened: lift }}>
          <View style={styles.dock}>
            <Composer value={text} onChange={setText} busy={pending !== null} onSend={() => submit(text)} />
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

/** One of the three questions an empty thread offers; a tap sends it. */
function Starter({ question, onPress, testID }: { question: string; onPress: () => void; testID: string }) {
  const { t } = useTranslation();
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={question}
      accessibilityHint={t('estimates.chat.starterHint')}
      onPress={onPress}
      style={styles.starter}
      {...pressHandlers}
    >
      <Text step="body" weight={500}>
        {question}
      </Text>
    </Pressable>
  );
}

/** A message: the person's on the right in `inverse`, Seibi's on the left with up to three sources. */
function Bubble({ message, sending = false, testID }: { message: ChatMessage; sending?: boolean; testID?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const mine = message.role === 'user';
  const words = bubbleText(message);
  const sources = bubbleSources(message);
  // A saved question takes the place of the one shown while sending: it appears in place, only new bubbles rise in.
  const rises = !reduced && (!mine || sending);
  styles.useVariants({ mine });
  return (
    // The entrance and the theme's styles stay on separate views: Unistyles styles a plain View.
    <Animated.View entering={rises ? FadeInDown.duration(motion.estimate.duration) : undefined}>
      <View style={styles.bubble}>
        {/* The id is on the words, so a flow can read what was asked and answered. */}
        <Text
          testID={testID}
          step="body"
          tone={mine ? 'onInverse' : 'ink'}
          selectable
          accessibilityLabel={t(mine ? 'estimates.chat.mine' : 'estimates.chat.seibi', { text: words })}
        >
          {words}
        </Text>
        {sources.length > 0 ? (
          <View style={styles.sources}>
            {sources.map((source) => (
              <Pressable
                key={source.url}
                accessibilityRole="link"
                accessibilityLabel={t('estimates.chat.openSource', { title: source.title })}
                onPress={() => void openBrowserAsync(source.url)}
                style={styles.source}
              >
                <Text step="caption" weight={600} numberOfLines={1} style={styles.sourceTitle}>
                  {source.title}
                </Text>
                <Icon name="external" size="xs" tone="ink" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** «Seibi está escribiendo»: three dots that pulse one after another; with Reduce Motion on they hold still. */
function Typing() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <View
      testID="chat-typing"
      style={styles.typing}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('estimates.chat.typing')}
      accessibilityState={{ busy: true }}
    >
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={reduced ? undefined : { ...PULSE, animationDelay: i * motion.typing.stagger }}>
          <View style={styles.typingDot} />
        </Animated.View>
      ))}
    </View>
  );
}

const PULSE = {
  animationName: { from: { opacity: opacity.typing }, to: { opacity: 1 } },
  animationDuration: motion.typing.duration,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: cubicBezier(...motion.curve.smooth),
} as const;

/**
 * The question field and «Enviar». At rest it leaves the bottom right
 * corner to the floating [+]; with the keyboard up the [+] is behind the
 * keyboard, so the field takes the whole width.
 */
function Composer({ value, onChange, busy, onSend }: { value: string; onChange: (text: string) => void; busy: boolean; onSend: () => void }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const { progress } = useReanimatedKeyboardAnimation();
  const beside = space[4] + size.fab + space[3];
  const room = useAnimatedStyle(() => ({ paddingRight: interpolate(progress.value, [0, 1], [beside, space[4]]) }));
  styles.useVariants({ focused });
  return (
    <Animated.View style={room}>
      <View style={styles.composer} testID="chat-composer">
        <TextInput
          testID="chat-input"
          accessibilityLabel={t('estimates.chat.label')}
          placeholder={t('estimates.chat.placeholder')}
          placeholderTextColor={theme.colors.subtle}
          selectionColor={theme.colors.radiant}
          cursorColor={theme.colors.radiant}
          value={value}
          onChangeText={onChange}
          maxLength={MESSAGE_MAX}
          multiline
          // Return writes a new line; «Enviar» sends.
          submitBehavior="newline"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        <IconButton testID="chat-send" icon="send" label={t('estimates.chat.send')} variant="inverse" disabled={!canSend(value) || busy} onPress={onSend} />
      </View>
    </Animated.View>
  );
}

/** «Cómo usamos la IA»: the Terms, in the in-app browser (the PWA's link under the field). */
function AiUse() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  return (
    <Pressable testID="chat-ai-use" accessibilityRole="link" accessibilityLabel={t('estimates.chat.aiUse')} onPress={() => void openLegal('terms', theme.colors.radiant)} style={styles.aiUse}>
      <Text step="caption" tone="subtle" style={styles.aiUseText}>
        {t('estimates.chat.aiUse')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: theme.space[4],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[2],
    paddingBottom: theme.space[3],
  },
  thread: {
    gap: theme.space[3],
  },
  intro: {
    paddingHorizontal: theme.space[1],
  },
  starters: {
    gap: theme.space[2],
  },
  starter: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    boxShadow: theme.shadow.card,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    minHeight: theme.size.target,
    justifyContent: 'center',
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  bubble: {
    maxWidth: theme.size.bubble,
    gap: theme.space[2],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    variants: {
      mine: {
        true: { alignSelf: 'flex-end', backgroundColor: theme.colors.inverse, borderBottomRightRadius: theme.radius.sm },
        false: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderBottomLeftRadius: theme.radius.sm, boxShadow: theme.shadow.card },
      },
    },
  },
  sources: {
    borderTopWidth: theme.size.border.thin,
    borderTopColor: theme.colors.line,
    paddingTop: theme.space[1],
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.size.target,
  },
  sourceTitle: {
    flexShrink: 1,
  },
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: theme.space[1],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderBottomLeftRadius: theme.radius.sm,
    borderCurve: 'continuous',
    boxShadow: theme.shadow.card,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[4],
  },
  typingDot: {
    width: theme.size.dot,
    height: theme.size.dot,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.muted,
  },
  dock: {
    // At rest the field is level with the [+]. On iOS the screen runs under the tab bar, so the field keeps
    // clear of it; on Android the screen ends at the bar. With the keyboard up this padding is behind it.
    paddingBottom: ios ? actionsButtonBottom(rt.insets.bottom) : theme.space[3],
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.space[2],
    marginLeft: theme.space[4],
    padding: theme.space[1.5],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    borderWidth: theme.size.border.thin,
    borderColor: theme.colors.line,
    boxShadow: theme.shadow.float,
    // The focus ring is an outline, as the kit's fields: focusing never moves the layout.
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: theme.colors.radiant,
    variants: {
      focused: { true: { outlineWidth: theme.size.border.focus }, false: {} },
    },
  },
  input: {
    flex: 1,
    ...theme.type.callout,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.ink,
    minHeight: theme.size.target,
    maxHeight: theme.size.composerMax,
    paddingHorizontal: theme.space[3],
    paddingTop: theme.space[2.5],
    paddingBottom: theme.space[2.5],
    textAlignVertical: 'center',
  },
  aiUse: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[1],
  },
  aiUseText: {
    textDecorationLine: 'underline',
  },
}));
