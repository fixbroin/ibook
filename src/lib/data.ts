

import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Provider, Booking, BookingStatus, AdminSettings, Plan, EnrichedProvider, Payment, AdminDashboardData, ActivityLog, ReportsData, EnrichedBooking, Testimonial } from './types';
import { startOfDay, endOfDay, subDays, addDays, getHours, isSameDay as isSameDayFns } from 'date-fns';
import { sendWelcomeEmail } from './email-templates';


// Default data for a new provider, using 'srikanth' as the template
const defaultProviderData: Omit<Provider, 'name' | 'username' | 'contact' | 'joinedDate' | 'planId' | 'planExpiry' | 'hasUsedTrial' | 'isSuspended' | 'googleCalendar'> = {
    logoUrl: 'https://ad.fixbro.in/public/uploads/web_settings/1743422617_5e3126f2479a78593234.png',
    description: 'We are a leading provider of innovative solutions for modern businesses. Our team of experts is dedicated to helping you achieve your goals with cutting-edge technology and personalized service. Book a consultation with us to find out how we can help your business thrive.',
    settings: {
      workingHours: {
        sunday: null,
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '15:00' },
        saturday: null,
      },
      slotDuration: 45, // minutes
      breakTime: 15, // minutes
      multipleBookingsPerSlot: true,
      bookingsPerSlot: 5,
      bookingDelay: 2, // hours
      serviceTypes: ['Online', 'Shop Visit', 'Doorstep'],
      shopAddress: '123 Acme St, Business Bay, Tech City, 12345',
      timezone: 'Asia/Kolkata',
      dateFormat: 'dd/MM/yyyy',
      blockedSlots: [],
      blockedDates: [],
    },
};

const createUsernameFromEmail = (email: string) => {
    return email.split('@')[0].toLowerCase();
}


export async function createProvider(name: string, email: string): Promise<Provider> {
    const username = createUsernameFromEmail(email);
    const providerRef = doc(db, 'providers', username);

    const docSnap = await getDoc(providerRef);
    // If provider already exists, don't re-create or re-assign trial
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            joinedDate: data.joinedDate?.toDate(),
            planExpiry: data.planExpiry?.toDate(),
        } as Provider;
    }
    
    const newProvider: Provider = {
        name,
        username: username,
        joinedDate: new Date(),
        contact: {
            email,
            phone: '',
        },
        planId: null,
        planExpiry: null,
        hasUsedTrial: false,
        isSuspended: false,
        googleCalendar: null,
        ...defaultProviderData
    };
    
    // Use setDoc to create the new provider
    await setDoc(providerRef, newProvider);

    // Send welcome email
    await sendWelcomeEmail(email, name);
    
    // Re-fetch to ensure we have the most current data, especially server-generated timestamps if any
    const newDocSnap = await getDoc(providerRef);
    const data = newDocSnap.data()!;
    return {
        ...data,
        joinedDate: data.joinedDate.toDate(),
        planExpiry: data.planExpiry ? data.planExpiry.toDate() : null,
    } as Provider;
}


export async function getProviderByUsername(username: string): Promise<Provider | undefined> {
  const providerRef = doc(db, 'providers', username);
  const docSnap = await getDoc(providerRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      joinedDate: data.joinedDate?.toDate(), // Convert timestamp to date
      planExpiry: data.planExpiry?.toDate()
    } as Provider;
  } else {
    if (username === 'srikanth') {
        console.log(`No such provider: ${username}, creating with default data.`);
        const acmeProvider: Provider = {
            name: 'FixBro Inc.',
            username: 'srikanth',
            contact: {
                email: 'contact@acme.inc',
                phone: '123-456-7890',
            },
            joinedDate: new Date(),
            planId: null,
            planExpiry: null,
            hasUsedTrial: false,
            isSuspended: false,
            googleCalendar: null,
            ...defaultProviderData
        };
        await setDoc(providerRef, acmeProvider);
        return acmeProvider;
    }
    return undefined;
  }
}

export async function updateProvider(username: string, data: Partial<Provider>): Promise<void> {
    const providerRef = doc(db, 'providers', username);
    
    const flattenedData: { [key: string]: any } = {};
    const deepFlatten = (obj: any, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0 && !value.hasOwnProperty('seconds')) {
                deepFlatten(value, newKey);
            } else {
                flattenedData[newKey] = value;
            }
        }
    }
    
    deepFlatten(data);

    await updateDoc(providerRef, flattenedData);
}

export async function deleteProvider(username: string): Promise<void> {
  const providerRef = doc(db, 'providers', username);
  await deleteDoc(providerRef);
}


export async function getBookingsByProvider(username: string): Promise<Booking[]> {
  const bookingsCol = collection(db, `providers/${username}/bookings`);
  const snapshot = await getDocs(bookingsCol);
  const bookings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          dateTime: data.dateTime.toDate(), 
      } as Booking;
  });
  return bookings.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
}

export async function getBookingById(username: string, bookingId: string): Promise<Booking | null> {
    const bookingRef = doc(db, `providers/${username}/bookings`, bookingId);
    const docSnap = await getDoc(bookingRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        dateTime: data.dateTime.toDate(),
    } as Booking;
}

export async function getBookingsForDay(username: string, date: Date): Promise<Booking[]> {
  const bookingsCol = collection(db, `providers/${username}/bookings`);
  const q = query(
    bookingsCol,
    where('dateTime', '>=', startOfDay(date)),
    where('dateTime', '<=', endOfDay(date))
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          dateTime: data.dateTime.toDate(),
      } as Booking;
  });
  return bookings;
}

export async function addBooking(bookingData: Omit<Booking, 'id' | 'status'>): Promise<Booking> {
    const { providerUsername } = bookingData;
    const bookingsCol = collection(db, `providers/${providerUsername}/bookings`);
    
    const dataToSave = { ...bookingData, status: 'Upcoming' };
    const docRef = await addDoc(bookingsCol, dataToSave);

    const newBooking: Booking = {
        id: docRef.id,
        status: 'Upcoming',
        ...bookingData,
    };

    return newBooking;
}

export async function updateBooking(providerUsername: string, bookingId: string, data: Partial<Booking>): Promise<void> {
    const bookingRef = doc(db, `providers/${providerUsername}/bookings`, bookingId);
    await updateDoc(bookingRef, data);
}

export async function updateBookingStatus(providerUsername: string, bookingId: string, status: BookingStatus): Promise<void> {
  const bookingRef = doc(db, `providers/${providerUsername}/bookings`, bookingId);
  await updateDoc(bookingRef, { status });
}

export async function deleteBooking(providerUsername: string, bookingId: string): Promise<void> {
  const bookingRef = doc(db, `providers/${providerUsername}/bookings`, bookingId);
  await deleteDoc(bookingRef);
}


// Admin specific functions
export async function getAllProviders(): Promise<EnrichedProvider[]> {
  const providersCol = collection(db, 'providers');
  const snapshot = await getDocs(providersCol);
  const providers = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      joinedDate: data.joinedDate?.toDate() || new Date(),
      planExpiry: data.planExpiry?.toDate()
    } as Provider;
  });

  // Enrich providers with plan and booking data
  const enrichedProviders = await Promise.all(providers.map(async (provider) => {
    const [plan, bookings] = await Promise.all([
      provider.planId ? getPlan(provider.planId) : Promise.resolve(null),
      getBookingsByProvider(provider.username)
    ]);
    return {
      ...provider,
      plan,
      totalBookings: bookings.length
    };
  }));

  return enrichedProviders;
}

export async function getPayments(): Promise<Payment[]> {
    const paymentsCol = collection(db, 'payments');
    const snapshot = await getDocs(paymentsCol);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
        } as Payment;
    });
}


export async function getGlobalStats(): Promise<{
  providerCount: number;
  totalBookings: number;
  uniqueCustomers: number;
  totalRevenue: number;
  totalTransactions: number;
}> {
  const [providers, payments] = await Promise.all([
    getAllProviders(),
    getPayments()
  ]);

  const providerCount = providers.length;
  let totalBookings = 0;
  const customerEmails = new Set<string>();

  for (const provider of providers) {
    const bookings = await getBookingsByProvider(provider.username);
    totalBookings += bookings.length;
    bookings.forEach(booking => customerEmails.add(booking.customerEmail));
  }

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalTransactions = payments.length;

  return {
    providerCount,
    totalBookings,
    uniqueCustomers: customerEmails.size,
    totalRevenue,
    totalTransactions
  };
}


export async function getAdminSettings(): Promise<AdminSettings | null> {
    const settingsRef = doc(db, 'admin', 'settings');
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // If smtp password is not set, make sure it's an empty string for nodemailer
        if (data.smtp && !data.smtp.password) {
            data.smtp.password = '';
        }
        return data as AdminSettings;
    } else {
        return null;
    }
}

export async function updateAdminSettings(data: Partial<AdminSettings>): Promise<void> {
    const settingsRef = doc(db, 'admin', 'settings');
    // Use setDoc with merge: true to create the document if it doesn't exist,
    // or update it if it does.
    await setDoc(settingsRef, data, { merge: true });
}

// Plan Management
export async function getPlans(): Promise<Plan[]> {
  const plansCol = collection(db, 'plans');
  const snapshot = await getDocs(query(plansCol));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
    } as Plan;
  });
}

export async function getPlan(id: string): Promise<Plan | null> {
  const planRef = doc(db, 'plans', id);
  const docSnap = await getDoc(planRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
    } as Plan;
  }
  return null;
}

export async function createPlan(planData: Omit<Plan, 'id' | 'createdAt'>): Promise<Plan> {
  const plansCol = collection(db, 'plans');
  const docRef = await addDoc(plansCol, {
    ...planData,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...planData, createdAt: new Date() };
}

export async function updatePlan(id: string, planData: Partial<Omit<Plan, 'id' | 'createdAt'>>): Promise<void> {
  const planRef = doc(db, 'plans', id);
  await updateDoc(planRef, planData);
}

export async function deletePlan(id: string): Promise<void> {
  const planRef = doc(db, 'plans', id);
  await deleteDoc(planRef);
}

export async function createPaymentRecord(paymentData: Omit<Payment, 'id' | 'createdAt'>) {
    const paymentsCol = collection(db, 'payments');
    await addDoc(paymentsCol, {
        ...paymentData,
        createdAt: serverTimestamp(),
    });
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [providers, payments, adminSettings] = await Promise.all([
    getAllProviders(),
    getPayments(),
    getAdminSettings(),
  ]);

  // 1. Recent Activity
  const recentActivity: ActivityLog[] = [];
  providers
    .filter(p => p.joinedDate)
    .forEach(p =>
      recentActivity.push({
        id: `signup-${p.username}`,
        type: 'signup',
        description: `${p.name} signed up.`,
        date: p.joinedDate,
      })
    );

  payments.forEach(p =>
    recentActivity.push({
      id: `payment-${p.id}`,
      type: 'payment',
      description: `₹${p.amount} payment from ${p.providerUsername}.`,
      date: p.createdAt,
    })
  );
  
  const allBookings: (Booking & {provider: Provider})[] = [];
  const serviceTypeCounts: { [key: string]: number } = { 'Online': 0, 'Shop Visit': 0, 'Doorstep': 0 };

  for (const provider of providers) {
    const bookings = await getBookingsByProvider(provider.username);
    bookings.forEach(b => {
      allBookings.push({...b, provider});
      if (serviceTypeCounts.hasOwnProperty(b.serviceType)) {
        serviceTypeCounts[b.serviceType]++;
      }
    });
  }

   allBookings.forEach(b =>
      recentActivity.push({
        id: `booking-${b.id}`,
        type: 'booking',
        description: `New booking for ${b.provider.name} by ${b.customerName}.`,
        date: b.dateTime, // Note: this is booking date, not creation date
      })
    );

  recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());

  // 2. Chart Data
  const chartData: { date: string; revenue: number; bookings: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dailyRevenue = payments
      .filter(p => isSameDay(p.createdAt, date))
      .reduce((sum, p) => sum + p.amount, 0);
    const dailyBookings = allBookings
      .filter(b => isSameDay(b.dateTime, date))
      .length;
    chartData.push({ date: dateStr, revenue: dailyRevenue, bookings: dailyBookings });
  }

  // 3. Subscription Status
  const expiringTrials = providers.filter(p => {
    if (p.plan?.duration === 'trial' && p.planExpiry) {
      const now = new Date();
      const expiry = p.planExpiry;
      const threeDaysFromNow = addDays(now, 3);
      return expiry > now && expiry <= threeDaysFromNow;
    }
    return false;
  });

  // 4. Service Type Popularity
  const serviceTypeDistribution = Object.entries(serviceTypeCounts).map(([name, value]) => ({ name, value }));

  // 5. System Alerts
  const systemAlerts: string[] = [];
  if (!adminSettings?.razorpay?.keyId) {
    systemAlerts.push('Razorpay Key ID is not configured.');
  }
  if (!adminSettings?.smtp?.host) {
    systemAlerts.push('SMTP email settings are not configured.');
  }
  const expiredSubscriptions = providers.filter(
    p => p.planExpiry && p.planExpiry < new Date()
  ).length;
  if (expiredSubscriptions > 0) {
    systemAlerts.push(
      `${expiredSubscriptions} provider(s) have an expired subscription.`
    );
  }


  return {
    recentActivity: recentActivity.slice(0, 5),
    chartData,
    expiringTrials,
    serviceTypeDistribution,
    systemAlerts,
  };
}

function isSameDay(date1: Date, date2: Date) {
    return isSameDayFns(date1, date2);
}


export async function getReportsData(): Promise<ReportsData> {
  const [providers, allPlans] = await Promise.all([
    getAllProviders(),
    getPlans()
  ]);
  
  const allBookingsPromises = providers.map(async (provider) => {
    const providerBookings = await getBookingsByProvider(provider.username);
    return providerBookings.map(booking => ({
      ...booking,
      provider: { name: provider.name, username: provider.username },
    }));
  });

  const allBookingsNested = await Promise.all(allBookingsPromises);
  const allBookings = allBookingsNested.flat();
  
  const allPayments = await getPayments();
  const now = new Date();

  // Provider Stats
  const paidProviders = providers.filter(p => p.planId && p.plan?.duration !== 'trial' && p.planExpiry && p.planExpiry > now).length;
  const trialProviders = providers.filter(p => p.plan?.duration === 'trial' && p.planExpiry && p.planExpiry > now).length;
  const expiredProviders = providers.filter(p => p.planExpiry && p.planExpiry < now).length;
  const sortedProviders = [...providers].sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0));
  const topProviders = sortedProviders.slice(0, 5);

  // Service Usage Stats
  const serviceTypeCounts: { [key: string]: number } = { 'Online': 0, 'Shop Visit': 0, 'Doorstep': 0 };
  allBookings.forEach(b => {
    if (serviceTypeCounts.hasOwnProperty(b.serviceType)) {
      serviceTypeCounts[b.serviceType]++;
    }
  });
  const serviceUsageByType = [
    { name: "Online", value: serviceTypeCounts['Online'], fill: "hsl(var(--chart-1))" },
    { name: "Shop Visit", value: serviceTypeCounts['Shop Visit'], fill: "hsl(var(--chart-2))" },
    { name: "Doorstep", value: serviceTypeCounts['Doorstep'], fill: "hsl(var(--chart-3))" },
  ];

  const bookingsByHour = Array(24).fill(0);
  allBookings.forEach(booking => {
    const hour = getHours(booking.dateTime);
    bookingsByHour[hour]++;
  });
  const serviceUsageByHour = bookingsByHour.map((count, hour) => ({
    hour: `${hour}:00`,
    "Bookings": count,
  }));
  const usageByHourConfig = {
      "Bookings": { label: "Bookings", color: "hsl(var(--chart-1))" }
  };

  // Booking Stats
  const bookingStats = {
    total: allBookings.length,
    completed: allBookings.filter(b => b.status === 'Completed').length,
    canceled: allBookings.filter(b => b.status === 'Canceled').length,
    allBookings: allBookings.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()),
  };

  // Revenue Stats
  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const revenueChartData: { date: string, revenue: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dailyRevenue = allPayments
          .filter(p => isSameDay(p.createdAt, date))
          .reduce((sum, p) => sum + p.amount, 0);
      revenueChartData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dailyRevenue
      });
  }

  const revenueByPlan: { [planId: string]: number } = {};
  allPayments.forEach(p => {
    revenueByPlan[p.planId] = (revenueByPlan[p.planId] || 0) + p.amount;
  });

  const topPlans = Object.entries(revenueByPlan)
    .map(([planId, revenue]) => {
        const plan = allPlans.find(p => p.id === planId);
        return { name: plan?.name || 'Unknown Plan', revenue };
    })
    .sort((a, b) => b.revenue - a.revenue);


  return {
    providerStats: {
      total: providers.length,
      trial: trialProviders,
      paid: paidProviders,
      expired: expiredProviders,
      topProviders: topProviders,
    },
    serviceUsage: {
      byType: serviceUsageByType,
      byHour: serviceUsageByHour,
      byHourConfig: usageByHourConfig,
    },
    bookingStats,
    revenueStats: {
        total: totalRevenue,
        chartData: revenueChartData,
        topPlans: topPlans,
    },
  }
}


// Testimonial Management
export async function getTestimonials(): Promise<Testimonial[]> {
    const settings = await getAdminSettings();
    const testimonials = settings?.site?.testimonials || [];
    return testimonials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
