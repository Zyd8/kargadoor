import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

const PRIMARY = '#f0a92d';

type MessageRow = {
  ID: string;
  PACKAGE_ID: string;
  SENDER_ID: string;
  MESSAGE: string;
  CREATED_AT: string;
};

type ChatOrderMeta = {
  SENDER_ID: string | null;
  DRIVER_ID: string | null;
  RECIPIENT_NAME: string | null;
  RECIPIENT_NUMBER: string | null;
};

type ProfileRow = {
  ID: string;
  FULL_NAME: string | null;
  AVATAR_URL: string | null;
  PHONE_NUMBER: string | null;
};

type Props = {
  visible: boolean;
  orderId: string;
  myUserId: string;
  onClose: () => void;
};

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function OrderChatModal({ visible, orderId, myUserId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [orderMeta, setOrderMeta] = useState<ChatOrderMeta | null>(null);
  const [senderProfile, setSenderProfile] = useState<ProfileRow | null>(null);
  const [driverProfile, setDriverProfile] = useState<ProfileRow | null>(null);
  const listRef = useRef<FlatList<MessageRow>>(null);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;

    const fetchMessages = async () => {
      setLoading(true);
      const [{ data: msgData }, { data: pkgData }] = await Promise.all([
        supabase
          .from('ORDER_MESSAGES')
          .select('ID, PACKAGE_ID, SENDER_ID, MESSAGE, CREATED_AT')
          .eq('PACKAGE_ID', orderId)
          .order('CREATED_AT', { ascending: true }),
        supabase
          .from('PACKAGES')
          .select('SENDER_ID, DRIVER_ID, RECIPIENT_NAME, RECIPIENT_NUMBER')
          .eq('ID', orderId)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      setMessages(Array.isArray(msgData) ? (msgData as MessageRow[]) : []);
      setOrderMeta((pkgData as ChatOrderMeta) ?? null);

      const senderId = (pkgData as ChatOrderMeta | null)?.SENDER_ID ?? null;
      const driverId = (pkgData as ChatOrderMeta | null)?.DRIVER_ID ?? null;
      const ids = [senderId, driverId].filter((id): id is string => !!id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('PROFILE')
          .select('ID, FULL_NAME, AVATAR_URL, PHONE_NUMBER')
          .in('ID', ids);
        if (!mounted) return;
        const rows = (Array.isArray(profiles) ? profiles : []) as ProfileRow[];
        setSenderProfile(rows.find((x) => x.ID === senderId) ?? null);
        setDriverProfile(rows.find((x) => x.ID === driverId) ?? null);
      } else {
        setSenderProfile(null);
        setDriverProfile(null);
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`order-chat-${orderId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ORDER_MESSAGES',
          filter: `PACKAGE_ID=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.ID === row.ID)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [visible, orderId]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);
  const senderId = orderMeta?.SENDER_ID ?? null;
  const driverId = orderMeta?.DRIVER_ID ?? null;
  const isSender = myUserId === senderId;
  const counterpartProfile = isSender ? driverProfile : senderProfile;
  const counterpartRole = isSender ? 'Rider' : 'Customer';
  const counterpartName = counterpartProfile?.FULL_NAME ?? counterpartRole;
  const counterpartPhone = counterpartProfile?.PHONE_NUMBER ?? null;
  const recipientName = orderMeta?.RECIPIENT_NAME ?? null;
  const recipientNumber = orderMeta?.RECIPIENT_NUMBER ?? senderProfile?.PHONE_NUMBER ?? null;

  const avatarForMessage = (sender: string): string | null => {
    if (senderId && sender === senderId) return senderProfile?.AVATAR_URL ?? null;
    if (driverId && sender === driverId) return driverProfile?.AVATAR_URL ?? null;
    return null;
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from('ORDER_MESSAGES')
      .insert({
        PACKAGE_ID: orderId,
        SENDER_ID: myUserId,
        MESSAGE: body,
      })
      .select('ID, PACKAGE_ID, SENDER_ID, MESSAGE, CREATED_AT')
      .single();
    setSending(false);
    if (error) return;
    setText('');
    if (data) {
      const row = data as MessageRow;
      setMessages((prev) => (prev.some((m) => m.ID === row.ID) ? prev : [...prev, row]));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {counterpartProfile?.AVATAR_URL ? (
                  <Image source={{ uri: counterpartProfile.AVATAR_URL }} style={styles.headerAvatar} />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <MaterialIcons name="person" size={16} color="#fff" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Delivery Chat</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {driverId || !isSender
                      ? `${counterpartRole}: ${counterpartName}`
                      : 'Waiting for rider assignment'}
                    {counterpartPhone ? ` · ${counterpartPhone}` : ''}
                    {!isSender && recipientName ? ` · Recipient: ${recipientName}` : ''}
                    {!isSender && recipientNumber ? ` · ${recipientNumber}` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <MaterialIcons name="close" size={24} color="#444" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.ID}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const mine = item.SENDER_ID === myUserId;
                  const avatar = avatarForMessage(item.SENDER_ID);
                  return (
                    <View style={[styles.msgWrap, mine ? styles.msgWrapMine : styles.msgWrapOther]}>
                      {!mine && (
                        avatar ? (
                          <Image source={{ uri: avatar }} style={styles.msgAvatar} />
                        ) : (
                          <View style={styles.msgAvatarFallback}>
                            <MaterialIcons name="person" size={12} color="#fff" />
                          </View>
                        )
                      )}
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                        <Text style={[styles.msgText, mine ? styles.msgTextMine : styles.msgTextOther]}>{item.MESSAGE}</Text>
                        <Text style={[styles.time, mine ? styles.timeMine : styles.timeOther]}>{timeLabel(item.CREATED_AT)}</Text>
                      </View>
                      {mine && (
                        avatar ? (
                          <Image source={{ uri: avatar }} style={styles.msgAvatar} />
                        ) : (
                          <View style={styles.msgAvatarFallback}>
                            <MaterialIcons name="person" size={12} color="#fff" />
                          </View>
                        )
                      )}
                    </View>
                  );
                }}
              />
            )}

            <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetWrap: { maxHeight: '94%' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, minHeight: 420, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', gap: 8 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5E7EB' },
  headerAvatarFallback: { width: 34, height: 34, borderRadius: 17, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  center: { paddingVertical: 24, alignItems: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 10 },
  msgWrap: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgWrapMine: { justifyContent: 'flex-end' },
  msgWrapOther: { justifyContent: 'flex-start' },
  msgAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' },
  msgAvatarFallback: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  bubbleMine: { backgroundColor: PRIMARY },
  bubbleOther: { backgroundColor: '#F4F4F5' },
  msgText: { fontSize: 14, lineHeight: 19 },
  msgTextMine: { color: '#fff' },
  msgTextOther: { color: '#1F2937' },
  time: { fontSize: 10, marginTop: 4 },
  timeMine: { color: 'rgba(255,255,255,0.9)', textAlign: 'right' },
  timeOther: { color: '#6B7280' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#EEE', paddingHorizontal: 10, paddingTop: 10, gap: 8 },
  input: { flex: 1, backgroundColor: '#F6F6F7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', maxHeight: 110 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.55 },
});

