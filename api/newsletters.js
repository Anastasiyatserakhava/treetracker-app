import { supabase, corsHeaders } from '../lib/supabase.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'GET') {
    try {
      const { data: newsletters, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return res.status(200).json(
        newsletters.map(newsletter => ({
          id: newsletter.id,
          title: newsletter.title,
          content: newsletter.content,
          author: newsletter.author,
          date: newsletter.date
        }))
      );

    } catch (error) {
      console.error('Get newsletters error:', error);
      return res.status(500).json([]);
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
