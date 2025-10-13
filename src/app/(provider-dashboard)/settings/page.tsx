

'use client';

import { useEffect, useState } from "react";
import { getProviderByUsername, updateProvider } from "@/lib/data";
import { notFound, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Provider, WorkingHours, ServiceTypeSetting } from "@/lib/types";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { timezones } from "@/lib/timezones";
import { currencies, getCurrency, type Currency } from "@/lib/currencies";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const STANDARD_DURATIONS = [30, 45, 60, 90];

const DATE_FORMATS = [
    { value: 'MMMM d, yyyy', label: 'January 1, 2025 (MMMM d, yyyy)' },
    { value: 'dd/MM/yyyy', label: '01/01/2025 (dd/MM/yyyy)' },
    { value: 'MM/dd/yyyy', label: '01/01/2025 (MM/dd/yyyy)' },
    { value: 'yyyy-MM-dd', label: '2025-01-01 (yyyy-MM-dd)' },
    { value: 'PPP', label: 'Jan 1st, 2025 (PPP)' },
];


export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [durationSelectValue, setDurationSelectValue] = useState<string>('');
  const [openTimezoneCombobox, setOpenTimezoneCombobox] = useState(false);
  const [openCurrencyCombobox, setOpenCurrencyCombobox] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        // This is a simplification. In a real app, you'd map UID to provider.
        const username = currentUser.email.split('@')[0];
        try {
          const providerData = await getProviderByUsername(username);
          if (providerData) {
            setProvider(providerData);
             if (providerData.settings?.slotDuration) {
              const isCustom = !STANDARD_DURATIONS.includes(providerData.settings.slotDuration);
              setDurationSelectValue(isCustom ? 'custom' : String(providerData.settings.slotDuration));
            }
          } else {
            notFound();
          }
        } catch (error) {
          console.error("Failed to fetch provider data", error);
          toast({ title: "Error", description: "Could not load provider settings.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast]);

  
  const handleSettingsChange = (key: string, value: any) => {
    if (!provider) return;
    setProvider(prev => prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : null);
  };
  
  const handleServiceTypeChange = (id: 'online' | 'shop' | 'doorstep', field: keyof ServiceTypeSetting, value: any) => {
      if (!provider) return;

      const updatedServiceTypes = provider.settings.serviceTypes.map(st => 
          st.id === id ? { ...st, [field]: value } : st
      );
      handleSettingsChange('serviceTypes', updatedServiceTypes);
  }


  const handleWorkingHoursChange = (day: keyof WorkingHours, part: 'start' | 'end' | 'enabled', value: string | boolean) => {
      if (!provider) return;

      const updatedHours = { ...provider.settings.workingHours };

      if (part === 'enabled') {
          if (value) {
              // When enabling, set default hours if they don't exist
              if (!updatedHours[day]) {
                  updatedHours[day] = { start: '09:00', end: '17:00' };
              }
          } else {
              // When disabling, set to null
              updatedHours[day] = null;
          }
      } else {
          // This handles start/end time changes
          const currentDayHours = updatedHours[day];
          if (currentDayHours) {
              updatedHours[day] = { ...currentDayHours, [part]: value };
          }
      }
      handleSettingsChange('workingHours', updatedHours);
  }

  const handleSaveSettings = async () => {
    if (!provider) return;
    setSaving(true);
    try {
      // We only need to pass the settings object to update
      await updateProvider(provider.username, { settings: provider.settings });
      toast({
        title: "Settings Saved",
        description: "Your new settings have been successfully saved.",
      });
    } catch (error) {
      console.error("Failed to save settings", error);
      toast({
        title: "Error",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading || !provider) {
    return (
       <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-1/3" />
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>

         <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
              {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>

        <div className="flex justify-end">
            <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  const { settings } = provider;
  const orderedDays: (keyof WorkingHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  const getServiceTypeDescription = (id: string) => {
    switch (id) {
      case 'online':
        return "This field is for online services, consultations, or meetings.";
      case 'shop':
        return "This field is for in-office or on-site services at your business location.";
      case 'doorstep':
        return "This field is for services provided at the customer's location.";
      default:
        return "";
    }
  }

  const currency = getCurrency(settings.currency);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Booking Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>General Availability</CardTitle>
          <CardDescription>Configure how and when customers can book you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="slot-duration">Slot Duration</Label>
              <Select value={durationSelectValue} onValueChange={(value) => {
                setDurationSelectValue(value);
                if (value !== 'custom') {
                  handleSettingsChange('slotDuration', Number(value));
                }
              }}>
                <SelectTrigger id="slot-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
               {durationSelectValue === 'custom' && (
                <div className="pt-2">
                    <Input 
                        id="custom-slot-duration" 
                        type="number" 
                        value={settings.slotDuration ?? ''} 
                        onChange={(e) => handleSettingsChange('slotDuration', e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="Minutes"
                    />
                     <p className="text-sm text-muted-foreground pt-1">Enter a custom duration in minutes.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-time">Break Time (in minutes)</Label>
              <Input id="break-time" type="number" value={settings.breakTime ?? ''} onChange={(e) => handleSettingsChange('breakTime', e.target.value === '' ? null : Number(e.target.value))} />
               <p className="text-sm text-muted-foreground">Time between slots.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-delay">Booking Delay (in hours)</Label>
              <Input id="booking-delay" type="number" value={settings.bookingDelay ?? ''} onChange={(e) => handleSettingsChange('bookingDelay', e.target.value === '' ? null : Number(e.target.value))} />
               <p className="text-sm text-muted-foreground">Prevent last-minute bookings.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="multiple-bookings" checked={settings.multipleBookingsPerSlot} onCheckedChange={(checked) => handleSettingsChange('multipleBookingsPerSlot', checked)} />
              <Label htmlFor="multiple-bookings">Allow multiple bookings per slot</Label>
            </div>
            {settings.multipleBookingsPerSlot && (
              <div className="space-y-2 pl-8">
                 <Label htmlFor="bookings-per-slot">Bookings Per Slot</Label>
                <Input
                  id="bookings-per-slot"
                  type="number"
                  min="1"
                  value={settings.bookingsPerSlot ?? ''}
                  onChange={(e) => handleSettingsChange('bookingsPerSlot', e.target.value === '' ? null : Number(e.target.value))}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">The number of bookings allowed for each time slot.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Payment Options</CardTitle>
            <CardDescription>Choose how you want to accept payments for your services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="online-payment" className="flex flex-col gap-1">
                    <span>Enable Online Payment</span>
                    <span className="font-normal text-muted-foreground">
                        Allow customers to pay upfront using Razorpay.
                    </span>
                </Label>
                <Switch
                    id="online-payment"
                    checked={provider.settings.onlinePaymentEnabled}
                    onCheckedChange={(checked) => handleSettingsChange('onlinePaymentEnabled', checked)}
                />
            </div>
             <div className="flex items-center justify-between rounded-lg border p-4">
                 <Label htmlFor="pay-later" className="flex flex-col gap-1">
                    <span>Enable Pay After Service</span>
                     <span className="font-normal text-muted-foreground">
                       Allow customers to book now and pay in person.
                    </span>
                </Label>
                <Switch
                    id="pay-later"
                    checked={provider.settings.payAfterServiceEnabled}
                    onCheckedChange={(checked) => handleSettingsChange('payAfterServiceEnabled', checked)}
                />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Set your local timezone, date format, and currency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Popover open={openCurrencyCombobox} onOpenChange={setOpenCurrencyCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {currency ? `${currency.name} (${currency.symbol})` : 'Select currency...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search currency..." />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-60">
                           {currencies.map((c) => (
                            <CommandItem
                              key={c.code}
                              value={`${c.name} ${c.code} ${c.symbol}`}
                              onSelect={() => {
                                handleSettingsChange('currency', c.code);
                                setOpenCurrencyCombobox(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", settings.currency === c.code ? "opacity-100" : "opacity-0")} />
                              {c.name} ({c.symbol})
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
             <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select
                  value={settings.dateFormat || 'MMMM d, yyyy'}
                  onValueChange={(value) => handleSettingsChange('dateFormat', value)}
                >
                  <SelectTrigger id="date-format">
                    <SelectValue placeholder="Select a date format" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <p className="text-sm text-muted-foreground">Choose how dates are displayed.</p>
              </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Popover open={openTimezoneCombobox} onOpenChange={setOpenTimezoneCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openTimezoneCombobox}
                  className="w-full justify-between"
                >
                  {settings.timezone
                    ? timezones.find((tz) => tz.name === settings.timezone)?.name.replace(/_/g, ' ')
                    : "Select your timezone..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command
                   filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1
                    return 0
                  }}
                >
                  <CommandInput placeholder="Search timezone..." />
                  <CommandList>
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-60">
                        {timezones.map((tz) => (
                          <CommandItem
                            key={tz.name}
                            value={`${tz.name.replace(/_/g, ' ')} ${tz.offset}`}
                            onSelect={(currentValue) => {
                              const selectedTz = timezones.find(t => `${t.name.replace(/_/g, ' ')} ${t.offset}`.toLowerCase() === currentValue.toLowerCase());
                              if (selectedTz) {
                                handleSettingsChange('timezone', selectedTz.name);
                              }
                              setOpenTimezoneCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                settings.timezone === tz.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {tz.name.replace(/_/g, ' ')} ({tz.offset})
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              This will ensure booking slots are displayed in your local time.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
          <CardDescription>Define the types of services you offer and whether they require payment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {settings.serviceTypes.map(st => (
              <div key={st.id} className="p-4 border rounded-lg space-y-4">
                  <p className="text-sm text-muted-foreground">{getServiceTypeDescription(st.id)}</p>
                  <div className="flex items-center justify-between">
                      <Input 
                        id={`service-name-${st.id}`}
                        value={st.name}
                        onChange={(e) => handleServiceTypeChange(st.id, 'name', e.target.value)}
                        className="max-w-xs"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch 
                            id={`service-enabled-${st.id}`}
                            checked={st.enabled} 
                            onCheckedChange={(checked) => handleServiceTypeChange(st.id, 'enabled', checked)}
                        />
                         <Label htmlFor={`service-enabled-${st.id}`}>{st.enabled ? 'Enabled' : 'Disabled'}</Label>
                      </div>
                  </div>
                  {st.enabled && (
                    <div className="p-4 bg-muted/50 rounded-md space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`service-pricing-enabled-${st.id}`}>Enable Pricing</Label>
                         <Switch 
                            id={`service-pricing-enabled-${st.id}`}
                            checked={st.priceEnabled} 
                            onCheckedChange={(checked) => handleServiceTypeChange(st.id, 'priceEnabled', checked)}
                        />
                      </div>
                       {st.priceEnabled && (
                         <div className="space-y-2">
                          <Label htmlFor={`service-price-${st.id}`}>Set Price ({currency?.code})</Label>
                          <Input 
                            id={`service-price-${st.id}`}
                            type="number"
                            value={st.price ?? ''}
                            onChange={(e) => handleServiceTypeChange(st.id, 'price', e.target.value === '' ? undefined : Number(e.target.value))}
                            placeholder={`e.g., 500`}
                            className="max-w-[120px]"
                          />
                        </div>
                      )}
                    </div>
                  )}
              </div>
            ))}
            <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="shop-address">Shop/Business Address</Label>
                <Textarea id="shop-address" placeholder="123 Main St, Anytown, USA" value={settings.shopAddress ?? ''} onChange={(e) => handleSettingsChange('shopAddress', e.target.value)} />
                <p className="text-sm text-muted-foreground">Required if you offer 'Shop Visit' or 'Doorstep' services.</p>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Working Hours</CardTitle>
            <CardDescription>Set your weekly availability. Unchecked days are considered days off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {orderedDays.map((day) => {
              const hours = settings.workingHours[day];
              const isEnabled = !!hours;
              return (
                 <div key={day} className="grid grid-cols-3 items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch id={day} checked={isEnabled} onCheckedChange={(checked) => handleWorkingHoursChange(day, 'enabled', !!checked)} />
                        <Label htmlFor={day} className="capitalize">{day}</Label>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                         <Input type="time" value={hours?.start || '09:00'} disabled={!isEnabled} onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)} />
                         <Input type="time" value={hours?.end || '17:00'} disabled={!isEnabled} onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)} />
                    </div>
                 </div>
              );
            })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
