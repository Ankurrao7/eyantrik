import { notificationsActions, notificationsLoad } from '#lib/server/notificationsPage.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => notificationsLoad('BUYER', locals, url);
export const actions: Actions = notificationsActions('BUYER');
