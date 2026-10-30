import { SetMetadata } from '@nestjs/common';
import type { UserRole } from 'shared';

export const IS_PUBLIC_KEY = 'isPublic';
/** Endpoint tanpa login staf (landing, menu, order pelanggan, webhook). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Batasi endpoint untuk role tertentu. Dipakai bersama JwtAuthGuard + RolesGuard (S1-01). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
