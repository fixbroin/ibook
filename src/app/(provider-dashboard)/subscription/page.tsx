

'use client';

import { useState, useEffect, useTransition, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPlans, getProviderByUsername, getPlan, getAdminSettings } from '@/lib/data';
import { updateProviderSubscription, createRazorpayOrder, verifySubscriptionPaymentSignature } from '@/lib/actions';
import type { Plan, Provider, RazorpaySettings, EnrichedProvider } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function SubscriptionComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<EnrichedProvider | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, startPaymentTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const fetchInitialData = useCallback(async (username: string) => {
    try {
      const [providerData, plansData, adminSettings] = await Promise.all([
        getProviderByUsername(username),
        getPlans(),
        getAdminSettings(),
      ]);

      if (providerData) {
         let enrichedProvider: EnrichedProvider = providerData;
         if(providerData.planId) {
            const plan = await getPlan(providerData.planId);
            enrichedProvider = {...providerData, plan};
        }
        setProvider(enrichedProvider);
      } else {
         router.push('/login');
         return;
      }

      if (adminSettings?.razorpay) {
          setRazorpaySettings(adminSettings.razorpay);
      }

      const sortedPlans = plansData
        .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      
      setPlans(sortedPlans);

    } catch (error) {
      console.error("Failed to fetch subscription data:", error);
      toast({ title: 'Error', description: 'Failed to load subscription details.', variant: 'destructive'});
    } finally {
      setLoading(false);
    }
  }, [router, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        const username = currentUser.email.split('@')[0];
        fetchInitialData(username);
      } else {
        router.push('/login');
      }
    });

     return () => unsubscribe();
  }, [router, fetchInitialData]);

  // Effect for handling payment redirect verification
  useEffect(() => {
    const razorpay_payment_id = searchParams.get('razorpay_payment_id');
    const razorpay_order_id = searchParams.get('razorpay_order_id');
    const razorpay_signature = searchParams.get('razorpay_signature');


    if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      
      const verifySignature = async () => {
        setIsVerifying(true);
        try {
            const result = await verifySubscriptionPaymentSignature({ razorpay_payment_id, razorpay_order_id, razorpay_signature });
            
            if (result.success) {
                toast({ title: 'Payment Successful', description: 'Your subscription is being activated...' });
                // We trust the webhook will update the provider. To update the UI immediately,
                // we'll force a hard refresh by navigating.
                window.location.href = '/dashboard';
            } else {
                toast({ title: 'Payment Verification Failed', description: result.error || 'Your payment could not be verified. Please contact support.', variant: 'destructive'});
                 router.replace('/subscription', { scroll: false });
            }
        } catch (error: any) {
            toast({ title: 'Verification Error', description: error.message || 'An unexpected error occurred during verification.', variant: 'destructive'});
            router.replace('/subscription', { scroll: false });
        }
      }
      
      verifySignature();
    }
  }, [searchParams, user, toast, router, fetchInitialData]);
  
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      }
      document.body.appendChild(script);
    });
  }

  const handleChoosePlan = async (plan: Plan) => {
    if (!provider || !user || !user.email) return;

    setProcessingPlanId(plan.id);
    const username = user.email.split('@')[0];
    const amountToPay = (plan.offerPrice != null && plan.offerPrice < plan.price) ? plan.offerPrice : plan.price;
    
    startPaymentTransition(async () => {
      // For free plans, update subscription directly without payment flow
      if (plan.price === 0) {
          setIsVerifying(true);
          const result = await updateProviderSubscription(username, plan.id, {
            razorpay_payment_id: `free_${plan.id}_${Date.now()}`,
            razorpay_order_id: 'N/A',
            amount: 0,
          });
          if (result.success && result.provider) {
            toast({ title: 'Subscription Activated', description: 'Your plan has been updated successfully.'});
            // Force a hard refresh of the app state by navigating
            window.location.href = '/dashboard';
          } else {
             toast({ title: 'Update Failed', description: result.error, variant: 'destructive'});
             setIsVerifying(false);
             setProcessingPlanId(null);
          }
        return;
      }
      
      // For paid plans, proceed with Razorpay
      if (!razorpaySettings?.keyId) {
          toast({ title: 'Configuration Error', description: 'Payment gateway is not configured. Please contact support.', variant: 'destructive'});
          setProcessingPlanId(null);
          return;
      }

      const hasLoaded = await loadRazorpay();
      if (!hasLoaded) {
        toast({ title: 'Error', description: 'Failed to load payment gateway. Please check your connection.', variant: 'destructive'});
        setProcessingPlanId(null);
        return;
      }
      
      const order = await createRazorpayOrder(amountToPay, 'INR', plan.id);
      if (!order) {
        toast({ title: 'Error', description: 'Could not create a payment order. Please try again.', variant: 'destructive'});
        setProcessingPlanId(null);
        return;
      }

      const options = {
        key: razorpaySettings.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BroBookMe Subscription",
        description: `Payment for ${plan.name}`,
        image: "/icon.png", 
        order_id: order.id,
        // The callback_url will handle the verification. The handler is a fallback.
        callback_url: `${window.location.origin}/subscription`,
        handler: function (response: any){
           router.push(`/subscription?razorpay_payment_id=${response.razorpay_payment_id}&razorpay_order_id=${response.razorpay_order_id}&razorpay_signature=${response.razorpay_signature}`);
        },
        prefill: {
            name: provider.name,
            email: provider.contact.email,
            contact: provider.contact.phone
        },
        notes: {
            planId: plan.id,
            providerUsername: username
        },
        theme: {
            color: "#B0C4DE" 
        },
        modal: {
            ondismiss: function() {
                setProcessingPlanId(null);
            }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
              toast({ title: 'Payment Failed', description: response.error.description, variant: 'destructive'});
              setProcessingPlanId(null);
      });
      rzp.open();
    });
  };

   if (loading || !provider) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-7 w-2/5" />
                <Skeleton className="h-10 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const isLifetime = provider.plan?.duration === 'lifetime';
  const hasActivePlan = isLifetime || (provider.planId && provider.planExpiry && provider.planExpiry > new Date());
  const isPlanExpired = provider.planId && provider.planExpiry && provider.planExpiry < new Date();
  
  const getDurationText = (plan: Plan) => {
    if (plan.duration === 'monthly') return '/month';
    if (plan.duration === 'yearly') return '/year';
    if (plan.duration === 'trial' && plan.days) return `for ${plan.days} days`;
    return '';
  }

  const daysRemaining = provider.planExpiry ? differenceInDays(provider.planExpiry, new Date()) : null;

  // Filter plans based on logic
  let displayPlans = plans;
  // If lifetime, only show lifetime plan (which will appear as "Current Plan")
  if (isLifetime) {
      displayPlans = plans.filter(p => p.id === provider.planId);
  }
  // If trial has been used, filter it out
  else if (provider.hasUsedTrial) {
    displayPlans = plans.filter(p => p.duration !== 'trial');
  }


  return (
    <>
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium text-lg">Verifying payment & activating plan...</p>
            <p className="text-muted-foreground text-sm">Please do not close or refresh this page.</p>
        </div>
       )}
      <div className="space-y-8">
       {!hasActivePlan && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isPlanExpired ? "Subscription Expired" : "Action Required"}</AlertTitle>
          <AlertDescription>
            Your access is limited. Please {isPlanExpired ? 'renew or upgrade' : 'subscribe to'} a plan to unlock all features.
            {isPlanExpired && ` Your previous plan expired on ${format(provider.planExpiry!, 'PPP')}.`}
          </AlertDescription>
        </Alert>
      )}

      {!razorpaySettings?.keyId && (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Gateway Not Configured</AlertTitle>
            <AlertDescription>
                The payment system is not yet active. You will not be able to subscribe to a paid plan at this time.
            </AlertDescription>
        </Alert>
      )}

      {provider.plan && hasActivePlan && (
        <Card>
            <CardHeader>
                <CardTitle>Your Current Plan</CardTitle>
                <CardDescription>You are currently on the <span className="font-bold text-primary">{provider.plan.name}</span> plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {provider.plan.duration !== 'lifetime' ? (
                    <>
                        <p>Your plan is valid until: <span className="font-semibold">{provider.planExpiry ? format(provider.planExpiry, 'PPP') : 'N/A'}</span></p>
                        {daysRemaining !== null && daysRemaining >= 0 && (
                        <p className="text-sm text-muted-foreground">
                            You have <span className="font-bold text-primary">{daysRemaining}</span> {daysRemaining === 1 ? 'day' : 'days'} remaining.
                        </p>
                        )}
                    </>
                ) : (
                   <p>You have <span className="font-semibold">Lifetime Access</span>.</p>
                )}
            </CardContent>
        </Card>
      )}

      <div>
          <h2 className="text-3xl font-bold text-center mb-2">{isLifetime ? "Your Plan" : "Choose Your Plan"}</h2>
          <p className="text-muted-foreground text-center mb-8">
              {!isLifetime && (hasActivePlan ? 'You can renew or upgrade your plan at any time.' : 'Select the plan that best fits your business needs.')}
          </p>
          
          <div className="relative">
            <div className={`mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3 ${isVerifying ? 'blur-sm pointer-events-none' : ''}`}>
                {displayPlans.map(plan => {
                  const isCurrentPlan = plan.id === provider.planId && hasActivePlan;
                  const isProcessingThisPlan = isPaying && processingPlanId === plan.id;
                  
                  let buttonText = 'Choose Plan';
                  const isRenewal = isPlanExpired && plan.id === provider.planId;
                  const isUpgrade = hasActivePlan && !isCurrentPlan && (plan.price > (provider.plan?.price || 0));

                  if (isRenewal) buttonText = 'Renew Plan';
                  if (isUpgrade) buttonText = 'Upgrade Plan';

                  return (
                  <Card key={plan.id} className={`flex flex-col relative ${plan.isFeatured ? 'border-2 border-primary shadow-2xl' : ''}`}>
                      {isCurrentPlan && (
                          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
                      )}
                      {plan.isFeatured && !isCurrentPlan && (
                          <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 border border-primary text-primary">Best Value</Badge>
                      )}
                      <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                       <div className="text-4xl font-bold">
                          {plan.offerPrice != null && plan.offerPrice < plan.price ? (
                            <div className="flex items-baseline gap-2">
                              <span>₹{plan.offerPrice}</span>
                              <span className="text-xl font-medium text-muted-foreground line-through">₹{plan.price}</span>
                            </div>
                          ) : (
                             <span>{plan.price > 0 ? `₹${plan.price}`: 'Free'}</span>
                          )}
                          {plan.duration !== 'lifetime' && <span className="text-base font-normal text-muted-foreground">{getDurationText(plan)}</span>}
                      </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-2">
                      {plan.features.map(feature => (
                          <div key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">{feature}</span>
                          </div>
                      ))}
                      </CardContent>
                      <CardFooter>
                      {isCurrentPlan ? (
                          <Button className="w-full" disabled variant="outline">Current Plan</Button>
                      ) : (
                          <Button 
                          className="w-full" 
                          onClick={() => handleChoosePlan(plan)} 
                          disabled={isPaying || (!razorpaySettings?.keyId && plan.price > 0)}
                          variant={plan.isFeatured ? 'default' : 'outline'}
                          >
                              {isProcessingThisPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {buttonText}
                          </Button>
                      )}
                      </CardFooter>
                  </Card>
                  )})}
              </div>
          </div>
      </div>
    </div>
    </>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SubscriptionComponent />
    </Suspense>
  )
}
