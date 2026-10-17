// Run from server/: node scripts/update-restaurant-images.mjs [--apply] [--local]
// --local serves the checked-in public assets instead of uploading to Cloudinary.
// Only changes the image field of the two explicitly named restaurants.
import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { accessSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const targets = [
  { name: 'Cupstory', slug: 'cupstory', file: 'cupstory-interior.png' },
  { name: 'Madgrill', slug: 'madgrill', file: 'madgrill-interior.png' },
];
const apply = process.argv.includes('--apply');
const local = process.argv.includes('--local');

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (apply && !local && !process.env.CLOUDINARY_URL) throw new Error('CLOUDINARY_URL is required');
  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000,
  });
  const restaurants = mongoose.connection.collection('restaurants');
  // Validate both matches before uploading or updating anything.
  const records = [];
  for (const target of targets) {
    accessSync(new URL(`../../client/public/images/restaurants/${target.file}`, import.meta.url));
    const matches = await restaurants.find({ name: target.name, slug: target.slug }).toArray();
    if (matches.length !== 1) throw new Error(`Expected one record for ${target.name}; found ${matches.length}`);
    records.push({ target, record: matches[0] });
  }
  if (!apply) {
    console.log(JSON.stringify(records.map(({ target, record }) => ({
      name: target.name, slug: target.slug, currentImage: record.image, replacement: target.file,
    })), null, 2));
    console.log('Preview only. Add --apply to upload and save the images.');
  } else {
    const evidenceDirectory = new URL('../../docs/evidence/restaurant-images/', import.meta.url);
    mkdirSync(evidenceDirectory, { recursive: true });
    const auditPath = new URL(`${new Date().toISOString().replace(/[:.]/g, '-')}.json`, evidenceDirectory);
    const audit = records.map(({ target, record }) => ({
      name: target.name, slug: target.slug, id: record._id.toString(), previousImage: record.image,
    }));
    writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
    for (const [index, { target, record }] of records.entries()) {
      let image = `/images/restaurants/${target.file}`;
      if (!local) {
        const uploaded = await cloudinary.uploader.upload(
          fileURLToPath(new URL(`../../client/public/images/restaurants/${target.file}`, import.meta.url)),
          { folder: 'QuickDine/restaurants', public_id: target.slug, overwrite: true, resource_type: 'image' },
        );
        image = cloudinary.url(uploaded.public_id, {
          secure: true, version: uploaded.version, transformation: [{ width: 1400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
        });
        const response = await fetch(image);
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
          throw new Error(`Uploaded image is not accessible for ${target.name}`);
        }
        await response.arrayBuffer();
      }
      const result = await restaurants.updateOne(
        { _id: record._id, image: record.image }, { $set: { image } },
      );
      if (result.matchedCount !== 1) throw new Error(`Record changed during update: ${target.name}`);
      const saved = await restaurants.findOne({ _id: record._id });
      if (saved.image !== image) throw new Error(`Image verification failed: ${target.name}`);
      audit[index].image = image;
      audit[index].verifiedAt = new Date().toISOString();
      writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
      console.log(`${target.name}: saved and verified ${image}`);
    }
  }
} catch (error) {
  // Do not log connection strings or provider configuration.
  console.error(`Restaurant image update failed (${error.name}${error.http_code ? `, HTTP ${error.http_code}` : ''}).`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
