'use server';

import { validateLemburPhoto } from '@/ai/flows/validate-lembur-photo';

export async function runPhotoValidation(photoDataUri: string) {
  if (!photoDataUri) {
    throw new Error('Photo data URI is required for validation.');
  }

  try {
    const result = await validateLemburPhoto({ photoDataUri });
    return result;
  } catch (error) {
    console.error('Error during AI photo validation:', error);
    // It's better to return a structured error than to throw
    return { error: 'Failed to validate photo with AI.' };
  }
}
