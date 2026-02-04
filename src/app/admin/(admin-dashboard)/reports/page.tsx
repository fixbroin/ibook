

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, FileText, BarChart2, PieChart as PieChartIcon, CheckCircle, XCircle, Book, DollarSign } from 'lucide-react';
import { getReportsData } from '@/lib/data';
import type { ReportsData, EnrichedProvider, EnrichedBooking, BookingStatus } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, LineChart, Line, Tooltip } from "recharts"
import Balancer from "react-wrap-balancer"
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const getStatusVariant = (status: BookingStatus) => {
    switch (status) {
        case 'Upcoming':
            return 'default';
        case 'Completed':
            return 'secondary';
        case 'Canceled':
            return 'destructive';
        default:
            return 'outline';
    }
}


export default function AdminReportsPage() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getReportsData().then(reportsData => {
            setData(reportsData);
            setLoading(false);
        });
    }, []);
    
    if (loading || !data) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-muted-foreground">
                <Balancer>
                Deep dive into your platform's performance with detailed reports on providers, revenue, and service usage.
                </Balancer>
            </p>
        </div>
        <Tabs defaultValue="providers">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="service-usage">Service Usage</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>

            {/* Providers Tab */}
            <TabsContent value="providers" className="space-y-6">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Providers" value={data.providerStats.total} icon={Users} />
                    <StatCard title="Paid Subscriptions" value={data.providerStats.paid} icon={Users} />
                    <StatCard title="Trial Users" value={data.providerStats.trial} icon={Users} />
                    <StatCard title="Expired Subscriptions" value={data.providerStats.expired} icon={Users} />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Providers</CardTitle>
                        <CardDescription>Providers with the most bookings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Provider</TableHead>
                                <TableHead className="text-right">Total Bookings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.providerStats.topProviders.map((provider: EnrichedProvider) => (
                                    <TableRow key={provider.username}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                <AvatarImage src={provider.logoUrl} alt={provider.name} />
                                                <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{provider.name}</div>
                                                    <div className="text-sm text-muted-foreground">{provider.contact.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{provider.totalBookings}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Service Usage Tab */}
            <TabsContent value="service-usage" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Bookings by Service Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="mx-auto aspect-square max-h-[300px]">
                                <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={data.serviceUsage.byType} dataKey="value" nameKey="name" />
                                </PieChart>
                            </ChartContainer>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Bookings by Hour of Day</CardTitle>
                             <CardDescription>Shows the most popular times for bookings across all providers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={data.serviceUsage.byHourConfig} className="max-h-[300px]">
                                <BarChart data={data.serviceUsage.byHour} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="hour"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Bar dataKey="Bookings" fill="var(--color-Bookings)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            
            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard title="Total Bookings" value={data.bookingStats.total} icon={Book} />
                    <StatCard title="Completed Bookings" value={data.bookingStats.completed} icon={CheckCircle} />
                    <StatCard title="Canceled Bookings" value={data.bookingStats.canceled} icon={XCircle} />
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Booking Details</CardTitle>
                        <CardDescription>A detailed report on all bookings. Filters and export coming soon.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {data.bookingStats.allBookings.map((booking: EnrichedBooking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell>
                                            <div className="font-medium">{booking.customerName}</div>
                                            <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                                        </TableCell>
                                         <TableCell>
                                            <div className="font-medium">{booking.provider.name}</div>
                                            <div className="text-sm text-muted-foreground">@{booking.provider.username}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={booking.serviceType === 'Online' ? 'default' : 'outline'}>{booking.serviceType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div>{format(booking.dateTime, 'PPP')}</div>
                                            <div className="text-sm text-muted-foreground">{format(booking.dateTime, 'p')}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                     <StatCard title="Total Subscription Revenue" value={`₹${data.revenueStats.total.toLocaleString()}`} icon={DollarSign} />
                     <Card>
                        <CardHeader>
                            <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="h-[200px] w-full">
                                <LineChart
                                    data={data.revenueStats.chartData}
                                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                                    <Line dataKey="revenue" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                     </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Plan</CardTitle>
                        <CardDescription>Performance of each subscription plan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Plan Name</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.revenueStats.topPlans.map(plan => (
                                    <TableRow key={plan.name}>
                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                        <TableCell className="text-right font-medium">₹{plan.revenue.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

