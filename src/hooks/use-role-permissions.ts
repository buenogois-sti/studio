'use client';

import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { RolePermissions, PermissionKey, UserRole } from '@/lib/types';
import { useSession } from 'next-auth/react';
import type { UserProfile } from '@/lib/types';

export function useRolePermissions() {
    const { firestore } = useFirebase();
    const { data: session } = useSession();

    const userProfileRef = useMemoFirebase(
        () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
        [firestore, session?.user?.id]
    );
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const permissionsRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'system_settings', 'role_permissions') : null),
        [firestore]
    );
    const { data: allPermissions, isLoading } = useDoc<RolePermissions>(permissionsRef);

    const hasPermission = (permission: PermissionKey): boolean => {
        if (!userProfile || !allPermissions) return false;
        if (userProfile.role === 'admin') return true; // Admin always has access
        
        return allPermissions[userProfile.role]?.[permission] ?? false;
    };

    return {
        hasPermission,
        role: userProfile?.role,
        isLoading: isLoading || !userProfile,
        allPermissions
    };
}
