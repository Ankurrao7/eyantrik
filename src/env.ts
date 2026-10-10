// Environment variables the app needs (values come from .env — see .env.example).
// Server-only: import them from '$app/env/private'.
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	MONGODB_URI: {
		description: 'MongoDB connection string, e.g. mongodb://127.0.0.1:27017',
		schema: (value) => {
			const uri = value || 'mongodb://127.0.0.1:27017';
			if (!/^mongodb(\+srv)?:\/\//.test(uri)) throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
			return uri;
		}
	},
	MONGODB_DB: {
		description: 'Database name',
		schema: (value) => value || 'eyantrik'
	}
});
