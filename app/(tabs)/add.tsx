import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LocationPicker, { LocationValue } from '@/components/location-picker';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW } = Dimensions.get('window');

// ── Palette (matches home screen) ────────────────────────────────────────────
const C = {
  primary:    '#0A3D2B',
  primaryMid: '#1B6B4A',
  primaryLt:  '#2E8C63',
  accent:     '#00E87A',
  accentDim:  '#D4FAE8',
  surface:    '#FFFFFF',
  surfaceAlt: '#F3F7F4',
  ink:        '#0C1C14',
  inkMid:     '#4A5E54',
  inkSoft:    '#93A89C',
  border:     '#E0EBE4',
  danger:     '#F03E3E',
  warning:    '#F59E0B',
  bg:         '#EDF2EE',
  gold:       '#F5A623',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type VehicleId =
  | 'bike' | 'ebike' | 'moto' | 'sedan'
  | 'suv'  | 'pickup' | 'cargovan' | 'truck';

type PaymentMethod = 'cash' | 'gcash';

const EMPTY_LOC: LocationValue = { address: '', lat: null, lng: null };

interface OrderForm {
  pickup:        LocationValue;
  dropoff:       LocationValue;
  vehicleType:   VehicleId | '';
  addOns:        Set<string>;
  recipientName: string;
  contactNumber: string;
  paymentMethod: PaymentMethod;
  itemType:      string;
  notes:         string;
}

// ── Vehicle data (mirrors home screen) ───────────────────────────────────────
type VehicleOption = {
  id: VehicleId; emoji: string; label: string;
  sub: string; capacity: string; eta: string;
  basePrice: number; tag?: string; tagColor?: string;
};

const VEHICLES: VehicleOption[] = [
  { id: 'bike',     emoji: '🚲', label: 'Bike',             sub: 'Eco-friendly',    capacity: 'Up to 3 kg',   eta: '~10 min', basePrice: 40,  tag: 'ECO', tagColor: '#22C55E' },
  { id: 'ebike',    emoji: '⚡', label: 'E-Bike / E-Trike', sub: 'Electric motor',  capacity: 'Up to 10 kg',  eta: '~12 min', basePrice: 55,  tag: 'ECO', tagColor: '#22C55E' },
  { id: 'moto',     emoji: '🏍️', label: 'Motorcycle',       sub: 'Fast & agile',    capacity: 'Up to 15 kg',  eta: '~15 min', basePrice: 70  },
  { id: 'sedan',    emoji: '🚗', label: 'Sedan',             sub: 'Comfortable',     capacity: 'Up to 30 kg',  eta: '~18 min', basePrice: 120, tag: 'POP', tagColor: '#3B82F6' },
  { id: 'suv',      emoji: '🚙', label: 'SUV / Small Van',  sub: 'Spacious ride',   capacity: 'Up to 60 kg',  eta: '~20 min', basePrice: 180 },
  { id: 'pickup',   emoji: '🛻', label: 'Pickup',            sub: 'Open bed haul',   capacity: 'Up to 150 kg', eta: '~25 min', basePrice: 280 },
  { id: 'cargovan', emoji: '🚐', label: 'Cargo Van',         sub: 'Enclosed cargo',  capacity: 'Up to 300 kg', eta: '~30 min', basePrice: 400 },
  { id: 'truck',    emoji: '🚚', label: 'Truck',             sub: 'Heavy freight',   capacity: '300 kg+',      eta: '~45 min', basePrice: 650, tag: 'BIG', tagColor: '#EF4444' },
];

// ── Add-on data (mirrors home screen) ────────────────────────────────────────
type AddOnOption = {
  id: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string; desc: string; price: number;
  color: string; bgColor: string;
};

const ADD_ONS: AddOnOption[] = [
  { id: 'buyforme', icon: 'shopping-bag',  label: 'Buy For Me',          desc: 'Rider purchases the item on your behalf before delivery', price: 30, color: '#7C3AED', bgColor: '#EDE9FE' },
  { id: 'waiting',  icon: 'access-time',   label: 'Extra Waiting Time',  desc: 'Add +15 min wait at pickup or drop-off location',         price: 25, color: '#D97706', bgColor: '#FEF3C7' },
  { id: 'thermal',  icon: 'kitchen',       label: 'Thermal Bag',         desc: 'Insulated bag keeps food hot or cold during transit',      price: 20, color: '#EA580C', bgColor: '#FFEDD5' },
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function addOnTotal(ids: Set<string>) {
  return ADD_ONS.filter(a => ids.has(a.id)).reduce((s, a) => s + a.price, 0);
}

// ── Reusable: Input Row ───────────────────────────────────────────────────────
function InputRow({
  icon, placeholder, value, onChangeText,
  keyboardType = 'default', multiline = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  placeholder: string; value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
}) {
  return (
    <View style={[sx.inputRow, multiline && sx.inputRowMulti]}>
      <MaterialIcons name={icon} size={18} color={C.inkSoft} style={sx.inputIcon} />
      <TextInput
        style={[sx.textInput, multiline && sx.textInputMulti]}
        placeholder={placeholder}
        placeholderTextColor={C.inkSoft}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

// ── Reusable: Section Label ───────────────────────────────────────────────────
function SectionLabel({ title, note }: { title: string; note?: string }) {
  return (
    <View style={sx.sectionRow}>
      <Text style={sx.sectionTitle}>{title}</Text>
      {note && <Text style={sx.sectionNote}>{note}</Text>}
    </View>
  );
}

// ── Step Header ───────────────────────────────────────────────────────────────
function StepHeader({ title, onBack, step }: { title: string; onBack: () => void; step: number }) {
  return (
    <View style={sx.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={sx.backBtn}>
        <MaterialIcons name={step === 1 ? 'close' : 'arrow-back'} size={22} color={C.ink} />
      </TouchableOpacity>
      <View style={sx.headerCenter}>
        <Text style={sx.headerTitle}>{title}</Text>
        <View style={sx.stepTrack}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[sx.stepSeg, s <= step && sx.stepSegActive]} />
          ))}
        </View>
      </View>
      <Text style={sx.stepCounter}>{step}/3</Text>
    </View>
  );
}

// ── Vehicle Horizontal Scroller ───────────────────────────────────────────────
function VehiclePicker({
  selected, onSelect,
}: {
  selected: VehicleId | '';
  onSelect: (id: VehicleId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={sx.vScroll}
      style={sx.vScrollOuter}
    >
      {VEHICLES.map(v => {
        const active = selected === v.id;
        return (
          <TouchableOpacity
            key={v.id}
            style={[sx.vCard, active && sx.vCardActive]}
            onPress={() => onSelect(v.id)}
            activeOpacity={0.82}
          >
            {v.tag && (
              <View style={[sx.vTag, { backgroundColor: (v.tagColor ?? C.primary) + '20' }]}>
                <Text style={[sx.vTagText, { color: v.tagColor ?? C.primary }]}>{v.tag}</Text>
              </View>
            )}
            <View style={[sx.vEmojiWrap, active && sx.vEmojiWrapActive]}>
              <Text style={sx.vEmoji}>{v.emoji}</Text>
            </View>
            <Text style={[sx.vName, active && sx.vNameActive]} numberOfLines={2}>{v.label}</Text>
            <Text style={sx.vCap}>{v.capacity}</Text>
            <View style={sx.vMeta}>
              <Text style={[sx.vEta, active && { color: C.primaryLt }]}>{v.eta}</Text>
              <Text style={[sx.vPrice, active && { color: C.primary }]}>₱{v.basePrice}</Text>
            </View>
            {active && <View style={sx.vActiveBar} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Add-On Panel ──────────────────────────────────────────────────────────────
function AddOnPanel({
  vehicleLabel, activeAddOns, onToggle,
}: {
  vehicleLabel: string; activeAddOns: Set<string>; onToggle: (id: string) => void;
}) {
  const total = addOnTotal(activeAddOns);
  return (
    <View style={sx.addOnPanel}>
      <View style={sx.addOnHeader}>
        <View>
          <Text style={sx.addOnTitle}>Add-on Services</Text>
          <Text style={sx.addOnHeaderSub}>Optional extras for your {vehicleLabel}</Text>
        </View>
        <View style={sx.addOnOptPill}>
          <Text style={sx.addOnOptText}>OPTIONAL</Text>
        </View>
      </View>

      {ADD_ONS.map((addon, i) => {
        const active = activeAddOns.has(addon.id);
        return (
          <TouchableOpacity
            key={addon.id}
            style={[sx.addOnCard, i > 0 && sx.addOnCardBorder, active && sx.addOnCardActive]}
            onPress={() => onToggle(addon.id)}
            activeOpacity={0.75}
          >
            {active && <View style={[sx.addOnStrip, { backgroundColor: addon.color }]} />}
            <View style={[sx.addOnBlob, { backgroundColor: addon.bgColor }]}>
              <MaterialIcons name={addon.icon} size={20} color={addon.color} />
            </View>
            <View style={sx.addOnBody}>
              <Text style={[sx.addOnLabel, active && { color: addon.color }]}>{addon.label}</Text>
              <Text style={sx.addOnDesc} numberOfLines={2}>{addon.desc}</Text>
            </View>
            <View style={sx.addOnRight}>
              <Text style={[sx.addOnPrice, active && { color: addon.color }]}>+₱{addon.price}</Text>
              <View style={[sx.addOnCheck, active && { backgroundColor: addon.color, borderColor: addon.color }]}>
                {active && <MaterialIcons name="check" size={11} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {total > 0 && (
        <View style={sx.addOnFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="receipt-long" size={13} color={C.inkMid} />
            <Text style={sx.addOnFooterLabel}>{activeAddOns.size} add-on{activeAddOns.size > 1 ? 's' : ''} selected</Text>
          </View>
          <Text style={sx.addOnFooterTotal}>+₱{total}</Text>
        </View>
      )}
    </View>
  );
}

// ── Price Banner ──────────────────────────────────────────────────────────────
function PriceBanner({
  estimatedPrice, addOns, vehicleEta,
}: {
  estimatedPrice: number | null; addOns: Set<string>; vehicleEta?: string;
}) {
  if (estimatedPrice == null) return null;
  const extras = addOnTotal(addOns);
  const total = estimatedPrice + extras;
  return (
    <View style={sx.priceBanner}>
      <View style={sx.priceBannerLeft}>
        <Text style={sx.priceBannerLabel}>ESTIMATED FARE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={sx.priceBannerValue}>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
          {extras > 0 && (
            <Text style={sx.priceBannerBreakdown}>+₱{extras} add-ons</Text>
          )}
        </View>
      </View>
      {vehicleEta && (
        <View style={sx.priceBannerEta}>
          <MaterialIcons name="schedule" size={12} color={C.primaryMid} />
          <Text style={sx.priceBannerEtaText}>{vehicleEta}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AddScreen() {
  const { user } = useAuth();
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const addOnAnim = useRef(new Animated.Value(0)).current;

  const blankForm = (): OrderForm => ({
    pickup:        EMPTY_LOC,
    dropoff:       EMPTY_LOC,
    vehicleType:   '',
    addOns:        new Set<string>(),
    recipientName: '',
    contactNumber: (user?.user_metadata?.phone_number as string) ?? '',
    paymentMethod: 'cash',
    itemType:      '',
    notes:         '',
  });

  const [form, setForm] = useState<OrderForm>(blankForm);
  const set = <K extends keyof OrderForm>(key: K, val: OrderForm[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleBack = () => {
    if (step === 1) router.replace('/(tabs)');
    else setStep(s => s - 1);
  };

  const selectedVehicle = VEHICLES.find(v => v.id === form.vehicleType);

  function selectVehicle(id: VehicleId) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const closing = form.vehicleType === id;
    set('vehicleType', closing ? '' : id);
    if (closing) set('addOns', new Set<string>());
    Animated.spring(addOnAnim, {
      toValue: closing ? 0 : 1,
      useNativeDriver: false,
      friction: 8, tension: 60,
    }).start();
  }

  function toggleAddOn(id: string) {
    const next = new Set(form.addOns);
    next.has(id) ? next.delete(id) : next.add(id);
    set('addOns', next);
  }

  const step1Valid =
    form.pickup.address.trim().length > 2 &&
    form.dropoff.address.trim().length > 2 &&
    form.vehicleType !== '';

  const step2Valid =
    form.recipientName.trim().length > 0 &&
    form.contactNumber.trim().length > 6;

  // Fetch quote
  useEffect(() => {
    const valid = form.pickup.lat != null && form.dropoff.lat != null && form.vehicleType !== '';
    if (!valid) { setEstimatedPrice(null); return; }
    let mounted = true;
    (async () => {
      const { data } = await supabase.rpc('get_delivery_quote', {
        p_vehicle_type: form.vehicleType,
        p_pickup_lat:   form.pickup.lat,
        p_pickup_lng:   form.pickup.lng,
        p_dropoff_lat:  form.dropoff.lat,
        p_dropoff_lng:  form.dropoff.lng,
      });
      if (!mounted) return;
      setEstimatedPrice(data != null ? Number(data) : null);
    })();
    return () => { mounted = false; };
  }, [form.pickup.lat, form.pickup.lng, form.dropoff.lat, form.dropoff.lng, form.vehicleType]);

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Not logged in', 'Please sign in to place an order.'); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc('insert_package', {
      p_sender_id:       user.id,
      p_pickup_address:  form.pickup.address.trim(),
      p_pickup_lat:      form.pickup.lat,
      p_pickup_lng:      form.pickup.lng,
      p_recipient_address: form.dropoff.address.trim(),
      p_dropoff_lat:     form.dropoff.lat,
      p_dropoff_lng:     form.dropoff.lng,
      p_recipient_name:  form.recipientName.trim(),
      p_recipient_number:form.contactNumber.trim(),
      p_order_contact:   form.contactNumber.trim(),
      p_vehicle_type:    form.vehicleType,
      p_payment_method:  form.paymentMethod,
      p_item_types:      form.itemType || 'Others',
      p_notes:           form.notes.trim() || null,
      p_status:          'PENDING',
    });
    setSubmitting(false);
    if (error) { Alert.alert('Failed to place order', error.message); return; }
    Alert.alert('Order placed!', 'Your delivery request is now pending.', [{
      text: 'View Orders',
      onPress: () => {
        setForm(blankForm());
        setStep(1);
        router.replace('/(tabs)/orders');
      },
    }]);
  };

  // ── Step 1: Location + Vehicle + Add-ons ───────────────────────────────────
  const renderStep1 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={sx.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Locations */}
        <SectionLabel title="Pickup & Drop-off" />
        <View style={sx.locationBlock}>
          <View style={sx.locationRow}>
            <View style={[sx.locationDot, { backgroundColor: C.accent }]} />
            <View style={sx.locationPickerWrap}>
              <LocationPicker
                placeholder="Pickup location"
                value={form.pickup}
                onChange={v => set('pickup', v)}
                showCurrentLocation
              />
            </View>
          </View>
          <View style={sx.locationDivider}>
            <View style={sx.locationDivLine} />
          </View>
          <View style={sx.locationRow}>
            <View style={[sx.locationDot, { backgroundColor: C.danger }]} />
            <View style={sx.locationPickerWrap}>
              <LocationPicker
                placeholder="Drop-off destination"
                value={form.dropoff}
                onChange={v => set('dropoff', v)}
              />
            </View>
          </View>
        </View>

        {/* Vehicle */}
        <SectionLabel title="Select Vehicle" note={`${VEHICLES.length} types`} />
        <VehiclePicker selected={form.vehicleType} onSelect={selectVehicle} />

        {/* Add-ons (animated) */}
        {form.vehicleType !== '' && (
          <Animated.View
            style={{
              opacity: addOnAnim,
              transform: [{ translateY: addOnAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              marginTop: 20,
            }}
          >
            <SectionLabel title="Add-on Services" note="Optional" />
            <AddOnPanel
              vehicleLabel={selectedVehicle?.label ?? ''}
              activeAddOns={form.addOns}
              onToggle={toggleAddOn}
            />
          </Animated.View>
        )}

        {/* Fare preview */}
        {form.vehicleType !== '' && (
          <View style={{ marginTop: 20 }}>
            <PriceBanner
              estimatedPrice={estimatedPrice ?? selectedVehicle?.basePrice ?? null}
              addOns={form.addOns}
              vehicleEta={selectedVehicle?.eta}
            />
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={sx.footer}>
        <TouchableOpacity
          style={[sx.primaryBtn, !step1Valid && sx.primaryBtnOff]}
          onPress={() => setStep(2)}
          disabled={!step1Valid}
          activeOpacity={0.85}
        >
          <Text style={sx.primaryBtnText}>Continue</Text>
          <View style={[sx.primaryBtnArrow, !step1Valid && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialIcons name="arrow-forward" size={16} color={step1Valid ? C.primary : '#fff'} />
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Step 2: Recipient + Payment ────────────────────────────────────────────
  const renderStep2 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={sx.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PriceBanner
          estimatedPrice={estimatedPrice ?? selectedVehicle?.basePrice ?? null}
          addOns={form.addOns}
          vehicleEta={selectedVehicle?.eta}
        />

        {/* Vehicle summary pill */}
        {selectedVehicle && (
          <View style={sx.vehicleSummaryRow}>
            <Text style={sx.vehicleSummaryEmoji}>{selectedVehicle.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={sx.vehicleSummaryLabel}>{selectedVehicle.label}</Text>
              <Text style={sx.vehicleSummarySub}>{selectedVehicle.capacity} · {selectedVehicle.eta}</Text>
            </View>
            <TouchableOpacity onPress={() => setStep(1)} style={sx.vehicleSummaryChange}>
              <Text style={sx.vehicleSummaryChangeText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        <SectionLabel title="Recipient" />
        <InputRow
          icon="person"
          placeholder="Recipient name"
          value={form.recipientName}
          onChangeText={t => set('recipientName', t)}
        />

        <SectionLabel title="Contact Number" />
        <InputRow
          icon="phone"
          placeholder="Contact number"
          value={form.contactNumber}
          onChangeText={t => set('contactNumber', t)}
          keyboardType="phone-pad"
        />
        <Text style={sx.fieldHint}>Pre-filled from your account — override per order if needed</Text>

        <SectionLabel title="Payment Method" />
        <View style={sx.chipRow}>
          {(['cash', 'gcash'] as PaymentMethod[]).map(method => {
            const active = form.paymentMethod === method;
            return (
              <TouchableOpacity
                key={method}
                style={[sx.payChip, active && sx.payChipActive]}
                onPress={() => set('paymentMethod', method)}
                activeOpacity={0.8}
              >
                <View style={[sx.payChipIcon, active && sx.payChipIconActive]}>
                  <MaterialIcons
                    name={method === 'cash' ? 'payments' : 'account-balance-wallet'}
                    size={20}
                    color={active ? '#fff' : C.inkMid}
                  />
                </View>
                <Text style={[sx.payChipLabel, active && sx.payChipLabelActive]}>
                  {method === 'cash' ? 'Cash' : 'GCash'}
                </Text>
                {active && (
                  <View style={sx.payChipCheck}>
                    <MaterialIcons name="check" size={11} color={C.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={sx.footer}>
        <TouchableOpacity
          style={[sx.primaryBtn, !step2Valid && sx.primaryBtnOff]}
          onPress={() => setStep(3)}
          disabled={!step2Valid}
          activeOpacity={0.85}
        >
          <Text style={sx.primaryBtnText}>Review Order</Text>
          <View style={[sx.primaryBtnArrow, !step2Valid && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialIcons name="arrow-forward" size={16} color={step2Valid ? C.primary : '#fff'} />
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Step 3: Item Type + Notes + Confirm ────────────────────────────────────
  const renderStep3 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={sx.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PriceBanner
          estimatedPrice={estimatedPrice ?? selectedVehicle?.basePrice ?? null}
          addOns={form.addOns}
          vehicleEta={selectedVehicle?.eta}
        />

        {/* Order summary card */}
        <View style={sx.summaryCard}>
          <Text style={sx.summaryCardTitle}>Order Summary</Text>

          <View style={sx.summaryRow}>
            <View style={[sx.tDot, { backgroundColor: C.accent }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={sx.summaryRowLbl}>PICKUP</Text>
              <Text style={sx.summaryRowVal} numberOfLines={1}>{form.pickup.address || '—'}</Text>
            </View>
          </View>
          <View style={sx.summaryConn} />
          <View style={sx.summaryRow}>
            <View style={[sx.tDot, { backgroundColor: C.danger }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={sx.summaryRowLbl}>DROP-OFF</Text>
              <Text style={sx.summaryRowVal} numberOfLines={1}>{form.dropoff.address || '—'}</Text>
            </View>
          </View>

          <View style={sx.summaryDivider} />

          <View style={sx.summaryMetaRow}>
            <View style={sx.summaryMeta}>
              <Text style={sx.summaryMetaLbl}>Vehicle</Text>
              <Text style={sx.summaryMetaVal}>{selectedVehicle ? `${selectedVehicle.emoji} ${selectedVehicle.label}` : '—'}</Text>
            </View>
            <View style={sx.summaryMeta}>
              <Text style={sx.summaryMetaLbl}>Recipient</Text>
              <Text style={sx.summaryMetaVal} numberOfLines={1}>{form.recipientName || '—'}</Text>
            </View>
            <View style={sx.summaryMeta}>
              <Text style={sx.summaryMetaLbl}>Payment</Text>
              <Text style={sx.summaryMetaVal}>{form.paymentMethod === 'cash' ? '💵 Cash' : '📱 GCash'}</Text>
            </View>
          </View>

          {form.addOns.size > 0 && (
            <>
              <View style={sx.summaryDivider} />
              <Text style={sx.summaryAddOnTitle}>Add-ons</Text>
              {ADD_ONS.filter(a => form.addOns.has(a.id)).map(a => (
                <View key={a.id} style={sx.summaryAddOnRow}>
                  <View style={[sx.summaryAddOnDot, { backgroundColor: a.color }]} />
                  <Text style={sx.summaryAddOnLabel}>{a.label}</Text>
                  <Text style={sx.summaryAddOnPrice}>+₱{a.price}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <SectionLabel title="Type of Item" />
        <View style={sx.itemTypeGrid}>
          {ITEM_TYPES.map(type => {
            const active = form.itemType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[sx.itemTypeChip, active && sx.itemTypeChipActive]}
                onPress={() => set('itemType', type)}
                activeOpacity={0.8}
              >
                {active && <MaterialIcons name="check" size={13} color={C.primary} style={{ marginRight: 4 }} />}
                <Text style={[sx.itemTypeText, active && sx.itemTypeTextActive]}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionLabel title="Notes" note="Optional" />
        <InputRow
          icon="notes"
          placeholder="Any special instructions?"
          value={form.notes}
          onChangeText={t => set('notes', t)}
          multiline
        />

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={sx.footer}>
        <TouchableOpacity
          style={[sx.primaryBtn, submitting && sx.primaryBtnOff]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={sx.primaryBtnText}>Place Order</Text>
              <View style={sx.primaryBtnArrow}>
                <MaterialIcons name="check" size={16} color={C.primary} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const TITLES = ['New Delivery', 'Recipient & Payment', 'Review & Confirm'];

  return (
    <SafeAreaView style={sx.safe} edges={['top']}>
      <StepHeader title={TITLES[step - 1]} onBack={handleBack} step={step} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sx = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },

  // ── header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface, gap: 12,
  },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 6, letterSpacing: -0.3 },
  stepTrack:    { flexDirection: 'row', gap: 4 },
  stepSeg:      { flex: 1, height: 3, borderRadius: 2, backgroundColor: C.border },
  stepSegActive:{ backgroundColor: C.primary },
  stepCounter:  { fontSize: 12, fontWeight: '700', color: C.inkSoft },

  // ── section label
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.inkMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionNote:  { fontSize: 11, color: C.inkSoft, fontWeight: '500' },

  // ── location block
  locationBlock:    { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  locationRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationDot:      { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  locationPickerWrap:{ flex: 1 },
  locationDivider:  { paddingLeft: 22, marginVertical: 4 },
  locationDivLine:  { height: 1, backgroundColor: C.border },

  // ── vehicle picker
  vScrollOuter: { marginHorizontal: -18, marginBottom: 0 },
  vScroll:      { paddingHorizontal: 18, gap: 10, paddingBottom: 4 },
  vCard: {
    width: 110, backgroundColor: C.surfaceAlt,
    borderRadius: 18, padding: 12,
    borderWidth: 1.5, borderColor: 'transparent',
    position: 'relative', overflow: 'hidden',
  },
  vCardActive: { backgroundColor: '#EDFFF7', borderColor: C.accent },
  vTag:        { position: 'absolute', top: 8, right: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  vTagText:    { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  vEmojiWrap:       { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(27,107,74,0.09)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  vEmojiWrapActive: { backgroundColor: C.primary },
  vEmoji:    { fontSize: 20 },
  vName:     { fontSize: 11, fontWeight: '700', color: C.ink, marginBottom: 2, lineHeight: 15 },
  vNameActive:{ color: C.primary },
  vCap:      { fontSize: 10, color: C.inkSoft, marginBottom: 8 },
  vMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  vEta:      { fontSize: 9, color: C.inkSoft },
  vPrice:    { fontSize: 13, fontWeight: '800', color: C.primaryMid },
  vActiveBar:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: C.accent },

  // ── add-on panel
  addOnPanel:  { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  addOnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 14 },
  addOnTitle:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  addOnHeaderSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  addOnOptPill:   { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  addOnOptText:   { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  addOnCard:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: C.surface, gap: 12, position: 'relative', overflow: 'hidden' },
  addOnCardBorder:{ borderTopWidth: 1, borderTopColor: C.border },
  addOnCardActive:{ backgroundColor: '#FDFDFF' },
  addOnStrip:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  addOnBlob:      { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addOnBody:      { flex: 1 },
  addOnLabel:     { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 3 },
  addOnDesc:      { fontSize: 11, color: C.inkSoft, lineHeight: 16 },
  addOnRight:     { alignItems: 'flex-end', gap: 7, flexShrink: 0 },
  addOnPrice:     { fontSize: 13, fontWeight: '700', color: C.inkMid },
  addOnCheck:     { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  addOnFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surfaceAlt, borderTopWidth: 1, borderTopColor: C.border },
  addOnFooterLabel:{ fontSize: 12, color: C.inkMid, fontWeight: '600' },
  addOnFooterTotal:{ fontSize: 15, fontWeight: '800', color: C.primary },

  // ── price banner
  priceBanner: {
    backgroundColor: C.primary, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  priceBannerLeft:      {},
  priceBannerLabel:     { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  priceBannerValue:     { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  priceBannerBreakdown: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  priceBannerEta:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  priceBannerEtaText:   { fontSize: 12, fontWeight: '700', color: C.primaryMid },

  // ── vehicle summary (step 2+)
  vehicleSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, marginBottom: 4,
    borderWidth: 1, borderColor: C.border,
  },
  vehicleSummaryEmoji:      { fontSize: 28 },
  vehicleSummaryLabel:      { fontSize: 14, fontWeight: '700', color: C.ink },
  vehicleSummarySub:        { fontSize: 11, color: C.inkSoft, marginTop: 2 },
  vehicleSummaryChange:     { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  vehicleSummaryChangeText: { fontSize: 12, fontWeight: '600', color: C.primaryMid },

  // ── inputs
  inputRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 13, marginBottom: 10, paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: C.border },
  inputRowMulti: { height: 90, alignItems: 'flex-start', paddingTop: 13 },
  inputIcon:     { marginRight: 10 },
  textInput:     { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },
  textInputMulti:{ textAlignVertical: 'top' },
  fieldHint:     { fontSize: 11, color: C.inkSoft, marginTop: -4, marginBottom: 14, marginLeft: 4 },

  // ── payment chips
  chipRow:   { flexDirection: 'row', gap: 12 },
  payChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    padding: 14, gap: 10,
  },
  payChipActive:     { borderColor: C.accent, backgroundColor: C.accentDim },
  payChipIcon:       { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  payChipIconActive: { backgroundColor: C.primary },
  payChipLabel:      { flex: 1, fontSize: 14, fontWeight: '600', color: C.inkMid },
  payChipLabelActive:{ color: C.primary },
  payChipCheck:      { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.accent },

  // ── order summary card (step 3)
  summaryCard: {
    backgroundColor: C.surface, borderRadius: 18,
    padding: 18, marginBottom: 4,
    borderWidth: 1, borderColor: C.border,
  },
  summaryCardTitle:  { fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 16 },
  summaryRow:        { flexDirection: 'row', alignItems: 'flex-start' },
  summaryConn:       { width: 1, height: 14, backgroundColor: C.border, marginLeft: 4, marginVertical: 3 },
  summaryRowLbl:     { fontSize: 9, color: C.inkSoft, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  summaryRowVal:     { fontSize: 13, color: C.ink, fontWeight: '500' },
  summaryDivider:    { height: 1, backgroundColor: C.border, marginVertical: 14 },
  summaryMetaRow:    { flexDirection: 'row', gap: 8 },
  summaryMeta:       { flex: 1 },
  summaryMetaLbl:    { fontSize: 9, color: C.inkSoft, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  summaryMetaVal:    { fontSize: 12, color: C.ink, fontWeight: '600' },
  summaryAddOnTitle: { fontSize: 11, fontWeight: '700', color: C.inkMid, marginBottom: 10 },
  summaryAddOnRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  summaryAddOnDot:   { width: 8, height: 8, borderRadius: 4 },
  summaryAddOnLabel: { flex: 1, fontSize: 12, color: C.inkMid },
  summaryAddOnPrice: { fontSize: 12, fontWeight: '700', color: C.ink },
  tDot:              { width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 3 },

  // ── item type chips (step 3)
  itemTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  itemTypeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.surface,
  },
  itemTypeChipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  itemTypeText:       { fontSize: 12, fontWeight: '600', color: C.inkMid },
  itemTypeTextActive: { color: C.primary },

  // ── footer / cta
  footer: {
    paddingHorizontal: 18, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.primary, borderRadius: 14,
    height: 52,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 6,
  },
  primaryBtnOff:   { backgroundColor: C.inkSoft, shadowOpacity: 0 },
  primaryBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  primaryBtnArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
});