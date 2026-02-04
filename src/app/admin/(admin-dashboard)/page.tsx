

'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Users,
  Book,
  DollarSign,
  BarChart,
  Loader2,
  AlertTriangle,
  PieChart as PieChartIcon,
  Clock,
  Send,
  UserPlus,
  BadgeCent,
} from 'lucide-react';
import { getAdminDashboardData, getGlobalStats } from '@/lib/data';
import type { AdminDashboardData } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { sendExpiryReminderEmail as sendReminderAction } from '@/lib/admin.actions';

type GlobalStats = {
  providerCount: number;
  totalBookings: number;
  uniqueCustomers: number;
  totalRevenue: number;
  totalTransactions: number;
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsData, dashboardData] = await Promise.all([
          getGlobalStats(),
          getAdminDashboardData(),
        ]);
        setStats(statsData);
        setDashboardData(dashboardData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Could not load dashboard data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [toast]);

  const handleSendReminder = (providerEmail: string, providerName: string) => {
    startTransition(async () => {
      const result = await sendReminderAction(providerEmail, providerName);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Reminder email sent to ${providerName}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const ActivityIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'payment':
        return <BadgeCent className="h-5 w-5 text-blue-500" />;
      case 'booking':
        return <Book className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Providers"
          value={stats?.providerCount ?? 0}
          icon={Users}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          description={
            stats?.totalTransactions
              ? `from ${stats.totalTransactions} transactions`
              : 'No transactions yet.'
          }
        />
        <StatCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={Book}
        />
        <StatCard
          title="Active Customers"
          value={stats?.uniqueCustomers ?? 0}
          icon={BarChart}
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : dashboardData && (
        <>
          {dashboardData.systemAlerts.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle />
                  System Alerts
                </CardTitle>
                <CardDescription>
                  These items require your immediate attention to ensure platform
                  functionality.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {dashboardData.systemAlerts.map((alert, index) => (
                    <li key={index} className="font-medium">
                      - {alert}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue & Bookings</CardTitle>
                <CardDescription>
                  Track revenue and booking volume over the last 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" stroke="hsl(var(--primary))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                        }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue (₹)" />
                    <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="hsl(var(--chart-2))" name="Bookings" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Type Popularity</CardTitle>
                <CardDescription>
                  Distribution of bookings across different service types.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                         <Pie
                            data={dashboardData.serviceTypeDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            label={(entry) => `${entry.name} (${entry.value})`}
                            >
                            {dashboardData.serviceTypeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                         <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))'
                            }}
                         />
                         <Legend />
                    </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Expiring Trials</CardTitle>
                <CardDescription>
                  Providers whose trial plans are expiring in the next 3 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Expires On</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.expiringTrials.length > 0 ? (
                      dashboardData.expiringTrials.map((p) => (
                        <TableRow key={p.username}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={p.logoUrl} />
                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {p.contact.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.planExpiry && format(p.planExpiry, 'PPP')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(p.contact.email, p.name)}
                              disabled={isPending}
                            >
                              <Send className="mr-2 h-3 w-3" />
                              Send Reminder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No trials are expiring soon.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>A log of recent events on the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.date, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
