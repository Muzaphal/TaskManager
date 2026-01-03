import {  createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://cazccajcfomjymmmldgf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhemNjYWpjZm9tanltbW1sZGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTExODUsImV4cCI6MjA4MjM4NzE4NX0.F7V9nFvsbXQFV7Jrl4yUbkYw60N06iCG5uS2yTE6YXQ',

    {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);