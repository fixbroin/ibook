
'use client';

import { useState, useEffect, useTransition } from 'react';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/lib/data';
import type { Plan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, MoreHorizontal, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const emptyPlan: Partial<Omit<Plan, 'id' | 'createdAt'>> = {
  name: '',
  price: 0,
  offerPrice: undefined,
  duration: 'monthly',
  features: [],
  status: 'active',
  days: 7,
  isFeatured: false,
  displayOrder: 0,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Partial<Plan> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const plansData = await getPlans();
      // Sort by displayOrder
      const sortedPlans = plansData.sort((a,b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      setPlans(sortedPlans);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch plans.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (plan: Partial<Plan> | null = null) => {
    setCurrentPlan(plan ? { ...plan } : { ...emptyPlan });
    setIsFormOpen(true);
  };

  const handleOpenDeleteAlert = (plan: Plan) => {
    setCurrentPlan(plan);
    setIsDeleteAlertOpen(true);
  };

  const handleSavePlan = () => {
    if (!currentPlan) return;
    
    // Create a mutable copy for the update/create operation.
    const data: Partial<Omit<Plan, 'id' | 'createdAt'>> = {
      name: currentPlan.name,
      price: Number(currentPlan.price || 0),
      duration: currentPlan.duration,
      features: currentPlan.features,
      status: currentPlan.status,
      isFeatured: currentPlan.isFeatured || false,
      displayOrder: Number(currentPlan.displayOrder || 0),
    };

    // Handle optional offerPrice
    const offerPriceValue = currentPlan.offerPrice;
    if (offerPriceValue !== null && offerPriceValue !== undefined && offerPriceValue !== '' && !isNaN(Number(offerPriceValue))) {
        data.offerPrice = Number(offerPriceValue);
    } else {
        data.offerPrice = null;
    }

    // Handle optional days for trial
    if (currentPlan.duration === 'trial') {
        data.days = Number(currentPlan.days || 7);
    } else {
        data.days = null;
    }


    startTransition(async () => {
      try {
        if (currentPlan.id) {
          // Update existing plan
          await updatePlan(currentPlan.id, data);
          toast({ title: 'Success', description: 'Plan updated successfully.' });
        } else {
          // Create new plan
          await createPlan(data as Omit<Plan, 'id' | 'createdAt'>);
          toast({ title: 'Success', description: 'Plan created successfully.' });
        }
        setIsFormOpen(false);
        setCurrentPlan(null);
        await fetchPlans(); // Re-fetch and sort plans
      } catch (error: any) {
        console.error('Error saving plan:', error);
        toast({ title: 'Error', description: error.message || 'Failed to save plan.', variant: 'destructive' });
      }
    });
  };


  const handleDeletePlan = () => {
    if (!currentPlan?.id) return;
    startTransition(async () => {
      try {
        await deletePlan(currentPlan.id!);
        toast({ title: 'Success', description: 'Plan deleted successfully.' });
        setIsDeleteAlertOpen(false);
        setCurrentPlan(null);
        fetchPlans();
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete plan.', variant: 'destructive' });
      }
    });
  };

  const handleFormChange = (field: keyof Plan, value: any) => {
    if (!currentPlan) return;
    if (field === 'features') {
        setCurrentPlan({ ...currentPlan, [field]: value.split('\n') });
    } else {
        setCurrentPlan({ ...currentPlan, [field]: value });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Subscription Plans</CardTitle>
          <CardDescription>Create, edit, and manage subscription plans for providers.</CardDescription>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length > 0 ? (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.displayOrder}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      {plan.name}
                      {plan.isFeatured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </TableCell>
                    <TableCell>
                      {plan.offerPrice && plan.offerPrice < plan.price ? (
                        <div className="flex items-center gap-2">
                           <span className="line-through text-muted-foreground">₹{plan.price}</span>
                           <span>₹{plan.offerPrice}</span>
                        </div>
                      ) : `₹${plan.price}` }
                    </TableCell>
                    <TableCell className="capitalize">{plan.duration}{plan.duration === 'trial' && ` (${plan.days} days)`}</TableCell>
                    <TableCell>
                      <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => handleOpenForm(plan)}>Edit</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-red-500" onClick={() => handleOpenDeleteAlert(plan)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No plans found. Create one to get started.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Plan Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentPlan?.id ? 'Edit' : 'Create'} Plan</DialogTitle>
            <DialogDescription>
              Fill in the details for the subscription plan.
            </DialogDescription>
          </DialogHeader>
          {currentPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={currentPlan.name} onChange={e => handleFormChange('name', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Original Price (₹)</Label>
                <Input id="price" type="number" value={currentPlan.price} onChange={e => handleFormChange('price', Number(e.target.value))} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="offerPrice" className="text-right">Offer Price (₹)</Label>
                <Input id="offerPrice" type="number" value={currentPlan.offerPrice ?? ''} onChange={e => handleFormChange('offerPrice', e.target.value)} className="col-span-3" placeholder="Optional discounted price" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">Duration</Label>
                <Select value={currentPlan.duration} onValueChange={(value: Plan['duration']) => handleFormChange('duration', value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {currentPlan.duration === 'trial' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="days" className="text-right">Trial Days</Label>
                  <Input id="days" type="number" value={currentPlan.days || 7} onChange={e => handleFormChange('days', Number(e.target.value))} className="col-span-3" />
                </div>
              )}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="features" className="text-right pt-2">Features</Label>
                <Textarea id="features" value={Array.isArray(currentPlan.features) ? currentPlan.features.join('\n') : ''} onChange={e => handleFormChange('features', e.target.value)} className="col-span-3" placeholder="One feature per line" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayOrder" className="text-right">Display Order</Label>
                <Input id="displayOrder" type="number" value={currentPlan.displayOrder ?? 0} onChange={e => handleFormChange('displayOrder', Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch
                        id="status"
                        checked={currentPlan.status === 'active'}
                        onCheckedChange={checked => handleFormChange('status', checked ? 'active' : 'inactive')}
                    />
                    <span className="capitalize text-sm text-muted-foreground">{currentPlan.status}</span>
                </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isFeatured" className="text-right">Highlight Plan</Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch
                        id="isFeatured"
                        checked={currentPlan.isFeatured}
                        onCheckedChange={checked => handleFormChange('isFeatured', checked)}
                    />
                    <span className="text-sm text-muted-foreground">Show as "Best Value"</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the plan "{currentPlan?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}
