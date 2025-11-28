import React from 'react';
import { cn } from '../lib/utils';

interface Entities {
    people: string[];
    places: string[];
    organizations: string[];
}

interface EntityDisplayProps {
    entities: Entities;
    loading: boolean;
}

export function EntityDisplay({ entities, loading }: EntityDisplayProps) {
    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
        );
    }

    const hasEntities =
        entities.people.length > 0 ||
        entities.places.length > 0 ||
        entities.organizations.length > 0;

    if (!hasEntities) {
        return <div className="text-sm text-muted-foreground">No entities extracted yet.</div>;
    }

    return (
        <div className="space-y-4">
            {entities.people.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-primary">People</h3>
                    <div className="flex flex-wrap gap-2">
                        {entities.people.map((person, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-100">
                                {person}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {entities.places.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-primary">Places</h3>
                    <div className="flex flex-wrap gap-2">
                        {entities.places.map((place, i) => (
                            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900 dark:text-green-100">
                                {place}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {entities.organizations.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-primary">Organizations</h3>
                    <div className="flex flex-wrap gap-2">
                        {entities.organizations.map((org, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full dark:bg-purple-900 dark:text-purple-100">
                                {org}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
