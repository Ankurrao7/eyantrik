// Readable, never-repeating ids (U-1001, S-1001 …) for data stored in MongoDB.
// One counter document per prefix in the `counters` collection; `$inc` is atomic, so two requests
// at the same moment never get the same number — and the count survives server restarts.
import { mongo } from './mongo.ts';

const counters = mongo.collection<{ _id: string; value: number }>('counters');

export async function nextMongoId(prefix: string): Promise<string> {
	const c = await counters.findOneAndUpdate({ _id: prefix }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' });
	return `${prefix}-${c!.value}`;
}
