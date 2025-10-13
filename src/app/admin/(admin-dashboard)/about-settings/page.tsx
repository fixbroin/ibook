
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSettings } from '@/lib/data';
import { updateAboutSettings } from '@/lib/admin.actions';
import type { AboutSettings, TeamMember } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Upload, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

const defaultSettings: AboutSettings = {
    title: 'About BroBookMe',
    subtitle: 'The story behind our mission to simplify scheduling for everyone.',
    mission: 'In a world where time is the most valuable commodity, we believe that managing it shouldn\'t be a chore. BroBookMe was born from a simple idea: to create a booking platform that is powerful for professionals, yet incredibly simple for their clients.',
    teamTitle: 'Meet Our Team',
    teamSubtitle: 'The passionate individuals dedicated to improving your scheduling experience.',
    teamMembers: [
        { id: uuidv4(), name: 'Srikanth Achari', role: 'Founder & CEO', imageUrl: 'https://picsum.photos/seed/10/200/200' },
        { id: uuidv4(), name: 'Jane Smith', role: 'Lead Developer', imageUrl: 'https://picsum.photos/seed/20/200/200' },
    ]
};


export default function AboutSettingsPage() {
    const [settings, setSettings] = useState<AboutSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});


    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site?.about) {
                setSettings(adminSettings.site.about);
            }
            setLoading(false);
        });
    }, []);
    
    const handleFieldChange = (field: keyof AboutSettings, value: string) => {
        setSettings(current => ({ ...current, [field]: value }));
    };

    const handleTeamMemberChange = (id: string, field: 'name' | 'role', value: string) => {
        setSettings(current => ({
            ...current,
            teamMembers: current.teamMembers.map(member => 
                member.id === id ? { ...member, [field]: value } : member
            )
        }));
    };
    
    const handleImageChange = (id: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setSettings(current => ({
                ...current,
                teamMembers: current.teamMembers.map(member =>
                    member.id === id ? { ...member, imageUrl: e.target?.result as string } : member
                )
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleAddTeamMember = () => {
        setSettings(current => ({
            ...current,
            teamMembers: [
                ...current.teamMembers,
                { id: uuidv4(), name: '', role: '', imageUrl: 'https://picsum.photos/seed/new/200/200' }
            ]
        }));
    };

    const handleDeleteTeamMember = (id: string) => {
        setSettings(current => ({
            ...current,
            teamMembers: current.teamMembers.filter(member => member.id !== id)
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(async () => {
            const result = await updateAboutSettings(settings);
            if (result.success) {
                toast({ title: "Success", description: "About page settings have been saved." });
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
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

  return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">About Page Settings</h1>
                    <p className="text-muted-foreground">Manage the content for your "About Us" page.</p>
                </div>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Page Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="aboutTitle">Main Title</Label>
                        <Input id="aboutTitle" value={settings.title} onChange={e => handleFieldChange('title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aboutSubtitle">Subtitle</Label>
                        <Input id="aboutSubtitle" value={settings.subtitle} onChange={e => handleFieldChange('subtitle', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="aboutMission">Mission Statement</Label>
                        <Textarea id="aboutMission" value={settings.mission} onChange={e => handleFieldChange('mission', e.target.value)} rows={5} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Team Section</CardTitle>
                        <CardDescription>Manage the team members displayed on the about page.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTeamMember}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Member
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="teamTitle">Section Title</Label>
                            <Input id="teamTitle" value={settings.teamTitle} onChange={e => handleFieldChange('teamTitle', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="teamSubtitle">Section Subtitle</Label>
                            <Input id="teamSubtitle" value={settings.teamSubtitle} onChange={e => handleFieldChange('teamSubtitle', e.target.value)} />
                        </div>
                    </div>
                    {settings.teamMembers.map((member, index) => (
                        <div key={member.id} className="p-4 border rounded-lg space-y-4 relative">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">Team Member {index + 1}</h3>
                                <Button type="button" variant="destructive" size="icon" onClick={() => handleDeleteTeamMember(member.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                     <Image src={member.imageUrl} alt={member.name} width={128} height={128} className="rounded-full h-32 w-32 object-cover border" />
                                     <input
                                        type="file"
                                        ref={el => (fileInputRefs.current[member.id] = el)}
                                        className="hidden"
                                        onChange={(e) => e.target.files && handleImageChange(member.id, e.target.files[0])}
                                        accept="image/*"
                                     />
                                     <Button type="button" variant="outline" size="sm" onClick={() => fileInputRefs.current[member.id]?.click()}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                </div>
                                <div className="flex-grow space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`name-${member.id}`}>Name</Label>
                                        <Input id={`name-${member.id}`} value={member.name} onChange={(e) => handleTeamMemberChange(member.id, 'name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`role-${member.id}`}>Role</Label>
                                        <Input id={`role-${member.id}`} value={member.role} onChange={(e) => handleTeamMemberChange(member.id, 'role', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

        </div>
    </form>
  );
}
