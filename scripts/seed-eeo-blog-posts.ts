#!/usr/bin/env npx tsx
// Seed 11 EEO editorial blog posts for the `default` tenant.
//
// Pipeline per post:
//   1. Generate a featured image via OpenAI image model.
//   2. Upload the image buffer to Cloudinary (folder: blog/eeo).
//   3. Upsert the Blog doc by (tenantId, slug) so reruns are idempotent.
//
// Run: `npx tsx scripts/seed-eeo-blog-posts.ts`
// Required env: MONGODB_URI, OPENAI_API_KEY, CLOUDINARY_CLOUD_NAME,
//   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TENANT_ID = 'default';
const AUTHOR = 'EEO';
const AUTHOR_BIO =
  'The Egypt Excursions Online editorial team is a group of local guides, travel planners, and destination experts based in Hurghada, Cairo, and Luxor.';
const AUTHOR_AVATAR =
  'https://res.cloudinary.com/ddfxn8opk/image/upload/f_auto,q_auto/v1/blog/eeo-team-avatar';

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const CLOUDINARY_FOLDER = 'blog/eeo';

// ---------------------------------------------------------------------------
// Blog model (inline to avoid the Next.js path-alias toolchain in a tsx script)
// ---------------------------------------------------------------------------

const BlogSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    featuredImage: { type: String, required: true },
    images: [String],
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    author: { type: String, required: true },
    authorAvatar: String,
    authorBio: String,
    metaTitle: String,
    metaDescription: String,
    readTime: { type: Number, default: 5 },
    status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft' },
    publishedAt: Date,
    featured: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true },
);
BlogSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

const Blog =
  mongoose.models.Blog || mongoose.model('Blog', BlogSchema);

// ---------------------------------------------------------------------------
// Post definitions — title, slug, category, tags, imagePrompt, excerpt, body
// ---------------------------------------------------------------------------

type PostSeed = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  imagePrompt: string;
  excerpt: string;
  body: string; // Rendered as HTML in the blog route; plain paragraphs here.
  featured?: boolean;
  views?: number;
  likes?: number;
};

const POSTS: PostSeed[] = [
  {
    title: 'Top 10 Day Trips from Hurghada: The 2026 Local Guide',
    slug: 'top-10-day-trips-from-hurghada',
    category: 'destination-guides',
    tags: ['hurghada', 'day-trips', 'red-sea'],
    imagePrompt:
      'Cinematic wide photograph of turquoise Red Sea water with a traditional Egyptian dahabiya sailboat, desert mountains in the background, golden hour light, photorealistic travel photography.',
    excerpt:
      'From Giftun Island snorkeling to a one-day dash to the Pyramids, here are the day trips we actually recommend to guests who only have a week in Hurghada.',
    body: `<p>Hurghada is one of the easiest bases in Egypt for day trips: most excursions leave between 4am and 8am and have you back at your hotel by dinner. After running thousands of these tours ourselves, here is the short list we actually recommend.</p><h2>1. Giftun Island snorkeling</h2><p>Giftun is the classic starter trip: two hours on a speedboat, two snorkel stops, lunch on board, and a long afternoon on the beach. Book the smaller speedboat option rather than the large cruiser — it's half the crowd and twice the snorkeling time.</p><h2>2. Orange Bay by speedboat</h2><p>If you've already done Giftun, Orange Bay is the natural next step. Whiter sand, shallower water, better for families with small kids.</p><h2>3. Desert Super Safari</h2><p>Quad bike, Bedouin village, camel ride, dinner and a show. It's touristy by design, but the sunset ride across the desert is genuinely worth it.</p><h2>4. Cairo & Pyramids by flight</h2><p>You can do Cairo in a single day if you fly both ways. Leave at 4am, back by 10pm. You'll see Giza, the Egyptian Museum, and Khan el-Khalili bazaar.</p><h2>5. Luxor by road</h2><p>Four to five hours each way, but a proper full-day of history: Karnak, Valley of the Kings, Hatshepsut. Skip this if you get motion sick — take the flight option instead.</p><h2>6. Dolphin House snorkeling</h2><p>Sataya reef is the dolphin spot. Half the time you'll see a pod, half the time you won't. Bring a GoPro.</p><h2>7. Cairo by flight, overnight</h2><p>If you can stretch to two days, overnighting in Cairo is far less exhausting than the single-day version.</p><h2>8. Submarine ride</h2><p>A real submarine, 22 meters down. Great for kids, non-swimmers, and anyone who wants the reef without getting wet.</p><h2>9. Jeep safari + stargazing</h2><p>Evening variant of the desert safari. Dinner, shisha, and a proper dark-sky view of the desert stars.</p><h2>10. Luxor by flight</h2><p>If time matters more than money, the one-hour flight beats the five-hour drive. You land, visit the sites with a guide, and fly home the same day.</p><p>Prices change month to month — the best way to see what's live right now is our <a href="/">main listings</a>.</p>`,
    featured: true,
    views: 1240,
    likes: 87,
  },
  {
    title: "A First-Timer's Guide to the Pyramids of Giza",
    slug: 'first-timers-guide-pyramids-of-giza',
    category: 'destination-guides',
    tags: ['cairo', 'pyramids', 'giza'],
    imagePrompt:
      'Photograph of the Great Pyramid of Giza at early morning with clear blue sky and a small group of tourists walking toward the base, realistic lighting, travel magazine style.',
    excerpt:
      "Everything we wish every visitor knew before stepping onto the Giza Plateau — tickets, timing, what's inside the pyramids, and the mistake most first-timers make.",
    body: `<p>Most people arrive at Giza with two questions: "Can I go inside?" and "Where's the best photo spot?" Here's the honest answer to both, plus the stuff the guidebooks skip.</p><h2>When to go</h2><p>Gates open at 7am. Be at the entrance by 7 and you'll have about 90 minutes of near-empty plateau before the big bus groups arrive around 9. If you can only go in the afternoon, aim for 3pm — the heat drops and the 4pm golden hour over the pyramids is genuinely magical.</p><h2>Tickets you actually need</h2><p>The base ticket gets you onto the plateau. Entry into the Great Pyramid is a separate, more expensive ticket — and honestly, unless you're claustrophobic-tolerant and love history, the inside is less impressive than the outside. The Khafre (middle) pyramid has more to see inside and costs less.</p><h2>The panoramic viewpoint</h2><p>Drive or ride a camel ~1km into the desert from the Sphinx side — you'll get all three pyramids in one frame. This is the photo you actually want. Don't bother with the viewpoint right next to the Great Pyramid.</p><h2>Avoiding the hassle</h2><p>Camel and horse sellers will approach you constantly. If you want a ride, agree on a price and a duration <em>before</em> you get on. If you don't want one, a firm "la shukran" (no thanks) and walking purposefully works. Don't hand over your camera to anyone who isn't your guide.</p><h2>Pair it with the Egyptian Museum</h2><p>Half a day at the Pyramids + half a day at the Grand Egyptian Museum is the ideal Cairo itinerary. The GEM now has the full Tutankhamun collection under one roof.</p><h2>Our take</h2><p>The Pyramids aren't a half-hour stop. Give them a full morning, bring water, wear closed shoes, and don't try to squeeze in too much on the same day.</p>`,
    featured: true,
    views: 2103,
    likes: 156,
  },
  {
    title: "When is the Best Time to Visit Luxor's Valley of the Kings?",
    slug: 'best-time-valley-of-the-kings-luxor',
    category: 'seasonal-travel',
    tags: ['luxor', 'valley-of-the-kings', 'weather'],
    imagePrompt:
      'Entrance to an ancient Egyptian royal tomb in the Valley of the Kings, Luxor, desert cliffs in the background, soft morning light, photorealistic.',
    excerpt:
      'Summer mornings or winter afternoons? A practical season-by-season breakdown of when to visit Luxor without wasting a day on heat exhaustion or crowd chaos.',
    body: `<p>Luxor can be 45°C in summer and still mobbed with tour buses in winter. Here's the honest calendar for visiting the Valley of the Kings.</p><h2>October–November (best overall)</h2><p>Temperatures drop to the high twenties, the light is soft, and the big winter crowds haven't hit yet. This is when we tell friends to come.</p><h2>December–February (high season)</h2><p>Perfect weather but genuinely crowded. Expect queues at every major tomb. Go at opening (6am) or the last 90 minutes before closing.</p><h2>March–April</h2><p>Warm and still pleasant, sandstorm risk rises late March. Shoulder pricing on tours.</p><h2>May–September (shoulder/low for a reason)</h2><p>Brutally hot. If you must come in summer, only go between 6am and 9am. Carry 2L of water per person. Skip afternoon tomb visits entirely.</p><h2>The one tomb everyone asks about</h2><p>Tutankhamun's tomb is small and usually not worth the extra ticket compared to Ramses VI or Seti I. Your guide will point you to the best-preserved tombs on the day.</p>`,
    views: 678,
    likes: 42,
  },
  {
    title: 'Nile Cruise Packing List: What Locals Actually Pack',
    slug: 'nile-cruise-packing-list',
    category: 'travel-tips',
    tags: ['nile-cruise', 'packing', 'luxor', 'aswan'],
    imagePrompt:
      'A modern Nile river cruise ship sailing past green palm trees and ancient temple ruins at sunset, warm colors, travel photography style.',
    excerpt:
      "The forums overcomplicate this. Here's the actual list we give to guests before a Luxor–Aswan cruise, by someone who's done it twenty times.",
    body: `<p>Nile cruise packing lists online tend to read like an Antarctic expedition. Reality check from someone who lives here: the ship has AC, a pool, a laundry service, and sells toothbrushes. Travel lighter.</p><h2>Must-haves</h2><ul><li><strong>Closed walking shoes.</strong> Temple floors are sandy and uneven. Flip-flops will destroy your feet by day 2.</li><li><strong>A wide-brimmed hat.</strong> Seriously, not just a cap. The sun is vertical at midday.</li><li><strong>High-SPF sunscreen.</strong> Egyptian sun is deceptive; you'll burn even on a "cool" February day on the deck.</li><li><strong>Refillable water bottle.</strong> Every good cruise has filtered refill stations now.</li><li><strong>Modest cover-up.</strong> One long-sleeve shirt + one pair of light trousers. Required inside mosques and older temples.</li></ul><h2>Nice-to-haves</h2><ul><li>Binoculars — birds along the riverbanks are wild.</li><li>A small power bank for long excursion days.</li><li>US dollars in small denominations for tipping.</li></ul><h2>Don't bother</h2><p>Don't bring: a hair dryer (every cabin has one), bottled water for the trip (provided), formal wear (ships are smart-casual), or an adapter if you're from Europe (same plugs).</p>`,
    views: 512,
    likes: 38,
  },
  {
    title: 'Hurghada vs Sharm El Sheikh: Which Red Sea Resort is Right for You?',
    slug: 'hurghada-vs-sharm-el-sheikh',
    category: 'destination-guides',
    tags: ['hurghada', 'sharm-el-sheikh', 'red-sea'],
    imagePrompt:
      'Split-view travel photograph: left half a Hurghada beach with palm trees, right half a Sharm El Sheikh coral reef with divers underwater, both sides equally vibrant.',
    excerpt:
      "Two of Egypt's biggest Red Sea resorts, very different vibes. Here's how we help guests pick when they ask us point-blank.",
    body: `<p>We get this question every week. Short answer: Hurghada is better for families and day-trip access; Sharm El Sheikh is better for serious divers and luxury. Long answer below.</p><h2>Diving & snorkeling</h2><p>Sharm wins for diving — Ras Mohammed and the Straits of Tiran are legendary. Hurghada is fine for snorkeling and beginner diving but the big-name sites are further away.</p><h2>Day-trip access</h2><p>Hurghada wins. Flights and drives to Cairo and Luxor are shorter. From Sharm you have fewer options.</p><h2>Vibe</h2><p>Hurghada: more budget-friendly, bigger variety of hotels, more "resort town" feel. Sharm: polished, more luxury resorts, more European families.</p><h2>Getting there</h2><p>Both have international airports. Hurghada has more budget flights from Europe; Sharm has more charter flights.</p><h2>Our honest take</h2><p>First visit to Egypt? Hurghada. Come back for diving? Sharm. Bringing kids? Hurghada. Want a honeymoon? Either works, but Sharm has more 5★ options.</p>`,
    views: 1876,
    likes: 134,
    featured: true,
  },
  {
    title: 'Kid-Friendly Excursions in Egypt: Our 7 Picks',
    slug: 'kid-friendly-excursions-egypt',
    category: 'family-travel',
    tags: ['family', 'kids', 'hurghada', 'cairo'],
    imagePrompt:
      'Happy family with two young children on a traditional Egyptian boat, smiling, blue Red Sea water, bright sunny day, travel photography.',
    excerpt:
      'Excursions that our guides genuinely enjoy running with kids under 12 — and the ones we quietly steer families away from.',
    body: `<p>Not every Egypt excursion is kid-friendly. We've refused to take kids on a few over the years for honest safety reasons. Here are seven we actively recommend.</p><h2>1. Submarine trip (Hurghada)</h2><p>The closest thing to Finding Nemo for a five-year-old. Zero swimming required.</p><h2>2. Giftun Island snorkeling</h2><p>Shallow beach access, lifeguards, kid-size masks usually available onboard.</p><h2>3. Dolphin House</h2><p>Weather-dependent but unforgettable if dolphins show up.</p><h2>4. Luxor by flight</h2><p>The drive is hard on kids; the flight is 45 minutes each way. Take Valley of the Kings at opening, skip Karnak if they're wilting.</p><h2>5. Cairo Pyramids (late afternoon)</h2><p>Morning heat plus camel smell can tank kid morale. Go 3pm–sunset instead.</p><h2>6. Aquapark day (in-resort)</h2><p>Not an excursion technically, but on the "exhausted day" between big trips, Makadi Water World is a lifesaver.</p><h2>7. Bedouin dinner & stargazing</h2><p>The quad bikes are the hook, the stars are the memory.</p><h2>Skip with small kids</h2><p>Full-day Cairo by road (too long), Siwa Oasis (rough journey), and any all-day dive trip.</p>`,
    views: 892,
    likes: 71,
  },
  {
    title: 'Red Sea Diving for Beginners: Where to Start',
    slug: 'red-sea-diving-for-beginners',
    category: 'adventure',
    tags: ['diving', 'red-sea', 'hurghada', 'beginners'],
    imagePrompt:
      'Underwater photograph of a coral reef in the Red Sea with a school of tropical fish and a scuba diver in the background, bright turquoise water, natural lighting.',
    excerpt:
      "Don't book the wrong course. Here's how beginners actually break into Red Sea diving, from Discover Scuba to Open Water certification.",
    body: `<p>If you've never dived and you're about to hit Hurghada or Sharm, you have two sensible options. Here's the breakdown.</p><h2>Option 1: Discover Scuba Diving (DSD)</h2><p>A half-day, no-certification taster. Pool session then a shallow boat dive (usually 6–8m). Perfect if you want to see if you even like it. About €60–80.</p><h2>Option 2: Open Water Diver certification</h2><p>Three to four days, ends with a proper PADI or SSI certification good for life. You'll do five confined dives and four open-water dives. Around €300–450 including materials. Worth every euro if you plan to dive again.</p><h2>Where to do it</h2><p>Hurghada has dozens of dive centers — stick with PADI 5★ or SSI Instructor Training Centers. Read reviews; avoid the cheapest option.</p><h2>Medical check</h2><p>You'll fill out a health declaration. If you tick yes to anything (asthma, heart, recent surgery) you'll need a doctor's sign-off. There are dive doctors in Hurghada who do this in 20 minutes for about €30.</p><h2>Red flags to avoid</h2><p>Any center offering certification in two days. Any center that doesn't do a pool/shallow session first. Any instructor who takes you below 18m on an Open Water course.</p>`,
    views: 445,
    likes: 33,
  },
  {
    title: 'Why Book with a Local Operator Instead of an Online Marketplace',
    slug: 'why-book-with-a-local-operator',
    category: 'travel-tips',
    tags: ['booking', 'local-guides', 'tips'],
    imagePrompt:
      'Friendly Egyptian tour guide in smart casual clothes smiling next to a small group of tourists at an ancient temple, warm golden hour light, photojournalistic style.',
    excerpt:
      "We'll show our hand: we run a local operator. Here's the honest case for booking directly — and when the big marketplaces are actually the better call.",
    body: `<p>Full disclosure: we're a local tour operator. So take this article with the appropriate salt. That said, here's what we genuinely tell guests when they ask why not "just book on the big sites".</p><h2>Price</h2><p>Marketplaces take 20–30% commission. A direct booking with a reputable local operator is usually 15–25% cheaper for the identical tour.</p><h2>Customization</h2><p>"Can we add an extra stop?" "Can we leave at 7 instead of 6?" A marketplace booking can't do this. A direct booking with a human operator can.</p><h2>Support when things go wrong</h2><p>Flight cancelled at 2am? A marketplace will answer within 48 hours. Your local operator will pick up the phone.</p><h2>Where marketplaces win</h2><p>If you're nervous about scams, marketplaces give you a neutral payment platform and a review system. That's a real value. Use them to <em>research</em> — then cross-check operators on Google reviews and book direct once you trust the name.</p><h2>Red flags with any operator</h2><p>Cash-only deposits before you arrive. Prices much lower than the market average. No physical office. No listed WhatsApp number.</p>`,
    views: 321,
    likes: 28,
  },
  {
    title: 'Solo Traveler Safety in Egypt: What We Tell Guests Honestly',
    slug: 'solo-traveler-safety-in-egypt',
    category: 'travel-tips',
    tags: ['solo-travel', 'safety', 'women-travel'],
    imagePrompt:
      'Solo traveler with a small backpack walking through a busy Egyptian market street in Cairo, warm evening light, photojournalistic style.',
    excerpt:
      "The internet is full of scary threads about Egypt. Here's what three years of hosting solo travelers actually looks like, plus the stuff worth being careful about.",
    body: `<p>Egypt gets a bad rap on solo-travel forums. The reality is most solo visitors have an uneventful, wonderful trip. Here's the practical version of "is it safe?"</p><h2>Safety overall</h2><p>Cairo, Luxor, Aswan, Hurghada, Sharm El Sheikh, Dahab — all fine for solo travelers including solo women. Violent crime against tourists is very rare. Scams and persistent vendors are the actual day-to-day issue.</p><h2>What's actually annoying</h2><p>Persistent touts at major tourist sites. Taxi drivers who won't use the meter. Photo requests from locals at the Pyramids (usually genuine but can be overwhelming). Dress modestly outside resort areas — not religious obligation for visitors, but it cuts unwanted attention by about 80%.</p><h2>What to book ahead</h2><p>Airport pickup on your first arrival. At least the first two nights of accommodation. One guided day to orient yourself.</p><h2>Scams worth knowing</h2><p>The "my friend's shop just around the corner" routine. The "free gift" that's suddenly €20. The fake taxi at the airport. A firm "no thank you" and walking away defeats 95% of them.</p><h2>Women specifically</h2><p>Solo female travelers are common here. Dress modestly, book the first taxi via your hotel, use women-only train cars where available. Most solo-female-traveler horror stories are from unlicensed guides — stick to licensed operators.</p><h2>Emergency numbers</h2><p>Tourist police: 126. General police: 122. Save your hotel's direct number in your phone.</p>`,
    views: 734,
    likes: 61,
  },
  {
    title: 'Traveling in Egypt During Ramadan: What to Expect',
    slug: 'traveling-in-egypt-during-ramadan',
    category: 'local-insights',
    tags: ['ramadan', 'culture', 'seasonal-travel'],
    imagePrompt:
      'A Ramadan evening street in Cairo with decorative lanterns glowing, families gathering, warm atmospheric lighting, photojournalistic style.',
    excerpt:
      "Ramadan changes the rhythm of the country more than most visitors expect. Here's how it affects excursions, food, and vibes — and why it can be a magical time to visit.",
    body: `<p>Ramadan isn't just a month of fasting — it's a month where Egypt's whole social calendar inverts. If you're visiting during Ramadan, here's what actually changes.</p><h2>Day vs night</h2><p>Days are quieter. Many cafes and restaurants outside tourist areas are closed. From iftar (sunset) onward, streets come alive — lanterns, music, families eating everywhere.</p><h2>Tour schedules</h2><p>Most excursions still run normally. Your guide may be fasting but won't expect you to. Long drives sometimes stop 10 minutes before sunset so the driver can break fast.</p><h2>Food availability</h2><p>Hotels and tourist restaurants serve as usual. Street food during the day is limited. Don't eat or drink obviously on the street out of respect — a water bottle in your bag during a walking tour is fine.</p><h2>Shopping and sightseeing</h2><p>Opening hours shift. Temples and museums often open later and close earlier. Shops may close from 3pm to iftar then reopen till midnight.</p><h2>Why it's worth it</h2><p>Iftar in someone's home (or a good local restaurant) is one of the warmest experiences in Egyptian culture. Lantern-lit nights, family gatherings, cafes packed till 3am. If you're curious about the culture, Ramadan is a wonderful time to visit.</p><h2>Eid al-Fitr</h2><p>The three days right after Ramadan are a holiday. Sites are busier with local tourists; advance-book everything.</p>`,
    views: 289,
    likes: 24,
  },
  {
    title: 'Hurghada to Cairo: Should You Fly or Drive?',
    slug: 'hurghada-to-cairo-fly-or-drive',
    category: 'transportation',
    tags: ['hurghada', 'cairo', 'transport'],
    imagePrompt:
      'Split image: left side shows an EgyptAir plane at Hurghada airport runway at sunset, right side shows a modern highway cutting through desert between Hurghada and Cairo, realistic travel photography.',
    excerpt:
      `The forums say "always fly" — but that's not always the best answer. Here are the real trade-offs between the 1-hour flight and the 5-hour drive.`,
    body: `<p>The Hurghada–Cairo question comes up on every booking call. The right answer depends on how many people you are and how you value your time. Here's the honest comparison.</p><h2>Flight: 1 hour</h2><p>Three to four flights a day each way. Add 1.5 hours at the airport each end and you're at roughly 4 hours door-to-door. Prices vary wildly — book two weeks out and you'll pay around €80–120 one-way. Same-day booking can hit €200.</p><h2>Drive: 4.5–5 hours</h2><p>The road is good (by Egypt standards) and mostly highway. Private transfer with driver: €100–130 for up to 4 people. That's dramatically cheaper per person once you're more than two.</p><h2>Flight pros</h2><ul><li>Faster if you're alone or a couple.</li><li>Luxor via Cairo is effectively painless.</li><li>No motion-sickness risk.</li></ul><h2>Drive pros</h2><ul><li>Cheaper for 3+ people.</li><li>No airport queues, no 4am wake-up.</li><li>You see the desert — which is its own strange, beautiful thing.</li><li>Flexible schedule; stop when you want.</li></ul><h2>Our default recommendation</h2><p>Solo or couple, short trip: fly. Family of 4, two-way trip: drive at least one direction. Everyone with motion sickness: fly, period.</p>`,
    views: 612,
    likes: 47,
  },
];

// ---------------------------------------------------------------------------
// Image generation + upload
// ---------------------------------------------------------------------------

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getOpenAI() {
  return new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
  });
}

async function generateImageBuffer(prompt: string): Promise<Buffer> {
  const client = getOpenAI();
  const response = await client.images.generate({
    model: OPENAI_IMAGE_MODEL,
    prompt,
    size: '1536x1024',
    n: 1,
  } as any);

  const first = response.data?.[0] as any;
  if (first?.b64_json) {
    return Buffer.from(first.b64_json, 'base64');
  }
  if (first?.url) {
    const res = await fetch(first.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch generated image URL: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('OpenAI image response contained no data');
}

async function uploadToCloudinary(
  buffer: Buffer,
  publicId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url)
          return reject(new Error('Cloudinary returned no secure_url'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function estimateReadTime(body: string) {
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 200));
}

function randomPublishedAt(index: number) {
  // Stagger publish dates over the past ~120 days so they sort naturally.
  const d = new Date();
  d.setDate(d.getDate() - index * 9 - 3);
  return d;
}

async function seedOne(post: PostSeed, index: number) {
  const exists = await Blog.findOne({
    tenantId: TENANT_ID,
    slug: post.slug,
  }).lean();

  let featuredImage: string | undefined = (exists as any)?.featuredImage;

  if (!featuredImage) {
    console.log(`  → generating image for "${post.slug}"...`);
    const buffer = await generateImageBuffer(post.imagePrompt);
    featuredImage = await uploadToCloudinary(buffer, post.slug);
    console.log(`  ✓ uploaded to ${featuredImage}`);
  } else {
    console.log(`  = reusing existing image for "${post.slug}"`);
  }

  const doc = {
    tenantId: TENANT_ID,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.body,
    featuredImage,
    category: post.category,
    tags: post.tags,
    author: AUTHOR,
    authorBio: AUTHOR_BIO,
    authorAvatar: AUTHOR_AVATAR,
    readTime: estimateReadTime(post.body),
    status: 'published' as const,
    publishedAt: (exists as any)?.publishedAt || randomPublishedAt(index),
    featured: post.featured || false,
    views: post.views ?? 0,
    likes: post.likes ?? 0,
  };

  await Blog.findOneAndUpdate(
    { tenantId: TENANT_ID, slug: post.slug },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function main() {
  requireEnv('MONGODB_URI');
  requireEnv('OPENAI_API_KEY');
  configureCloudinary();

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(`Connected to MongoDB. Seeding ${POSTS.length} EEO blog posts...`);

  for (let i = 0; i < POSTS.length; i += 1) {
    const post = POSTS[i];
    console.log(`\n[${i + 1}/${POSTS.length}] ${post.title}`);
    try {
      await seedOne(post, i);
      console.log(`  ✓ saved "${post.slug}"`);
    } catch (err) {
      console.error(`  ✗ failed on "${post.slug}":`, err);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
