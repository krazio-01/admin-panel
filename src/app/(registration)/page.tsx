import './page.scss';
import { CountUp, Reveal, Stagger } from '@/components/ui/animations/animations';
import { Badge } from '@/components/ui/badge/badge';
import { Button } from '@/components/ui/button/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card/card';
import { Input } from '@/components/ui/input/input';
import { Hotkey } from '@/components/ui/hotkey/hotkey';
import { Label } from '@/components/ui/label/label';
import { Progress } from '@/components/ui/progress/progress';
import { Separator } from '@/components/ui/separator/separator';
import { Skeleton } from '@/components/ui/skeleton/skeleton';
import { LazyAuditorium, LazyFlypast } from '@/components/scenes/lazy-scenes';
import { getEventSettings } from '@/services/server/settings';
import { seatStatesFromNextIndex } from '@/components/scenes/seat-layout';

export const dynamic = 'force-dynamic';

export default async function Page() {
    const settings = await getEventSettings();

    const bookedSeats = seatStatesFromNextIndex(
        settings.nextSeatIndex,
        settings.totalSeats,
        settings.seatsPerRow,
    );

    return (
        <>
            <LazyFlypast />
            <main className="design-preview">
                <Reveal>
                    <h1 className="design-preview__title">Campus Event</h1>
                </Reveal>
                <div className="design-preview__auditorium" data-scene="auditorium">
                    <LazyAuditorium
                        rows={settings.rows}
                        seatsPerRow={settings.seatsPerRow}
                        seats={bookedSeats}
                        eventName={settings.eventName}
                    />
                </div>
                <Stagger className="design-preview__stack">
                    <Card raised>
                        <CardHeader>
                            <CardTitle>Reserve your seats</CardTitle>
                            <CardDescription>Design system preview.</CardDescription>
                        </CardHeader>
                        <CardContent className="design-preview__form">
                            <Label htmlFor="preview-name">Student name</Label>
                            <Input id="preview-name" placeholder="Search by name" />
                            <Button>Continue</Button>
                            <Button variant="outline" loading>
                                Saving
                            </Button>
                        </CardContent>
                    </Card>
                    <div className="design-preview__row">
                        <Badge variant="success">Sent</Badge>
                        <Badge variant="pending">Pending</Badge>
                        <Badge variant="failed">Failed</Badge>
                        <Badge variant="solid">Admin</Badge>
                        <Badge variant="outline">Guest</Badge>
                        <Hotkey>⌘K</Hotkey>
                    </div>
                    <Separator />
                    <div className="design-preview__row">
                        <CountUp value={412} />
                        <Progress value={64} aria-label="Seats booked" />
                    </div>
                    <Skeleton height={16} />
                </Stagger>
            </main>
        </>
    );
}
