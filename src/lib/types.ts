

import type { ChartConfig } from "@/components/ui/chart"
export type ServiceType = 'Online' | 'Shop Visit' | 'Doorstep';
export type BookingStatus = 'Upcoming' | 'Completed' | 'Canceled' | 'Not Completed' | 'Pending';

export type WorkingHours = {
  [day: string]: { start: string; end: string } | null;
};

export type Service = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  offerPrice?: number;
  duration: number; // in minutes
  displayOrder: number;
  enabled: boolean;
  assignedServiceTypes: ('online' | 'shop' | 'doorstep')[];
  quantityEnabled?: boolean;
  maxQuantity?: number;
};


export type ServiceTypeSetting = {
  id: 'online' | 'shop' | 'doorstep';
  name: string;
  enabled: boolean;
  priceEnabled?: boolean;
  price?: number;
}

export type CustomPageAbout = {
  enabled: boolean;
  title: string;
  description: string;
};

export type CustomPageContact = {
  enabled: boolean;
  title: string;
  mobile: string;
  email: string;
  address: string;
  mapLink: string;
};

export type CustomPageCancellation = {
  enabled: boolean;
  title: string;
  description: string;
};

export type ProviderTestimonial = {
  id: string;
  name: string;
  role?: string;
  rating: number;
  description: string;
  imageUrl?: string;
  enabled: boolean;
  displayOrder: number;
};

export type ProviderGalleryItem = {
  id: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  enabled: boolean;
  displayOrder: number;
};

export type FloatingButtonsSettings = {
    enabled: boolean;
    callNumber: string;
    whatsappNumber: string;
    whatsappMessage: string;
    position: 'bottom-right' | 'bottom-left';
    animationEnabled: boolean;
    animationStyle?: 'spin' | 'bounce' | 'pulse' | 'tada' | 'wiggle' | 'shake-x' | 'shake-y' | 'heart-beat' | 'swing' | 'rubber-band' | 'flash' | 'jello' | 'wobble' | 'head-shake' | 'flip';
};

export type ProviderSettings = {
  workingHours: WorkingHours;
  slotDuration: number;
  breakTime: number; // in minutes
  multipleBookingsPerSlot: boolean;
  bookingsPerSlot: number;
  bookingDelay: number;
  serviceTypes: ServiceTypeSetting[];
  shopAddress: string | null;
  googleMapLink?: string | null;
  timezone: string;
  dateFormat: string;
  currency: string;
  onlinePaymentEnabled: boolean;
  payAfterServiceEnabled: boolean;
  blockedSlots?: string[]; // ISO strings for specific blocked slots
  blockedDates?: string[]; // "yyyy-MM-dd" strings for blocked dates
  customPages?: {
    about: CustomPageAbout;
    contact: CustomPageContact;
    cancellationPolicy: CustomPageCancellation;
  };
  enableServicesPage?: boolean;
  services?: Service[];
  paymentGateways?: PaymentGatewaySettings;
  testimonials?: {
    enabled: boolean;
    items: ProviderTestimonial[];
  };
  gallery?: {
    enabled: boolean;
    title?: string;
    items: ProviderGalleryItem[];
  };
  floatingButtons?: FloatingButtonsSettings;
};

export type CalendarTokens = {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
};


export type ProviderProfile = {
  name: string;
  username: string;
  logoUrl: string;
  description: string;
  contact: {
    email: string;
    phone: string;
  };
  joinedDate: Date;
  planId: string | null;
  planExpiry: Date | null;
  hasUsedTrial?: boolean;
  isSuspended?: boolean;
  googleCalendar?: CalendarTokens | null;
  outlookCalendar?: CalendarTokens | null;
  expiryNotified?: boolean;
};

export type Provider = ProviderProfile & {
  settings: ProviderSettings;
};

export type EnrichedProvider = Provider & {
  plan?: Plan | null;
  totalBookings?: number;
};


export type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string; // Storing the name of the service type
  address?: string; // Full address string
  flatHouseNo?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  dateTime: Date;
  providerUsername: string;
  status: BookingStatus;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
  payment?: {
    orderId?: string;
    paymentId?: string;
    amount?: number;
    status?: 'Paid' | 'Pending';
  };
  serviceId?: string | null;
  service?: Service; // Added for convenience when enriching booking data
  quantity?: number;
};

export type EnrichedBooking = Booking & {
  provider: {
    name: string;
    username: string;
  }
}

// This type is needed for the form validation
export type BookingFormValues = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  countryCode: string;
  serviceType?: string;
  serviceId?: string;
  flatHouseNo?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  dateTime: string; // Storing as ISO string
  providerUsername: string;
  paymentMethod?: 'online' | 'later';
  quantity?: number;
}

// Admin specific types
export type RazorpaySettings = {
    keyId: string;
    keySecret: string;
    webhookSecret?: string;
}

export type SmtpSettings = {
    host: string;
    port: number;
    senderEmail: string;
    username: string;
    password?: string;
}

export type HeroButton = {
    text: string;
    link: string;
    variant: 'default' | 'outline';
};

export type HeroMedia = {
    type: 'image' | 'video' | 'gif';
    url: string;
};


export type HeroSettings = {
    title: string;
    paragraph: string;
    media?: HeroMedia[];
    imageUrl: string; // Fallback
    clickUrl?: string;
    buttons: HeroButton[];
}

export type FaqItem = {
    id: string;
    question: string;
    answer: string;
    displayOrder: number;
}

export type BrandingSettings = {
    siteName: string;
    logoUrl: string;
}

export type SocialLink = {
  id: string;
  name: string;
  url: string;
  icon: string;
};

export type SiteLink = {
  id: string;
  name: string;
  url: string;
}

export type FooterSettings = {
  description: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  socialLinks: SocialLink[];
  siteLinks: SiteLink[];
  copyright: string;
}

export type ScreenshotItem = {
  id: string;
  imageUrl: string;
  url?: string;
};

export type ScreenshotsSettings = {
    title: string;
    screenshots: ScreenshotItem[];
};

export type MarketingIntegration = {
    id: string;
    enabled: boolean;
};

export type MarketingSettings = {
    googleTagManager: MarketingIntegration;
    googleAnalytics: MarketingIntegration;
    googleAdsConversion: MarketingIntegration & { label?: string };
    googleOptimize: MarketingIntegration;
    googleRemarketing: MarketingIntegration & { script: string };
    metaPixel: MarketingIntegration & { accessToken?: string };
    metaConversionsApi: MarketingIntegration;
    bingUetTag: MarketingIntegration;
    pinterestTag: MarketingIntegration;
    microsoftClarity: MarketingIntegration;
    customHeadScript: MarketingIntegration & { script: string };
    customBodyScript: MarketingIntegration & { script: string };
};

export type PolicySettings = {
  terms: string;
  privacy: string;
  cancellation: string;
  refund: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
};

export type AboutSettings = {
  title: string;
  subtitle: string;
  mission: string;
  teamTitle: string;
  teamSubtitle: string;
  teamMembers: TeamMember[];
};

export type SeoSettings = {
  titleTemplate: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  openGraphImageUrl: string;
  twitterHandle: string;
}

export type SiteSettings = {
    hero: HeroSettings;
    branding: BrandingSettings;
    faq?: FaqItem[];
    testimonials?: Testimonial[];
    footer?: FooterSettings;
    screenshots?: ScreenshotsSettings;
    policies?: PolicySettings;
    about?: AboutSettings;
    seo?: SeoSettings;
    floatingButtons?: FloatingButtonsSettings;
}

export type GoogleApiSettings = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
};

export type OutlookApiSettings = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
};

export type PaymentGatewaySettings = {
    razorpay: {
        enabled: boolean;
        keyId: string;
        keySecret: string;
    },
    stripe: {
        enabled: boolean;
        publicKey: string;
        secretKey: string;
    },
    paypal: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
    },
    custom: {
        enabled: boolean;
        paymentLink: string;
    }
}


export type AdminSettings = {
    razorpay?: RazorpaySettings;
    smtp?: SmtpSettings;
    site?: SiteSettings;
    marketing?: MarketingSettings;
    googleApi?: GoogleApiSettings;
    outlookApi?: OutlookApiSettings;
}


export type Plan = {
  id: string;
  name: string;
  price: number;
  offerPrice?: number | null;
  duration: 'monthly' | 'yearly' | 'lifetime' | 'trial';
  features: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  days?: number | null;
  isFeatured?: boolean;
  displayOrder?: number;
}

export type Payment = {
  id?: string;
  providerUsername: string;
  planId: string;
  bookingId?: string;
  amount: number;
  currency: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  createdAt: Date;
};

export type ActivityLog = {
    id: string;
    type: 'signup' | 'payment' | 'booking';
    description: string;
    date: Date;
}

export type AdminDashboardData = {
    recentActivity: ActivityLog[];
    chartData: { date: string; revenue: number; bookings: number }[];
    expiringTrials: EnrichedProvider[];
    serviceTypeDistribution: { name: string; value: number }[];
    systemAlerts: string[];
}

export type ReportsData = {
  providerStats: {
    total: number;
    trial: number;
    paid: number;
    expired: number;
    topProviders: EnrichedProvider[];
  };
  serviceUsage: {
    byType: { name: string; value: number; fill: string }[];
    byHour: { hour: string; "Bookings": number }[];
    byHourConfig: ChartConfig;
  };
  bookingStats: {
    total: number;
    completed: number;
    canceled: number;
    allBookings: EnrichedBooking[];
  };
  revenueStats: {
    total: number;
    chartData: { date: string; revenue: number }[];
    topPlans: { name: string; revenue: number }[];
  };
}

export type Testimonial = {
  id: string;
  name: string;
  rating: number;
  description: string;
  imageUrl: string;
  createdAt: Date | string;
};

export type Notification = {
    id: string;
    message: string;
    read: boolean;
    createdAt: Date;
    type: 'new_booking' | 'new_provider' | 'general';
    link?: string;
};
