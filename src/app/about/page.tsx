
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminSettings } from '@/lib/data';
import type { Metadata } from 'next';
import { v4 as uuidv4 } from 'uuid';
import type { AboutSettings } from '@/lib/types';


export const metadata: Metadata = {
  title: 'About Us',
  alternates: {
    canonical: '/about',
  },
};

const defaultSettings: AboutSettings = {
    title: 'About BroBookMe',
    subtitle: 'The story behind our mission to simplify scheduling for everyone.',
    mission: 'In a world where time is the most valuable commodity, we believe that managing it shouldn\'t be a chore. BroBookMe was born from a simple idea: to create a booking platform that is powerful for professionals, yet incredibly simple for their clients.\n\nWe\'re dedicated to eliminating the endless back-and-forth of scheduling, reducing no-shows, and providing a beautiful, professional interface that any service provider can be proud of. Our goal is to empower entrepreneurs, freelancers, and businesses to focus on what they do best, leaving the scheduling logistics to us.',
    teamTitle: 'Meet Our Team',
    teamSubtitle: 'The passionate individuals dedicated to improving your scheduling experience.',
    teamMembers: [
        { id: uuidv4(), name: 'Srikanth Achari', role: 'Founder & CEO', imageUrl: 'https://picsum.photos/seed/10/200/200' },
        { id: uuidv4(), name: 'Jane Smith', role: 'Lead Developer', imageUrl: 'https://picsum.photos/seed/20/200/200' },
        { id: uuidv4(), name: 'Mike Johnson', role: 'UX Designer', imageUrl: 'https://picsum.photos/seed/30/200/200' },
        { id: uuidv4(), name: 'Sarah Brown', role: 'Marketing Head', imageUrl: 'https://picsum.photos/seed/40/200/200' },
    ]
};


export default async function AboutPage() {
    const adminSettings = await getAdminSettings();
    const settings = adminSettings?.site?.about || defaultSettings;

    return (
        <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{settings.title}</h1>
                <p className="mt-4 text-lg text-muted-foreground">{settings.subtitle}</p>
            </div>

            <Card className="mb-12">
                <CardHeader>
                    <CardTitle className="text-2xl">Our Mission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    {settings.mission.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </CardContent>
            </Card>
            
            {settings.teamMembers && settings.teamMembers.length > 0 && (
                <>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold">{settings.teamTitle}</h2>
                        <p className="mt-2 text-muted-foreground">{settings.teamSubtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {settings.teamMembers.map(member => (
                            <div key={member.id} className="flex flex-col items-center text-center">
                                <Avatar className="h-32 w-32 mb-4">
                                    <AvatarImage src={member.imageUrl} data-ai-hint="person portrait" />
                                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <h3 className="text-xl font-semibold">{member.name}</h3>
                                <p className="text-primary">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
