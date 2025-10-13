

'use client';

import { getBookingsByProvider, getProviderByUsername, getPlan } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Provider, Plan } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";
import { Loader2, Book, CalendarCheck, Wallet, Calendar, ArrowRight, User, Settings, Link as LinkIcon, CreditCard, CheckCircle } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { isThisMonth, startOfToday, format, formatDistanceToNow } from "date-fns";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrency } from "@/lib/currencies";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const currency = getCurrency(provider?.settings.currency);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const username = user.email.split('@')[0];
        try {
          const providerData = await getProviderByUsername(username);
          if (!providerData) {
            throw new Error("Provider not found");
          }
          const [bookingsData, planData] = await Promise.all([
            getBookingsByProvider(username),
            providerData.planId ? getPlan(providerData.planId) : Promise.resolve(null),
          ]);
          setProvider(providerData);
          setPlan(planData);
          setBookings(bookingsData); 
        } catch (error) {
          console.error("Failed to fetch dashboard data", error);
          router.push('/login');
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!provider) {
    return null; // Should be redirected
  }

  const dateFormat = provider.settings?.dateFormat || 'PPP';
  const timezone = provider.settings?.timezone || 'UTC';

  // --- STATS CALCULATION ---
  const upcomingBookings = bookings.filter(b => b.status === 'Upcoming' && b.dateTime >= startOfToday());
  const totalBookings = bookings.filter(b => b.status === 'Upcoming' || b.status === 'Completed').length;
  const totalRevenue = bookings.reduce((acc, b) => acc + (b.payment?.amount || 0), 0);
  const thisMonthBookingsCount = bookings.filter(b => (b.status === 'Completed' || b.status === 'Upcoming') && isThisMonth(b.dateTime)).length;
  
  const getServiceTypeBadgeVariant = (serviceName: string) => {
    const service = provider?.settings.serviceTypes.find(st => st.name === serviceName);
    if (!service) return 'outline';
    switch (service.id) {
        case 'online':
            return 'default';
        case 'shop':
            return 'secondary';
        case 'doorstep':
            return 'outline';
        default:
            return 'outline';
    }
  }


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Bookings" value={totalBookings} icon={Book} description="Completed & Upcoming" />
          <StatCard title="Upcoming" value={upcomingBookings.length} icon={CalendarCheck} description="All future bookings" />
          <StatCard title="Total Revenue" value={`${currency?.symbol}${totalRevenue.toLocaleString()}`} icon={Wallet} description="From all paid bookings" />
          <StatCard title="This Month" value={thisMonthBookingsCount} icon={Calendar} description="Completed & Upcoming" />
      </div>

       <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Next 5 Upcoming Bookings</CardTitle>
                            <CardDescription>
                            A quick look at your upcoming appointments.
                            </CardDescription>
                        </div>
                        <Button asChild variant="outline">
                                <Link href="/bookings">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                    </CardHeader>
                    <CardContent>
                       {/* Desktop View */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Service Type</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {upcomingBookings.length > 0 ? (
                              upcomingBookings.slice(0, 5).map((booking) => (
                                <TableRow key={booking.id}>
                                  <TableCell>
                                    <div className="font-medium">{booking.customerName}</div>
                                    <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getServiceTypeBadgeVariant(booking.serviceType)}>{booking.serviceType}</Badge>
                                  </TableCell>
                                  <TableCell>{formatInTimeZone(booking.dateTime, timezone, dateFormat)}</TableCell>
                                  <TableCell>{formatInTimeZone(booking.dateTime, timezone, 'p')}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">No upcoming bookings found.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Mobile View */}
                      <div className="md:hidden space-y-4">
                        {upcomingBookings.length > 0 ? (
                          upcomingBookings.slice(0, 5).map((booking) => (
                             <Card key={booking.id} className="p-4">
                                <CardContent className="p-0 space-y-2">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-semibold">{booking.customerName}</p>
                                          <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                                      </div>
                                      <Badge variant={getServiceTypeBadgeVariant(booking.serviceType)}>{booking.serviceType}</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground pt-2">
                                      <p>{formatInTimeZone(booking.dateTime, timezone, dateFormat)} at {formatInTimeZone(booking.dateTime, timezone, 'p')}</p>
                                  </div>
                                </CardContent>
                            </Card>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-8">No upcoming bookings found.</p>
                        )}
                      </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                         <Avatar className="h-16 w-16">
                            <AvatarImage src={provider.logoUrl} alt={provider.name} />
                            <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{provider.name}</p>
                            <p className="text-sm text-muted-foreground">{provider.contact.email}</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/profile"><User className="mr-2 h-4 w-4" /> Edit Profile</Link>
                        </Button>
                    </CardFooter>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Subscription Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">{plan?.name || 'No Plan'}</span>
                            <Badge variant={plan ? 'default' : 'destructive'}>{plan ? plan.duration : 'Inactive'}</Badge>
                        </div>
                         {provider.planExpiry && (
                            <p className="text-sm text-muted-foreground mt-2">
                                {provider.planExpiry > new Date() ? 'Expires ' : 'Expired '} 
                                {formatDistanceToNow(provider.planExpiry, { addSuffix: true })}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline" className="w-full">
                            <Link href="/subscription"><CreditCard className="mr-2 h-4 w-4" /> Manage Subscription</Link>
                        </Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Calendar Sync</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-2">
                        {provider.googleCalendar ? (
                             <>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <p>Google Calendar is connected.</p>
                             </>
                        ) : (
                            <p className="text-muted-foreground">Not connected.</p>
                        )}
                    </CardContent>
                     <CardFooter>
                         <Button asChild variant="outline" className="w-full">
                            <Link href="/calendar-setup"><Calendar className="mr-2 h-4 w-4" /> Configure Sync</Link>
                        </Button>
                    </CardFooter>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                         <Button asChild variant="outline">
                            <Link href="/slot-management">Block Slots</Link>
                        </Button>
                         <Button asChild variant="outline">
                            <Link href="/settings">Set Availability</Link>
                        </Button>
                        <Button asChild variant="outline" className="col-span-2">
                            <Link href={`/${provider.username}`}>View Booking Page</Link>
                        </Button>
                    </CardContent>
                </Card>

            </div>
       </div>

    </div>
  );
}
