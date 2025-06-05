// csv-import.js - Run this script to import your existing CSV data
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

// Replace with your Supabase credentials
const SUPABASE_URL = 'your-supabase
