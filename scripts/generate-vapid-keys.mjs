#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push notifications
 * Run: node scripts/generate-vapid-keys.mjs
 * 
 * Add the output to your .env file
 */

import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@hexasteel.sa`);
console.log('\nNote: The public key is also needed client-side (served via /api/push/vapid-key)');
