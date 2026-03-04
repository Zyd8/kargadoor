import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW } = Dimensions.get('window');
const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary:    '#0A3D2B',
  primaryMid: '#1B6B4A',
  primaryLt:  '#2E8C63',
  accent:     '#00E87A',
  accentDim:  '#D4FAE8',
  surface:    '#FFFFFF',
  surfaceAlt: '#F3F7F4',
  cardDark:   '#0A3D2B',
  ink:        '#0C1C14',
  inkMid:     '#4A5E54',
  inkSoft:    '#93A89C',
  border:     '#E0EBE4',
  danger:     '#F03E3E',
  warning:    '#F59E0B',
  bg:         '#EDF2EE',
  gold:       '#F5A623',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:     C.warning,
  IN_PROGRESS: C.primaryLt,
  COMPLETE:    C.inkSoft,
  CANCELLED:   C.danger,
};

// ── Types ────────────────────────────────────────────────────────────────────
type ActiveOrder = {
  ID: string; STATUS: string | null;
  PICKUP_ADDRESS: string | null; RECIPIENT_ADDRESS: string | null;
  PICKUP_LAT: number | null; PICKUP_LNG: number | null; PRICE: number | null;
};
type RecentOrder    = { ID: string; STATUS: string | null };
type DriverStats    = { totalDeliveries: number; totalEarnings: number; inProgressCount: number; cancelledCount: number };
type ActiveDelivery = { ID: string; PICKUP_ADDRESS: string | null; RECIPIENT_ADDRESS: string | null; RECIPIENT_NAME: string | null; RECIPIENT_NUMBER: string | null; PRICE: number | null };

type VehicleOption = {
  id: string; emoji: string; label: string;
  sub: string; capacity: string; eta: string;
  basePrice: number; tag?: string; tagColor?: string;
};

type AddOn = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string; desc: string; price: number;
  color: string; bgColor: string;
};

// ── Data ─────────────────────────────────────────────────────────────────────
const VEHICLES: VehicleOption[] = [
  { id: 'bike',     emoji: '🚲', label: 'Bike',           sub: 'Eco-friendly',    capacity: 'Up to 3 kg',   eta: '~10 min', basePrice: 40,  tag: 'ECO',  tagColor: '#22C55E' },
  { id: 'ebike',    emoji: '⚡', label: 'E-Bike / E-Trike', sub: 'Electric motor', capacity: 'Up to 10 kg',  eta: '~12 min', basePrice: 55,  tag: 'ECO',  tagColor: '#22C55E' },
  { id: 'moto',     emoji: '🏍️', label: 'Motorcycle',     sub: 'Fast & agile',    capacity: 'Up to 15 kg',  eta: '~15 min', basePrice: 70 },
  { id: 'sedan',    emoji: '🚗', label: 'Sedan',           sub: 'Comfortable',     capacity: 'Up to 30 kg',  eta: '~18 min', basePrice: 120, tag: 'MED',  tagColor: '#3B82F6' },
  { id: 'suv',      emoji: '🚙', label: 'SUV / Small Van', sub: 'Spacious ride',   capacity: 'Up to 60 kg',  eta: '~20 min', basePrice: 180 },
  { id: 'pickup',   emoji: '🛻', label: 'Pickup',          sub: 'Open bed haul',   capacity: 'Up to 150 kg', eta: '~25 min', basePrice: 280 },
  { id: 'cargovan', emoji: '🚐', label: 'Cargo Van',       sub: 'Enclosed cargo',  capacity: 'Up to 300 kg', eta: '~30 min', basePrice: 400 },
  { id: 'truck',    emoji: '🚚', label: 'Truck',           sub: 'Heavy freight',   capacity: '300 kg+',      eta: '~45 min', basePrice: 650, tag: 'BIG',  tagColor: '#EF4444' },
];

const ADD_ONS: AddOn[] = [
  {
    id: 'buyforme', icon: 'shopping-bag',
    label: 'Buy For Me', desc: 'Rider purchases the item on your behalf before delivery',
    price: 30, color: '#7C3AED', bgColor: '#EDE9FE',
  },
  {
    id: 'waiting', icon: 'access-time',
    label: 'Extra Waiting Time', desc: 'Add +15 min wait at pickup or drop-off location',
    price: 25, color: '#D97706', bgColor: '#FEF3C7',
  },
  {
    id: 'thermal', icon: 'kitchen',
    label: 'Thermal Bag', desc: 'Insulated bag keeps food hot or cold during transit',
    price: 20, color: '#EA580C', bgColor: '#FFEDD5',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function staticMapUrl(lat: number, lng: number) {
  return (
    `https://api.tomtom.com/map/1/staticimage` +
    `?key=${TOMTOM_KEY}&zoom=13&center=${lng},${lat}&width=220&height=140&format=png&layer=basic&style=main`
  );
}

function getGreeting(name?: string | null) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return { time, name: name?.split(' ')[0] ?? 'there' };
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? 'PENDING';
  const color = STATUS_COLOR[label] ?? '#888';
  return (
    <View style={[sx.badge, { backgroundColor: color + '1A', borderColor: color + '55' }]}>
      <View style={[sx.badgeDot, { backgroundColor: color }]} />
      <Text style={[sx.badgeText, { color }]}>{label.replace('_', ' ')}</Text>
    </View>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={sx.sectionRow}>
      <Text style={sx.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={sx.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Add-On Services Panel ─────────────────────────────────────────────────────
function AddOnPanel({
  vehicleLabel, activeAddOns, onToggle,
}: {
  vehicleLabel: string; activeAddOns: Set<string>; onToggle: (id: string) => void;
}) {
  const addOnTotal = ADD_ONS.filter(a => activeAddOns.has(a.id)).reduce((s, a) => s + a.price, 0);

  return (
    <View style={sx.addOnPanel}>
      {/* Dark header bar */}
      <View style={sx.addOnHeader}>
        <View>
          <Text style={sx.addOnTitle}>Add-on Services</Text>
          <Text style={sx.addOnHeaderSub}>Optional extras for your {vehicleLabel}</Text>
        </View>
        <View style={sx.addOnOptionalPill}>
          <Text style={sx.addOnOptionalText}>OPTIONAL</Text>
        </View>
      </View>

      {/* Cards */}
      {ADD_ONS.map((addon, i) => {
        const active = activeAddOns.has(addon.id);
        return (
          <TouchableOpacity
            key={addon.id}
            style={[sx.addOnCard, i > 0 && sx.addOnCardBorder, active && sx.addOnCardActive]}
            onPress={() => onToggle(addon.id)}
            activeOpacity={0.75}
          >
            {/* Left color strip */}
            {active && <View style={[sx.addOnStrip, { backgroundColor: addon.color }]} />}

            {/* Icon */}
            <View style={[sx.addOnIconBlob, { backgroundColor: addon.bgColor }]}>
              <MaterialIcons name={addon.icon} size={20} color={addon.color} />
            </View>

            {/* Text */}
            <View style={sx.addOnBody}>
              <Text style={[sx.addOnLabel, active && { color: addon.color }]}>{addon.label}</Text>
              <Text style={sx.addOnDesc} numberOfLines={2}>{addon.desc}</Text>
            </View>

            {/* Price + checkbox */}
            <View style={sx.addOnRight}>
              <Text style={[sx.addOnPrice, active && { color: addon.color }]}>+₱{addon.price}</Text>
              <View style={[sx.addOnCheck, active && { backgroundColor: addon.color, borderColor: addon.color }]}>
                {active && <MaterialIcons name="check" size={11} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Subtotal row */}
      {addOnTotal > 0 && (
        <View style={sx.addOnFooter}>
          <View style={sx.addOnFooterLeft}>
            <MaterialIcons name="receipt-long" size={14} color={C.inkMid} />
            <Text style={sx.addOnFooterLabel}>{activeAddOns.size} add-on{activeAddOns.size > 1 ? 's' : ''} selected</Text>
          </View>
          <Text style={sx.addOnFooterTotal}>+₱{addOnTotal}</Text>
        </View>
      )}
    </View>
  );
}

// ── Booking Form ──────────────────────────────────────────────────────────────
function BookingForm() {
  const [pickup,       setPickup]       = useState('');
  const [dropoff,      setDropoff]      = useState('');
  const [selected,     setSelected]     = useState<string | null>(null);
  const [activeAddOns, setActiveAddOns] = useState<Set<string>>(new Set());
  const [pricingData,  setPricingData]  = useState<Record<string, number>>({});
  const addOnAnim = useRef(new Animated.Value(0)).current;

  const selectedVehicle = VEHICLES.find(v => v.id === selected);
  const canBook = pickup.trim().length > 0 && dropoff.trim().length > 0 && selected !== null;

  const addOnTotal = ADD_ONS.filter(a => activeAddOns.has(a.id)).reduce((s, a) => s + a.price, 0);

  const getBasePrice = (vehicleId: string | null) => {
    if (!vehicleId) return 0;
    return pricingData[vehicleId] ?? VEHICLES.find(v => v.id === vehicleId)?.basePrice ?? 0;
  };

  const totalPrice = getBasePrice(selectedVehicle?.id ?? null) + addOnTotal;

  function selectVehicle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const closing = selected === id;
    setSelected(closing ? null : id);
    if (closing) setActiveAddOns(new Set());
    Animated.spring(addOnAnim, {
      toValue: closing ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }

  // fetch pricing configuration from Supabase once on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('PRICING_CONFIG')
        .select('VEHICLE_TYPE, BASE_FARE');
      if (!error && data) {
        const pricing: Record<string, number> = {};
        data.forEach((row: any) => {
          pricing[row.VEHICLE_TYPE] = row.BASE_FARE;
        });
        setPricingData(pricing);
      }
    })();
  }, []);

  function toggleAddOn(id: string) {
    const next = new Set(activeAddOns);
    next.has(id) ? next.delete(id) : next.add(id);
    setActiveAddOns(next);
  }

  return (
    <View style={sx.bookingCard}>

      {/* Route */}
      <View style={sx.routeWrap}>
        <View style={sx.inputRow}>
          <View style={[sx.routeDot, { backgroundColor: C.accent }]} />
          <TextInput
            style={sx.routeInput}
            placeholder="Where to pick up?"
            placeholderTextColor={C.inkSoft}
            value={pickup}
            onChangeText={setPickup}
          />
          <TouchableOpacity style={sx.locBtn} activeOpacity={0.7}>
            <MaterialIcons name="my-location" size={17} color={C.primaryMid} />
          </TouchableOpacity>
        </View>
        <View style={sx.routeSep}>
          <View style={sx.routeSepLine} />
          <TouchableOpacity
            style={sx.swapBtn}
            onPress={() => { const t = pickup; setPickup(dropoff); setDropoff(t); }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="swap-vert" size={15} color={C.primaryMid} />
          </TouchableOpacity>
          <View style={sx.routeSepLine} />
        </View>
        <View style={sx.inputRow}>
          <View style={[sx.routeDot, { backgroundColor: C.danger }]} />
          <TextInput
            style={sx.routeInput}
            placeholder="Where to drop off?"
            placeholderTextColor={C.inkSoft}
            value={dropoff}
            onChangeText={setDropoff}
          />
        </View>
      </View>

      {/* Vehicle heading */}
      <View style={sx.vHeadRow}>
        <Text style={sx.vHeadTitle}>Select Vehicle</Text>
        <Text style={sx.vHeadCount}>{VEHICLES.length} types</Text>
      </View>

      {/* Horizontal vehicle cards */}
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
              onPress={() => selectVehicle(v.id)}
              activeOpacity={0.82}
            >
              {/* Tag pill */}
              {v.tag && (
                <View style={[sx.vTag, { backgroundColor: (v.tagColor ?? C.primary) + '20' }]}>
                  <Text style={[sx.vTagText, { color: v.tagColor ?? C.primary }]}>{v.tag}</Text>
                </View>
              )}

              {/* Emoji circle */}
              <View style={[sx.vEmojiWrap, active && sx.vEmojiWrapActive]}>
                <Text style={sx.vEmoji}>{v.emoji}</Text>
              </View>

              <Text style={[sx.vName, active && sx.vNameActive]} numberOfLines={2}>{v.label}</Text>
              <Text style={sx.vCap}>{v.capacity}</Text>

              <View style={sx.vMeta}>
                <Text style={[sx.vEta, active && { color: C.primaryLt }]}>{v.eta}</Text>
                <Text style={[sx.vPrice, active && { color: C.primary }]}>₱{pricingData[v.id] ?? v.basePrice}</Text>
              </View>

              {/* Active bottom bar */}
              {active && <View style={sx.vActiveBar} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Add-on panel — animated */}
      {selected && (
        <Animated.View
          style={[
            sx.addOnWrapper,
            {
              opacity: addOnAnim,
              transform: [{
                translateY: addOnAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              }],
            },
          ]}
        >
          <AddOnPanel
            vehicleLabel={selectedVehicle?.label ?? ''}
            activeAddOns={activeAddOns}
            onToggle={toggleAddOn}
          />
        </Animated.View>
      )}

      {/* Fare summary */}
      {selected && (
        <View style={sx.fareRow}>
          <View>
            <Text style={sx.fareLabel}>Estimated Fare</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={sx.fareValue}>₱{totalPrice}</Text>
              {addOnTotal > 0 && (
                <Text style={sx.fareBreakdown}>base ₱{getBasePrice(selectedVehicle?.id ?? null)} + ₱{addOnTotal}</Text>
              )}
            </View>
          </View>
          <View style={sx.fareEtaChip}>
            <MaterialIcons name="schedule" size={12} color={C.primaryMid} />
            <Text style={sx.fareEtaText}>{selectedVehicle?.eta}</Text>
          </View>
        </View>
      )}

      {/* Book button */}
      <TouchableOpacity
        style={[sx.bookBtn, !canBook && sx.bookBtnOff]}
        activeOpacity={canBook ? 0.85 : 1}
        onPress={() => canBook && router.navigate('/(tabs)/add')}
      >
        <Text style={sx.bookBtnText}>
          {canBook
            ? `Book ${selectedVehicle?.label}`
            : !pickup || !dropoff ? 'Enter pickup & drop-off' : 'Select a vehicle'}
        </Text>
        {canBook && (
          <View style={sx.bookBtnArrow}>
            <MaterialIcons name="arrow-forward" size={15} color={C.primary} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── UserHome ──────────────────────────────────────────────────────────────────
function UserHome({ userId, userName }: { userId: string; userName?: string | null }) {
  const [active,  setActive]  = useState<ActiveOrder | null>(null);
  const [recent,  setRecent]  = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { time, name } = getGreeting(userName);

  useFocusEffect(useCallback(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('PACKAGES')
        .select('ID, STATUS, PICKUP_ADDRESS, RECIPIENT_ADDRESS, PICKUP_LAT, PICKUP_LNG, PRICE')
        .eq('SENDER_ID', userId)
        .order('CREATED_AT', { ascending: false })
        .limit(5);
      if (!ok) return;
      const list = (data ?? []) as ActiveOrder[];
      setActive(list.find(o => o.STATUS === 'PENDING' || o.STATUS === 'IN_PROGRESS') ?? null);
      setRecent(list);
      setLoading(false);
    })();
    return () => { ok = false; };
  }, [userId]));

  if (loading) return <View style={sx.center}><ActivityIndicator size="large" color={C.primaryMid} /></View>;

  const mapUrl = active?.PICKUP_LAT && active?.PICKUP_LNG
    ? staticMapUrl(active.PICKUP_LAT, active.PICKUP_LNG)
    : staticMapUrl(14.5995, 120.9842);

  return (
    <>
      <View style={sx.greetBlock}>
        <Text style={sx.greetTime}>{time},</Text>
        <Text style={sx.greetName}>{name} 👋</Text>
        <Text style={sx.greetSub}>Where are we delivering today?</Text>
      </View>

      <BookingForm />

      {active && (
        <>
          <SectionLabel title="Active Order" />
          <View style={sx.trackCard}>
            <View style={sx.trackTop}>
              <View>
                <Text style={sx.trackId}>#{active.ID.slice(0, 8).toUpperCase()}</Text>
                <StatusBadge status={active.STATUS} />
              </View>
              <View style={sx.mapThumb}>
                <Image source={{ uri: mapUrl }} style={sx.mapImg} contentFit="cover" />
              </View>
            </View>
            <View style={sx.trackRoute}>
              <View style={sx.trackRouteRow}>
                <View style={[sx.tDot, { backgroundColor: C.accent }]} />
                <Text style={sx.trackAddr} numberOfLines={1}>{active.PICKUP_ADDRESS ?? '—'}</Text>
              </View>
              <View style={sx.trackLine} />
              <View style={sx.trackRouteRow}>
                <View style={[sx.tDot, { backgroundColor: C.danger }]} />
                <Text style={sx.trackAddr} numberOfLines={1}>{active.RECIPIENT_ADDRESS ?? '—'}</Text>
              </View>
            </View>
            {active.PRICE ? (
              <View style={sx.trackFooter}>
                <Text style={sx.trackPriceLbl}>Total</Text>
                <Text style={sx.trackPrice}>₱{Number(active.PRICE).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
              </View>
            ) : null}
          </View>
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionLabel title="Recent Orders" action="See all" onAction={() => router.navigate('/(tabs)/orders')} />
          <View style={sx.recentCard}>
            {recent.slice(0, 4).map((item, idx) => {
              const label = item.STATUS ?? 'PENDING';
              const color = STATUS_COLOR[label] ?? '#888';
              return (
                <View key={item.ID} style={[sx.recentRow, idx < Math.min(recent.length, 4) - 1 && sx.recentBorder]}>
                  <View style={sx.recentLeft}>
                    <View style={sx.recentIcon}><MaterialIcons name="local-shipping" size={13} color={C.primaryMid} /></View>
                    <Text style={sx.recentId}>#{item.ID.slice(0, 8).toUpperCase()}</Text>
                  </View>
                  <View style={[sx.badge, { backgroundColor: color + '18', borderColor: color + '55' }]}>
                    <View style={[sx.badgeDot, { backgroundColor: color }]} />
                    <Text style={[sx.badgeText, { color }]}>{label.replace('_', ' ')}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </>
  );
}

// ── DriverHome ────────────────────────────────────────────────────────────────
function DriverHome({ userId, userName }: { userId: string; userName?: string | null }) {
  const [stats,    setStats]    = useState<DriverStats>({ totalDeliveries: 0, totalEarnings: 0, inProgressCount: 0, cancelledCount: 0 });
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading,  setLoading]  = useState(true);
  const { time, name } = getGreeting(userName);

  useFocusEffect(useCallback(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      const [cRes, aRes, ipRes, canRes] = await Promise.all([
        supabase.from('PACKAGES').select('PRICE').eq('DRIVER_ID', userId).eq('STATUS', 'COMPLETE'),
        supabase.from('PACKAGES').select('ID, PICKUP_ADDRESS, RECIPIENT_ADDRESS, RECIPIENT_NAME, RECIPIENT_NUMBER, PRICE').eq('DRIVER_ID', userId).eq('STATUS', 'IN_PROGRESS').limit(1).maybeSingle(),
        supabase.from('PACKAGES').select('*', { count: 'exact', head: true }).eq('DRIVER_ID', userId).eq('STATUS', 'IN_PROGRESS'),
        supabase.from('PACKAGES').select('*', { count: 'exact', head: true }).eq('DRIVER_ID', userId).eq('STATUS', 'CANCELLED'),
      ]);
      if (!ok) return;
      const completed = cRes.data ?? [];
      setStats({
        totalDeliveries: completed.length,
        totalEarnings: completed.reduce((s: number, r: { PRICE: number | null }) => s + (r.PRICE ?? 0), 0),
        inProgressCount: ipRes.count ?? 0,
        cancelledCount:  canRes.count ?? 0,
      });
      setDelivery((aRes.data as ActiveDelivery | null) ?? null);
      setLoading(false);
    })();
    return () => { ok = false; };
  }, [userId]));

  if (loading) return <View style={sx.center}><ActivityIndicator size="large" color={C.primaryMid} /></View>;

  return (
    <>
      <View style={sx.greetBlock}>
        <Text style={sx.greetTime}>{time},</Text>
        <Text style={sx.greetName}>{name} 🚚</Text>
        <Text style={sx.greetSub}>Ready to hit the road?</Text>
      </View>

      <View style={sx.earnerBanner}>
        <View>
          <Text style={sx.earnerLbl}>Total Earnings</Text>
          <Text style={sx.earnerVal}>₱{stats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
          <View style={sx.earnerBadge}>
            <MaterialIcons name="trending-up" size={11} color={C.accent} />
            <Text style={sx.earnerBadgeText}>{stats.totalDeliveries} completed</Text>
          </View>
        </View>
        <Text style={{ fontSize: 52, opacity: 0.18 }}>💰</Text>
      </View>

      <View style={sx.pillRow}>
        {[
          { l: 'In Progress', n: stats.inProgressCount, c: C.primaryLt },
          { l: 'Completed',   n: stats.totalDeliveries,  c: C.accent    },
          { l: 'Cancelled',   n: stats.cancelledCount,   c: C.danger    },
        ].map(p => (
          <View key={p.l} style={sx.pill}>
            <Text style={[sx.pillNum, { color: p.c }]}>{p.n}</Text>
            <Text style={sx.pillLbl}>{p.l}</Text>
          </View>
        ))}
      </View>

      <SectionLabel title="Active Delivery" />

      {delivery ? (
        <View style={sx.delivCard}>
          <View style={sx.delivRouteCol}>
            {[
              { dot: C.accent, lbl: 'PICK UP',  addr: delivery.PICKUP_ADDRESS },
              { dot: C.danger, lbl: 'DROP OFF', addr: delivery.RECIPIENT_ADDRESS },
            ].map((r, i) => (
              <View key={r.lbl}>
                <View style={sx.delivRouteRow}>
                  <View style={[sx.tDot, { backgroundColor: r.dot }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={sx.delivRouteLbl}>{r.lbl}</Text>
                    <Text style={sx.delivRouteAddr} numberOfLines={2}>{r.addr ?? '—'}</Text>
                  </View>
                </View>
                {i === 0 && <View style={sx.delivConn} />}
              </View>
            ))}
          </View>
          <View style={sx.delivFootRow}>
            <View>
              <Text style={sx.delivRecipLbl}>RECIPIENT</Text>
              <Text style={sx.delivRecip}>{delivery.RECIPIENT_NAME ?? '—'}</Text>
              {delivery.RECIPIENT_NUMBER && <Text style={sx.delivPhone}>{delivery.RECIPIENT_NUMBER}</Text>}
            </View>
            {delivery.PRICE && (
              <View style={sx.delivPriceChip}>
                <Text style={sx.delivPriceText}>₱{Number(delivery.PRICE).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={sx.navBtn} activeOpacity={0.85}>
            <MaterialIcons name="navigation" size={15} color="#fff" />
            <Text style={sx.navBtnTxt}>Navigate</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={sx.emptyDeliv}>
          <View style={sx.emptyDelivIcon}><MaterialIcons name="search" size={26} color={C.primaryMid} /></View>
          <Text style={sx.emptyDelivTxt}>No active delivery</Text>
          <Text style={sx.emptyDelivSub}>Find orders to start delivering</Text>
          <TouchableOpacity style={sx.findBtn} activeOpacity={0.85} onPress={() => router.navigate('/(tabs)/orders')}>
            <Text style={sx.findBtnTxt}>Browse Available Orders</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, userRole } = useAuth();
  const isDriver = userRole === 'DRIVER';
  const userName = (user as any)?.user_metadata?.name ?? (user as any)?.email ?? null;

  return (
    <SafeAreaView style={sx.safe} edges={['top']}>
      <ScrollView
        style={sx.scroll}
        contentContainerStyle={sx.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar */}
        <View style={sx.topBar}>
          <View style={sx.logo}>
            <View style={sx.logoIcon}><MaterialIcons name="local-shipping" size={15} color="#fff" /></View>
            <Text style={sx.logoTxt}>KARGADOOR</Text>
          </View>
          <View style={sx.topRight}>
            <TouchableOpacity style={sx.iconBtn} hitSlop={8}>
              <MaterialIcons name="notifications-none" size={22} color={C.ink} />
              <View style={sx.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={sx.avatarBtn} hitSlop={8}>
              <Text style={sx.avatarTxt}>{userName ? userName[0].toUpperCase() : 'U'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {user ? (
          isDriver
            ? <DriverHome userId={user.id} userName={userName} />
            : <UserHome  userId={user.id} userName={userName} />
        ) : (
          <View style={sx.center}>
            <MaterialIcons name="lock-outline" size={40} color={C.inkSoft} />
            <Text style={[sx.emptyDelivTxt, { marginTop: 14 }]}>Sign in to continue</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sx = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 48 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // ── top bar
  topBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 4 },
  logo:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  logoTxt:  { fontSize: 14, fontWeight: '800', color: C.ink, letterSpacing: 2.2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:  { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: C.danger, borderWidth: 1.5, borderColor: C.bg },
  avatarBtn:{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryMid, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:{ fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── greeting
  greetBlock:{ marginBottom: 22 },
  greetTime: { fontSize: 13, color: C.inkMid, fontWeight: '500' },
  greetName: { fontSize: 27, fontWeight: '800', color: C.ink, marginTop: 1, letterSpacing: -0.5 },
  greetSub:  { fontSize: 13, color: C.inkSoft, marginTop: 4 },

  // ── booking card
  bookingCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 5,
  },

  // ── route
  routeWrap:   { marginBottom: 18 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  routeDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  routeInput:  { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },
  locBtn:      { padding: 3 },
  routeSep:    { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 8, paddingHorizontal: 6 },
  routeSepLine:{ flex: 1, height: 1, backgroundColor: C.border },
  swapBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },

  // ── vehicle heading
  vHeadRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vHeadTitle: { fontSize: 13, fontWeight: '700', color: C.ink, letterSpacing: 0.3 },
  vHeadCount: { fontSize: 12, color: C.inkSoft },

  // ── vehicle scroll
  vScrollOuter: { marginHorizontal: -18, marginBottom: 0 },
  vScroll:      { paddingHorizontal: 18, gap: 10, paddingBottom: 6 },

  vCard: {
    width: 110,
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  vCardActive: { backgroundColor: '#EDFFF7', borderColor: C.accent },

  vTag:     { position: 'absolute', top: 8, right: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  vTagText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  vEmojiWrap:       { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(27,107,74,0.09)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  vEmojiWrapActive: { backgroundColor: C.primary },
  vEmoji:    { fontSize: 20 },
  vName:     { fontSize: 11, fontWeight: '700', color: C.ink, marginBottom: 2, lineHeight: 15 },
  vNameActive: { color: C.primary },
  vCap:      { fontSize: 10, color: C.inkSoft, marginBottom: 8 },
  vMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  vEta:      { fontSize: 9, color: C.inkSoft },
  vPrice:    { fontSize: 13, fontWeight: '800', color: C.primaryMid },
  vActiveBar:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: C.accent },

  // ── add-on wrapper
  addOnWrapper: { marginTop: 16 },

  // ── add-on panel
  addOnPanel: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },

  addOnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addOnTitle:      { fontSize: 14, fontWeight: '800', color: '#fff' },
  addOnHeaderSub:  { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  addOnOptionalPill:{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  addOnOptionalText:{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },

  addOnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: C.surface,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  addOnCardBorder: { borderTopWidth: 1, borderTopColor: C.border },
  addOnCardActive: { backgroundColor: '#FDFDFF' },

  addOnStrip:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  addOnIconBlob:{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addOnBody:    { flex: 1 },
  addOnLabel:   { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 3 },
  addOnDesc:    { fontSize: 11, color: C.inkSoft, lineHeight: 16 },
  addOnRight:   { alignItems: 'flex-end', gap: 7, flexShrink: 0 },
  addOnPrice:   { fontSize: 13, fontWeight: '700', color: C.inkMid },
  addOnCheck:   { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  addOnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  addOnFooterLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addOnFooterLabel: { fontSize: 12, color: C.inkMid, fontWeight: '600' },
  addOnFooterTotal: { fontSize: 15, fontWeight: '800', color: C.primary },

  // ── fare
  fareRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 14, paddingHorizontal: 2 },
  fareLabel:     { fontSize: 10, color: C.inkSoft, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  fareValue:     { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  fareBreakdown: { fontSize: 11, color: C.inkSoft },
  fareEtaChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  fareEtaText:   { fontSize: 12, fontWeight: '700', color: C.primaryMid },

  // ── book btn
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6,
  },
  bookBtnOff:   { backgroundColor: C.inkSoft, shadowOpacity: 0 },
  bookBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  bookBtnArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },

  // ── section label
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  sectionAction:{ fontSize: 12, fontWeight: '600', color: C.primaryMid },

  // ── badge
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText:{ fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // ── track card (user active order)
  trackCard: { backgroundColor: C.cardDark, borderRadius: 20, padding: 18, marginBottom: 28 },
  trackTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  trackId:   { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  mapThumb:  { width: 88, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  mapImg:    { width: '100%', height: '100%' },
  trackRoute:{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 13, marginBottom: 13 },
  trackRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tDot:      { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  trackAddr: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  trackLine: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.18)', marginLeft: 4, marginVertical: 3 },
  trackFooter:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackPriceLbl:{ fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  trackPrice:   { fontSize: 17, fontWeight: '800', color: C.accent },

  // ── recent orders
  recentCard:  { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recentRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  recentBorder:{ borderBottomWidth: 1, borderBottomColor: C.border },
  recentLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentIcon:  { width: 30, height: 30, borderRadius: 9, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  recentId:    { fontSize: 13, fontWeight: '600', color: C.ink },

  // ── driver earnings
  earnerBanner:{ backgroundColor: C.cardDark, borderRadius: 20, padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  earnerLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  earnerVal:   { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  earnerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: 'rgba(0,232,122,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  earnerBadgeText: { fontSize: 11, color: C.accent, fontWeight: '600' },

  // ── pills
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  pill:    { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  pillNum: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  pillLbl: { fontSize: 10, color: C.inkSoft, fontWeight: '600', textAlign: 'center' },

  // ── driver delivery card
  delivCard:     { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  delivRouteCol: { marginBottom: 14 },
  delivRouteRow: { flexDirection: 'row', alignItems: 'flex-start' },
  delivConn:     { width: 1, height: 14, backgroundColor: C.border, marginLeft: 4, marginVertical: 3 },
  delivRouteLbl: { fontSize: 9, color: C.inkSoft, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  delivRouteAddr:{ fontSize: 13, color: C.ink, fontWeight: '500' },
  delivFootRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, marginBottom: 14 },
  delivRecipLbl: { fontSize: 9, color: C.inkSoft, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  delivRecip:    { fontSize: 13, color: C.ink, fontWeight: '600' },
  delivPhone:    { fontSize: 11, color: C.inkSoft, marginTop: 2 },
  delivPriceChip:{ backgroundColor: C.accentDim, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  delivPriceText:{ fontSize: 14, fontWeight: '800', color: C.primary },

  navBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primaryMid, borderRadius: 12, paddingVertical: 12 },
  navBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyDeliv:     { backgroundColor: C.surface, borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  emptyDelivIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyDelivTxt:  { fontSize: 15, fontWeight: '700', color: C.ink },
  emptyDelivSub:  { fontSize: 12, color: C.inkSoft, marginTop: 4, marginBottom: 18, textAlign: 'center' },
  findBtn:        { backgroundColor: C.accentDim, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 22, borderWidth: 1, borderColor: C.accent + '55' },
  findBtnTxt:     { fontSize: 13, fontWeight: '700', color: C.primaryMid },
});