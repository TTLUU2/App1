// POST /api/link-email — mint (or return) the forwarding slug for
// this device. Idempotent: repeated calls for the same deviceId return
// the existing slug rather than allocating a new one, so the Balances
// page can call this on every load without churning slugs.
//
// Slug shape: three lowercase words + 4 random digits (e.g.
// `aurora-fox-7301`). Human-recognisable when pasted into a mail
// provider's filter UI; low enough entropy to enumerate on paper, but
// the address only receives mail — knowing a slug doesn't let anyone
// read it. If enumeration ever becomes a concern we can widen to 6
// digits with zero code change.
//
// The `slug` returned here is the local part; the client composes
// `${slug}@pointhacks.app` for display and copy-to-clipboard.

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { linkedEmailForwards } from '@/db/schema';

export const runtime = 'nodejs';

const BodySchema = z.object({
  deviceId: z.string().min(1).max(128),
});

// Curated word lists — colours + fauna. Enough combinations
// (24 * 24 = 576) that with the 4-digit tail we get 5.76M unique slugs
// before we have to rethink. Word choice avoids anything that would
// read oddly in a URL or over the phone.
const COLOURS = [
  'amber',
  'aqua',
  'aurora',
  'azure',
  'coral',
  'crimson',
  'ember',
  'fern',
  'ginger',
  'indigo',
  'ivory',
  'jade',
  'lilac',
  'mint',
  'ochre',
  'olive',
  'onyx',
  'opal',
  'rose',
  'ruby',
  'saffron',
  'scarlet',
  'slate',
  'violet',
];
const CREATURES = [
  'bison',
  'cobra',
  'crane',
  'falcon',
  'fox',
  'gecko',
  'heron',
  'ibis',
  'jaguar',
  'koala',
  'lynx',
  'marlin',
  'newt',
  'orca',
  'panda',
  'quokka',
  'raven',
  'sable',
  'tiger',
  'urchin',
  'vole',
  'wren',
  'yak',
  'zebra',
];

function pick<T>(arr: T[]): T {
  const v = arr[Math.floor(Math.random() * arr.length)];
  if (v === undefined) throw new Error('empty pick array');
  return v;
}

function generateSlug(): string {
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${pick(COLOURS)}-${pick(CREATURES)}-${digits}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { deviceId } = parsed.data;
  const db = getDb();

  // Existing, un-revoked slug for this device wins.
  const existing = await db
    .select({ slug: linkedEmailForwards.slug })
    .from(linkedEmailForwards)
    .where(and(eq(linkedEmailForwards.deviceId, deviceId), isNull(linkedEmailForwards.revokedAt)))
    .limit(1);
  if (existing[0]) {
    return NextResponse.json({ slug: existing[0].slug });
  }

  // Allocate a new one. Retry loop on the (extremely unlikely) unique-
  // constraint collision — 5 attempts is more than enough given 5.76M
  // slug space and current user count in the single-digit thousands.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    try {
      await db.insert(linkedEmailForwards).values({ deviceId, slug });
      return NextResponse.json({ slug });
    } catch (err) {
      // pg unique-violation is code 23505; drizzle surfaces the raw
      // Neon error, which contains that code in its message. Cheap
      // string check is fine here — we're not branching on it, just
      // deciding whether to retry.
      if (!String(err).includes('23505')) {
        return NextResponse.json({ error: 'db insert failed' }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: 'slug allocation retries exhausted' }, { status: 500 });
}
