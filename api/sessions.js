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
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          *,
          users!created_by (
            name
          )
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      return res.status(200).json(
        sessions.map(session => ({
          id: session.id,
          title: session.title,
          date: session.date,
          time: session.time,
          location: session.location,
          species: session.species,
          maxParticipants: session.max_participants,
          createdBy: session.users?.name
        }))
      );

    } catch (error) {
      console.error('Get sessions error:', error);
      return res.status(500).json([]);
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
