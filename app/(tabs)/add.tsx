import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#1B6B4A';
const PLACEHOLDER = '#A0A0A0';
const BG = '#EEF2EE';

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleType = 'motorcycle' | 'car' | 'truck';
type PaymentMethod = 'cash' | 'gcash';

interface OrderForm {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: VehicleType | '';
  recipientName: string;
  contactNumber: string;
  paymentMethod: PaymentMethod;
  itemType: string;
  notes: string;
}

const VEHICLES: {
  id: VehicleType;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  sub: string;
}[] = [
  { id: 'motorcycle', label: 'Motorcycle', icon: 'two-wheeler',    sub: 'Small items · ≤ 20 kg' },
  { id: 'car',        label: 'Car',        icon: 'directions-car', sub: 'Medium items · ≤ 200 kg' },
  { id: 'truck',      label: 'Truck',      icon: 'local-shipping', sub: 'Large items · ≤ 500 kg' },
];

const ITEM_TYPES = [
  'Food and Beverages',
  'Appliances / Furniture',
  'Office Items / Documents',
  'Construction Materials',
  'Clothing and Accessories',
  'Electronics and Gadgets',
  'Others',
];

// ─── Shared input row ─────────────────────────────────────────────────────────

function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
}) {
  return (
    <View style={[styles.inputRow, multiline && styles.inputRowMulti]}>
      <MaterialIcons name={icon} size={20} color={PLACEHOLDER} style={styles.inputIcon} />
      <TextInput
        style={[styles.textInput, multiline && styles.textInputMulti]}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function StepHeader({ title, onBack, step }: { title: string; onBack: () => void; step: number }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <MaterialIcons name={step === 1 ? 'close' : 'arrow-back'} size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.stepDots}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.dot, s === step && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<OrderForm>({
    pickupAddress: '',
    dropoffAddress: '',
    vehicleType: '',
    recipientName: '',
    contactNumber: (user?.user_metadata?.phone_number as string) ?? '',
    paymentMethod: 'cash',
    itemType: '',
    notes: '',
  });

  const set = <K extends keyof OrderForm>(key: K, val: OrderForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleBack = () => {
    if (step === 1) router.replace('/(tabs)');
    else setStep((s) => s - 1);
  };

  const step1Valid =
    form.pickupAddress.trim().length > 2 &&
    form.dropoffAddress.trim().length > 2 &&
    form.vehicleType !== '';

  const step2Valid =
    form.recipientName.trim().length > 0 &&
    form.contactNumber.trim().length > 6;

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please log in to place an order.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('PACKAGES').insert({
      SENDER_ID:         user.id,
      PICKUP_ADDRESS:    form.pickupAddress.trim(),
      RECIPIENT_ADDRESS: form.dropoffAddress.trim(),
      RECIPIENT_NAME:    form.recipientName.trim(),
      RECIPIENT_NUMBER:  form.contactNumber.trim(),
      ORDER_CONTACT:     form.contactNumber.trim(),
      VEHICLE_TYPE:      form.vehicleType,
      PAYMENT_METHOD:    form.paymentMethod,
      ITEM_TYPES:        form.itemType || 'Others',
      NOTES:             form.notes.trim() || null,
      STATUS:            'PENDING',
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Failed to place order', error.message);
      return;
    }

    Alert.alert('Order placed!', 'Your delivery request is now pending.', [
      {
        text: 'View Orders',
        onPress: () => {
          setForm({
            pickupAddress: '',
            dropoffAddress: '',
            vehicleType: '',
            recipientName: '',
            contactNumber: (user?.user_metadata?.phone_number as string) ?? '',
            paymentMethod: 'cash',
            itemType: '',
            notes: '',
          });
          setStep(1);
          router.replace('/(tabs)/orders');
        },
      },
    ]);
  };

  // ── Step 1: Location + Vehicle ─────────────────────────────────────────────
  const renderStep1 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Locations</Text>

        <InputRow
          icon="place"
          placeholder="Pick-Up Location"
          value={form.pickupAddress}
          onChangeText={(t) => set('pickupAddress', t)}
        />
        <InputRow
          icon="flag"
          placeholder="Drop-Off Location"
          value={form.dropoffAddress}
          onChangeText={(t) => set('dropoffAddress', t)}
        />

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Vehicles Available</Text>

        {VEHICLES.map((v) => {
          const selected = form.vehicleType === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}
              onPress={() => set('vehicleType', v.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.vehicleIconWrap, selected && styles.vehicleIconWrapSelected]}>
                <MaterialIcons name={v.icon} size={28} color={selected ? '#fff' : '#555'} />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleLabel, selected && styles.vehicleLabelSelected]}>
                  {v.label}
                </Text>
                <Text style={styles.vehicleSub}>{v.sub}</Text>
              </View>
              {selected && <MaterialIcons name="check-circle" size={22} color={PRIMARY} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !step1Valid && styles.nextBtnDisabled]}
          onPress={() => setStep(2)}
          disabled={!step1Valid}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Step 2: Order Details ──────────────────────────────────────────────────
  const renderStep2 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Recipient</Text>
        <InputRow
          icon="person"
          placeholder="Recipient Name"
          value={form.recipientName}
          onChangeText={(t) => set('recipientName', t)}
        />

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Contact</Text>
        <InputRow
          icon="phone"
          placeholder="Order Contact Number"
          value={form.contactNumber}
          onChangeText={(t) => set('contactNumber', t)}
          keyboardType="phone-pad"
        />
        <Text style={styles.fieldHint}>Pre-filled from your account — override per order if needed</Text>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Payment Method</Text>
        <View style={styles.chipRow}>
          {(['cash', 'gcash'] as PaymentMethod[]).map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.chip, form.paymentMethod === method && styles.chipSelected]}
              onPress={() => set('paymentMethod', method)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={method === 'cash' ? 'payments' : 'account-balance-wallet'}
                size={18}
                color={form.paymentMethod === method ? '#fff' : '#555'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.chipText, form.paymentMethod === method && styles.chipTextSelected]}>
                {method === 'cash' ? 'Cash' : 'GCash'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !step2Valid && styles.nextBtnDisabled]}
          onPress={() => setStep(3)}
          disabled={!step2Valid}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>Review Order</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Step 3: Item Details ───────────────────────────────────────────────────
  const renderStep3 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Type of Delivery Items</Text>

        {ITEM_TYPES.map((type) => {
          const selected = form.itemType === type;
          return (
            <TouchableOpacity
              key={type}
              style={styles.radioRow}
              onPress={() => set('itemType', type)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{type}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Notes (optional)</Text>
        <InputRow
          icon="notes"
          placeholder="Any special instructions?"
          value={form.notes}
          onChangeText={(t) => set('notes', t)}
          multiline
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, submitting && styles.nextBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const TITLES = ['New Delivery', 'Add More Details', 'Item Details'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StepHeader title={TITLES[step - 1]} onBack={handleBack} step={step} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E4EAE4', backgroundColor: '#fff' },
  backBtn:     { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  stepDots:    { flexDirection: 'row', gap: 5 },
  dot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D0D8D0' },
  dotActive:   { backgroundColor: PRIMARY },

  content:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  fieldHint:    { fontSize: 12, color: '#BBB', marginTop: -6, marginBottom: 16, marginLeft: 4 },

  inputRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: '#E4EAE4' },
  inputRowMulti: { height: 88, alignItems: 'flex-start', paddingTop: 12 },
  inputIcon:     { marginRight: 10 },
  textInput:     { flex: 1, fontSize: 15, color: '#1A1A1A' },
  textInputMulti:{ textAlignVertical: 'top' },

  vehicleCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E4EAE4', padding: 14, marginBottom: 10 },
  vehicleCardSelected: { borderColor: PRIMARY, backgroundColor: '#F0F9F4' },
  vehicleIconWrap:         { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  vehicleIconWrapSelected: { backgroundColor: PRIMARY },
  vehicleInfo:         { flex: 1 },
  vehicleLabel:        { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  vehicleLabelSelected:{ color: PRIMARY },
  vehicleSub:          { fontSize: 12, color: '#888', marginTop: 2 },

  chipRow:          { flexDirection: 'row', gap: 12 },
  chip:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E4EAE4', backgroundColor: '#fff' },
  chipSelected:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:         { fontSize: 15, fontWeight: '600', color: '#555' },
  chipTextSelected: { color: '#fff' },

  radioRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  radioOuter:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C0C8C0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOuterSelected: { borderColor: PRIMARY },
  radioInner:         { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  radioLabel:         { fontSize: 15, color: '#444' },
  radioLabelSelected: { color: PRIMARY, fontWeight: '600' },

  footer:          { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E4EAE4', backgroundColor: '#fff' },
  nextBtn:         { backgroundColor: PRIMARY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
