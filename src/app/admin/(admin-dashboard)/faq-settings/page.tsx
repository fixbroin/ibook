
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSettings } from '@/lib/data';
import { updateFaqSettings } from '@/lib/admin.actions';
import type { FaqItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { v4 as uuidv4 } from 'uuid';

const defaultFaqs: FaqItem[] = [
    { id: uuidv4(), question: 'Is there a free trial?', answer: 'Yes, absolutely! We offer a 3-day free trial with full access to all features. No credit card is required to get started.', displayOrder: 1 },
    { id: uuidv4(), question: 'Can customers cancel or reschedule?', answer: 'Yes. You can configure your settings to allow customers to cancel or reschedule their appointments directly from their confirmation email.', displayOrder: 2 },
    { id: uuidv4(), question: 'How is my data protected?', answer: 'We take data security very seriously. All data is encrypted both in transit and at rest.', displayOrder: 3 },
];


export default function FaqSettingsPage() {
    const [faqs, setFaqs] = useState<FaqItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site?.faq && adminSettings.site.faq.length > 0) {
                setFaqs(adminSettings.site.faq.sort((a, b) => a.displayOrder - b.displayOrder));
            } else {
                setFaqs(defaultFaqs);
            }
            setLoading(false);
        });
    }, []);
    
    const handleFaqChange = (id: string, field: 'question' | 'answer' | 'displayOrder', value: string | number) => {
        setFaqs(currentFaqs => 
            currentFaqs.map(faq => 
                faq.id === id ? { ...faq, [field]: value } : faq
            )
        );
    };

    const handleAddNewFaq = () => {
        const newOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.displayOrder)) + 1 : 1;
        setFaqs(currentFaqs => [
            ...currentFaqs,
            { id: uuidv4(), question: '', answer: '', displayOrder: newOrder }
        ]);
    };

    const handleDeleteFaq = (id: string) => {
        setFaqs(currentFaqs => currentFaqs.filter(faq => faq.id !== id));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // Basic validation
        if (faqs.some(f => !f.question.trim() || !f.answer.trim())) {
            toast({
                title: "Validation Error",
                description: "Question and Answer fields cannot be empty.",
                variant: 'destructive'
            });
            return;
        }

        startTransition(async () => {
            const result = await updateFaqSettings(faqs);
            if (result.success) {
                toast({ title: "Success", description: "FAQ settings have been saved." });
            } else {
                toast({ title: "Error", description: result.error, variant: 'destructive' });
            }
        });
    };
    
    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-64 w-full" />
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        )
    }

  return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">FAQ Section Settings</h1>
                    <p className="text-muted-foreground">Manage the questions and answers on your homepage.</p>
                </div>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage FAQs</CardTitle>
                    <CardDescription>Add, edit, or delete FAQs. Changes will be reflected on the homepage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {faqs.map((faq, index) => (
                        <div key={faq.id} className="p-4 border rounded-lg space-y-4 relative">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">FAQ {index + 1}</h3>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleDeleteFaq(faq.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-12 gap-4">
                               <div className="space-y-2 col-span-10">
                                    <Label htmlFor={`question-${faq.id}`}>Question</Label>
                                    <Input 
                                        id={`question-${faq.id}`} 
                                        value={faq.question}
                                        onChange={(e) => handleFaqChange(faq.id, 'question', e.target.value)}
                                        placeholder="e.g., Is there a free trial?"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor={`order-${faq.id}`}>Order</Label>
                                    <Input
                                        id={`order-${faq.id}`}
                                        type="number"
                                        value={faq.displayOrder}
                                        onChange={(e) => handleFaqChange(faq.id, 'displayOrder', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                           
                            <div className="space-y-2">
                                <Label htmlFor={`answer-${faq.id}`}>Answer</Label>
                                <Textarea 
                                    id={`answer-${faq.id}`} 
                                    value={faq.answer}
                                    onChange={(e) => handleFaqChange(faq.id, 'answer', e.target.value)}
                                    placeholder="e.g., Yes, you can start a 14-day free trial..."
                                />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={handleAddNewFaq}>
                        <PlusCircle className="mr-2" /> Add New FAQ
                    </Button>
                </CardContent>
            </Card>
        </div>
    </form>
  );
}

